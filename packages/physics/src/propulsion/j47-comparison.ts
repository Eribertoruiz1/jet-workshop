/**
 * Comparison of the anchored model with the runs of NACA RM E9G09, table I.
 *
 * Structure: an adaptation of ASME V&V 20, as docs/PROCESS.md rule 2 states it.
 * Comparison error E = S - D, model minus measurement. Validation uncertainty
 * u_val = sqrt(u_D^2 + u_num^2 + u_input^2). It is not the standard itself, and
 * it departs from the project rule in one point: this model iterates, so u_num
 * is estimated and not taken as zero.
 *
 * Every threshold and uncertainty below was fixed before the model was run at
 * any test condition: studies/002-engine-cycle/PLAN.md, section 6, and
 * docs/cp/007.md, "Decisiones tomadas al leer los informes, antes de calcular".
 */

import { anchorEngine, j47AnchorState, j47SpeedFraction, type AnchorState, type AnchoredEngine } from "./j47.ts";
import { j47RunToSI, type J47Run, type J47RunSI } from "./j47-data.ts";
import { buildJ47Regions, isHighSpeed, regionId, regionOfRun, type J47Region } from "./j47-regions.ts";
import { solveOperatingPoint } from "./offdesign.ts";
import { rankineToKelvin } from "./units.ts";

/** The run the model is anchored on. Its points are not scored. */
export const ANCHOR_RUN = 1;

/** The three scored quantities. */
export const QUANTITIES = ["netThrust", "fuelFlow", "airflow"] as const;
export type Quantity = (typeof QUANTITIES)[number];
export type PerQuantity<T> = Readonly<Record<Quantity, T>>;

/** A point is a hit when |E| is within the larger of u_val and this fraction of the measured value. */
export const HIT_FRACTION: PerQuantity<number> = { netThrust: 0.05, fuelFlow: 0.05, airflow: 0.03 };
/** A region needs at least this many scored points to count as compared. */
export const MIN_SCORED_POINTS = 3;
/** And a median u_val no larger than this fraction of the measured value, in every quantity. */
export const MAX_MEDIAN_UVAL_FRACTION = 0.1;
/** And at least this fraction of its points hitting in all three quantities to count as a hit. */
export const MIN_HIT_FRACTION = 0.75;

/** Relative uncertainty of each measured quantity, u_D. Sources in docs/cp/007.md. */
export const MEASUREMENT_UNCERTAINTY = {
  airflow: 0.015,
  jetThrust: 0.015,
  fuelFlow: 0.02,
} as const;

/** Uncertainty of each anchor value, for u_input: relative, or absolute in kelvin for temperatures. */
const ANCHOR_UNCERTAINTY: readonly { readonly key: keyof AnchorState; readonly relative?: number; readonly absolute?: number }[] = [
  { key: "airflow_kg_s", relative: MEASUREMENT_UNCERTAINTY.airflow },
  { key: "fuelFlow_kg_s", relative: MEASUREMENT_UNCERTAINTY.fuelFlow },
  { key: "jetThrust_N", relative: MEASUREMENT_UNCERTAINTY.jetThrust },
  { key: "turbineOutletTemperature_K", absolute: rankineToKelvin(10) },
  { key: "compressorOutletTemperature_K", absolute: rankineToKelvin(2) },
  { key: "inletTotalTemperature_K", absolute: rankineToKelvin(1) },
  { key: "ambientPressure_Pa", relative: 0.005 },
  { key: "inletTotalPressure_Pa", relative: 0.005 },
  { key: "compressorOutletPressure_Pa", relative: 0.005 },
  { key: "turbineInletPressure_Pa", relative: 0.005 },
  { key: "turbineOutletPressure_Pa", relative: 0.005 },
  { key: "nozzleInletPressure_Pa", relative: 0.005 },
];

/** Iteration tolerances whose difference estimates u_num. */
const LOOSE_TOLERANCE = 1e-6;
const TIGHT_TOLERANCE = 1e-13;

/** Model output at one run, or null where the model has no running point. */
function predict(
  engine: AnchoredEngine,
  run: J47RunSI,
  tolerance: number,
): (PerQuantity<number> & { readonly exhaustTemperature_K: number; readonly jetThrust_N: number }) | null {
  const solved = solveOperatingPoint(
    engine.hardware,
    {
      ambientPressure_Pa: run.ambientPressure_Pa,
      inletTotalPressure_Pa: run.inletTotalPressure_Pa,
      inletTotalTemperature_K: run.inletTotalTemperature_K,
      flightSpeed_m_s: run.flightSpeed_m_s,
      speedFraction: j47SpeedFraction(run.speed_rpm),
    },
    tolerance,
  );
  if (!solved.ok) return null;
  return {
    netThrust: solved.point.netThrust_N,
    fuelFlow: solved.point.fuelFlow_kg_s,
    airflow: solved.point.airflow_kg_s,
    exhaustTemperature_K: solved.point.turbineOutletTemperature_K,
    jetThrust_N: solved.point.grossThrust_N,
  };
}

export interface ComparedPoint {
  readonly run: number;
  readonly regionId: string | null;
  readonly speed_rpm: number;
  /** Scored: above the high-speed fraction, in a region, and not the anchor */
  readonly scored: boolean;
  /** D, in SI: N, kg/s, kg/s */
  readonly measured: PerQuantity<number>;
  /** S, or null where the model has no running point */
  readonly model: PerQuantity<number> | null;
  /**
   * Exhaust-gas total temperature, K: measured at the nozzle and from the model at its turbine outlet.
   * Not scored. It is what the turbine limit of the J47 was set on.
   */
  readonly measuredExhaustTemperature_K: number;
  readonly modelExhaustTemperature_K: number | null;
  /** Jet thrust over net thrust in the model: what one percent of the nozzle thrust coefficient moves the net thrust, in percent */
  readonly thrustCoefficientSensitivity: number | null;
  /** E = S - D */
  readonly error: PerQuantity<number> | null;
  readonly uD: PerQuantity<number>;
  readonly uInput: PerQuantity<number> | null;
  readonly uNum: PerQuantity<number> | null;
  readonly uVal: PerQuantity<number> | null;
  /** |E| <= max(u_val, hit fraction of D) */
  readonly hit: PerQuantity<boolean> | null;
  /** |E| <= hit fraction of D, without u_val */
  readonly withinFraction: PerQuantity<boolean> | null;
}

export interface RegionResult {
  readonly region: J47Region;
  /** Scored points of the region */
  readonly points: readonly ComparedPoint[];
  /** Median of u_val over D, per quantity. null without scored points. */
  readonly medianUvalFraction: PerQuantity<number> | null;
  /** Points that hit in all three quantities */
  readonly hits: number;
  /** Points within the plain fraction, per quantity */
  readonly withinFraction: PerQuantity<number>;
  /** At least 3 scored points and a median u_val within 10 percent in every quantity */
  readonly compared: boolean;
  /** Compared, and at least three quarters of its points hit in all three quantities */
  readonly hit: boolean;
}

export interface J47Comparison {
  readonly engine: AnchoredEngine;
  /** Every run of the table, in table order */
  readonly points: readonly ComparedPoint[];
  readonly regions: readonly RegionResult[];
  /** High-speed runs that belong to no region: listed, not scored */
  readonly unassignedHighSpeedRuns: readonly number[];
}

function mapQuantities<T>(make: (quantity: Quantity) => T): PerQuantity<T> {
  return { netThrust: make("netThrust"), fuelFlow: make("fuelFlow"), airflow: make("airflow") };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? (sorted[mid] ?? Number.NaN) : ((sorted[mid - 1] ?? Number.NaN) + (sorted[mid] ?? Number.NaN)) / 2;
}

/** Runs the anchored model at every run of the table and scores it. */
export function compareJ47(runs: readonly J47Run[], anchor: AnchorState = j47AnchorState()): J47Comparison {
  const engine = anchorEngine(anchor);
  // One engine per perturbed anchor value, up and down, for u_input.
  const perturbed = ANCHOR_UNCERTAINTY.map(({ key, relative, absolute }) => {
    const delta = absolute ?? anchor[key] * (relative ?? 0);
    return {
      up: anchorEngine({ ...anchor, [key]: anchor[key] + delta }),
      down: anchorEngine({ ...anchor, [key]: anchor[key] - delta }),
    };
  });

  const points: ComparedPoint[] = runs.map((run) => {
    const si = j47RunToSI(run);
    const region = regionOfRun(run);
    const scored = region !== null && isHighSpeed(run.engineSpeed_rpm) && run.run !== ANCHOR_RUN;
    const measured: PerQuantity<number> = { netThrust: si.netThrust_N, fuelFlow: si.fuelFlow_kg_s, airflow: si.airflow_kg_s };
    // Net thrust is jet thrust minus air flow times flight speed, and carries both uncertainties.
    const ramDrag = si.airflow_kg_s * si.flightSpeed_m_s;
    const uD: PerQuantity<number> = {
      netThrust: Math.hypot(MEASUREMENT_UNCERTAINTY.jetThrust * si.jetThrust_N, MEASUREMENT_UNCERTAINTY.airflow * ramDrag),
      fuelFlow: MEASUREMENT_UNCERTAINTY.fuelFlow * si.fuelFlow_kg_s,
      airflow: MEASUREMENT_UNCERTAINTY.airflow * si.airflow_kg_s,
    };
    const base = {
      run: run.run,
      regionId: region ? regionId(region.altitude_ft, region.nominalMach) : null,
      measuredExhaustTemperature_K: si.exhaustGasTotalTemperature_K,
    };
    const model = predict(engine, si, TIGHT_TOLERANCE);
    const loose = predict(engine, si, LOOSE_TOLERANCE);
    if (model === null || loose === null) {
      return {
        ...base,
        speed_rpm: run.engineSpeed_rpm,
        scored,
        measured,
        model: null,
        modelExhaustTemperature_K: null,
        thrustCoefficientSensitivity: null,
        error: null,
        uD,
        uInput: null,
        uNum: null,
        uVal: null,
        hit: null,
        withinFraction: null,
      };
    }
    const error = mapQuantities((q) => model[q] - measured[q]);
    const uNum = mapQuantities((q) => Math.abs(loose[q] - model[q]));
    const uInput = mapQuantities((q) => {
      let sum = 0;
      for (const pair of perturbed) {
        const up = predict(pair.up, si, TIGHT_TOLERANCE);
        const down = predict(pair.down, si, TIGHT_TOLERANCE);
        // Where a perturbed engine has no running point, the one-sided change stands in.
        const half = up && down ? (up[q] - down[q]) / 2 : up ? up[q] - model[q] : down ? model[q] - down[q] : 0;
        sum += half * half;
      }
      return Math.sqrt(sum);
    });
    const uVal = mapQuantities((q) => Math.hypot(uD[q], uNum[q], uInput[q]));
    return {
      ...base,
      speed_rpm: run.engineSpeed_rpm,
      scored,
      measured,
      model: { netThrust: model.netThrust, fuelFlow: model.fuelFlow, airflow: model.airflow },
      modelExhaustTemperature_K: model.exhaustTemperature_K,
      thrustCoefficientSensitivity: model.jetThrust_N / model.netThrust,
      error,
      uD,
      uInput,
      uNum,
      uVal,
      hit: mapQuantities((q) => Math.abs(error[q]) <= Math.max(uVal[q], HIT_FRACTION[q] * Math.abs(measured[q]))),
      withinFraction: mapQuantities((q) => Math.abs(error[q]) <= HIT_FRACTION[q] * Math.abs(measured[q])),
    };
  });

  const regions: RegionResult[] = buildJ47Regions(runs).map((region) => {
    const scoredPoints = points.filter((point) => point.scored && point.regionId === region.id);
    const withModel = scoredPoints.filter((point) => point.uVal !== null);
    const medianUvalFraction =
      withModel.length === 0
        ? null
        : mapQuantities((q) => median(withModel.map((point) => (point.uVal?.[q] ?? Number.NaN) / Math.abs(point.measured[q]))));
    // A point without a running point of the model is a miss.
    const hits = scoredPoints.filter((point) => point.hit !== null && QUANTITIES.every((q) => point.hit?.[q])).length;
    const compared =
      scoredPoints.length >= MIN_SCORED_POINTS &&
      medianUvalFraction !== null &&
      QUANTITIES.every((q) => medianUvalFraction[q] <= MAX_MEDIAN_UVAL_FRACTION);
    return {
      region,
      points: scoredPoints,
      medianUvalFraction,
      hits,
      withinFraction: mapQuantities((q) => scoredPoints.filter((point) => point.withinFraction?.[q]).length),
      compared,
      hit: compared && hits >= MIN_HIT_FRACTION * scoredPoints.length,
    };
  });

  return {
    engine,
    points,
    regions,
    unassignedHighSpeedRuns: runs
      .filter((run) => isHighSpeed(run.engineSpeed_rpm) && regionOfRun(run) === null)
      .map((run) => run.run),
  };
}

/** One scored run compared at the measured exhaust-gas temperature instead of at the measured speed. */
export interface TemperatureMatchedPoint {
  readonly run: number;
  readonly regionId: string | null;
  readonly speed_rpm: number;
  /** Speed at which the model has the measured exhaust-gas total temperature, rpm. null if it never does. */
  readonly modelSpeed_rpm: number | null;
  readonly measured: PerQuantity<number>;
  readonly model: PerQuantity<number> | null;
  readonly error: PerQuantity<number> | null;
  readonly withinFraction: PerQuantity<boolean> | null;
}

/**
 * The fallback comparison of PLAN.md, risk 2: each scored run at the speed at
 * which the model has the measured exhaust-gas total temperature. It takes the
 * speed law out of the comparison; what is left is the rest of the model. It is
 * a diagnosis, not a second chance: the engine is flown by speed.
 */
export function compareJ47AtExhaustTemperature(runs: readonly J47Run[], engine: AnchoredEngine): TemperatureMatchedPoint[] {
  const points: TemperatureMatchedPoint[] = [];
  for (const run of runs) {
    const region = regionOfRun(run);
    if (region === null || !isHighSpeed(run.engineSpeed_rpm) || run.run === ANCHOR_RUN) continue;
    const si = j47RunToSI(run);
    const measured: PerQuantity<number> = { netThrust: si.netThrust_N, fuelFlow: si.fuelFlow_kg_s, airflow: si.airflow_kg_s };
    const at = (speedFraction: number) =>
      solveOperatingPoint(engine.hardware, {
        ambientPressure_Pa: si.ambientPressure_Pa,
        inletTotalPressure_Pa: si.inletTotalPressure_Pa,
        inletTotalTemperature_K: si.inletTotalTemperature_K,
        flightSpeed_m_s: si.flightSpeed_m_s,
        speedFraction,
      });
    // Exhaust-gas temperature rises with speed in this range: bisection on the speed fraction.
    let low = 0.7;
    let high = 1.2;
    const lowPoint = at(low);
    const highPoint = at(high);
    const target = si.exhaustGasTotalTemperature_K;
    const base = { run: run.run, regionId: regionId(region.altitude_ft, region.nominalMach), speed_rpm: run.engineSpeed_rpm, measured };
    if (
      !lowPoint.ok ||
      !highPoint.ok ||
      !(lowPoint.point.turbineOutletTemperature_K <= target && highPoint.point.turbineOutletTemperature_K >= target)
    ) {
      points.push({ ...base, modelSpeed_rpm: null, model: null, error: null, withinFraction: null });
      continue;
    }
    for (let i = 0; i < 60; i++) {
      const mid = 0.5 * (low + high);
      const solved = at(mid);
      if (solved.ok && solved.point.turbineOutletTemperature_K < target) low = mid;
      else high = mid;
    }
    const solved = at(0.5 * (low + high));
    if (!solved.ok) {
      points.push({ ...base, modelSpeed_rpm: null, model: null, error: null, withinFraction: null });
      continue;
    }
    const model: PerQuantity<number> = {
      netThrust: solved.point.netThrust_N,
      fuelFlow: solved.point.fuelFlow_kg_s,
      airflow: solved.point.airflow_kg_s,
    };
    const error = mapQuantities((q) => model[q] - measured[q]);
    points.push({
      ...base,
      modelSpeed_rpm: (0.5 * (low + high)) / j47SpeedFraction(1),
      model,
      error,
      withinFraction: mapQuantities((q) => Math.abs(error[q]) <= HIT_FRACTION[q] * Math.abs(measured[q])),
    });
  }
  return points;
}
