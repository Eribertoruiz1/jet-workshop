/**
 * From the four design decisions to an engine (docs/briefs/007-engine-workshop.md).
 *
 * The level of technology is not a decision of the player: it is that of the
 * J47 of 1949, computed from its anchor run (j47.ts) and applied to any design.
 * Away from the J47 that is an extrapolation, and the engine says so in the
 * `evidence` of every output.
 *
 * `designEngine` never throws: a design that cannot exist comes back as a
 * rejection with its reason.
 */

import type {
  DesignEngine,
  DesignRejection,
  DesignedEngine,
  EngineDesign,
  EngineDesignRanges,
  EngineDesignResult,
  Evidence,
  FlightCondition,
} from "./contract.ts";
import { AFTERBURNER_V0, createEngineStepper } from "./engine.ts";
import {
  J47_LOWEST_TESTED_SPEED_RPM,
  J47_RATED_SPEED_RPM,
  J47_SIZE,
  J47_TURBINE_OUTLET_LIMIT_F,
  SEA_LEVEL_STATIC,
  j47AtSeaLevelStatic,
  j47Engine,
} from "./j47.ts";
import { J47_COMPARED_REGIONS, type ComparedRegion } from "./j47-compared-regions.generated.ts";
import { isSpeedTested, regionOfFlight } from "./j47-regions.ts";
import { DAMAGE_RULE_V0, turbineLimitStatus, type TurbineTemperatureLimit } from "./limits.ts";
import { buildHardware, solveOperatingPoint, type Technology } from "./offdesign.ts";
import { fahrenheitToKelvin, inchesToMetres, poundsToKilograms } from "./units.ts";

/**
 * Allowed range of each numeric decision. JUDGEMENT of lane E, no source: they
 * are wider on purpose than what an engine of the J47's time stood, so that the
 * player can cross the limits and see them.
 * - Air flow: a quarter to about three times the J47's.
 * - Pressure ratio: from barely a compressor to about three times the J47's 5.1.
 * - Turbine inlet temperature: up to 1800 K, where the gas model, which has no
 *   dissociation, still holds; the J47's turbine limit is far below.
 * An empty unit means the quantity is dimensionless.
 */
export const ENGINE_DESIGN_RANGES: EngineDesignRanges = {
  designAirflow_kg_s: { min: 10, max: 120, unit: "kg/s" },
  pressureRatio: { min: 2, max: 16, unit: "" },
  turbineInletTemperature_K: { min: 900, max: 1800, unit: "K" },
};

/** A design is "near the J47" when each of its three figures is within this fraction of the J47's. PM's judgement. */
export const NEAR_J47_FRACTION = 0.05;

/** What every designed engine takes from the J47: computed once from the anchor run. */
export interface DesignBasis {
  readonly technology: Technology;
  /** Pressure losses at the design point, as fractions: those of the anchored J47 at sea-level static */
  readonly burnerPressureLoss: number;
  readonly tailpipePressureLoss: number;
  readonly turbineLimit: TurbineTemperatureLimit;
  /** Idle speed as a fraction of design speed: lowest speed of the J47 tests over its rated speed */
  readonly idleSpeedFraction: number;
  /** The J47 as a design: the anchored model at sea-level static and rated speed. Computed. */
  readonly j47Design: EngineDesign;
  /** Compressor-face diameter, length and mass of the J47, SI. Report text. */
  readonly j47Diameter_m: number;
  readonly j47Length_m: number;
  readonly j47Mass_kg: number;
}

let basis: DesignBasis | null = null;

/** The design basis from the J47 anchor. */
export function designBasis(): DesignBasis {
  if (basis !== null) return basis;
  const j47 = j47Engine();
  const seaLevel = j47AtSeaLevelStatic(j47);
  // The limit was set at the turbine outlet in those engines. It is carried to the turbine inlet with
  // the temperature ratio of the turbine at the anchor, so this figure is computed, not measured.
  const turbineTemperatureRatio = j47.turbineInletTemperature_K / j47.point.turbineOutletTemperature_K;
  basis = {
    technology: j47.hardware.technology,
    burnerPressureLoss: 1 - seaLevel.turbineInletPressure_Pa / seaLevel.compressorOutletPressure_Pa,
    tailpipePressureLoss: 1 - seaLevel.nozzleInletPressure_Pa / seaLevel.turbineOutletPressure_Pa,
    turbineLimit: {
      limit_K: fahrenheitToKelvin(J47_TURBINE_OUTLET_LIMIT_F) * turbineTemperatureRatio,
      ...DAMAGE_RULE_V0,
    },
    idleSpeedFraction: J47_LOWEST_TESTED_SPEED_RPM / J47_RATED_SPEED_RPM,
    j47Design: {
      designAirflow_kg_s: seaLevel.airflow_kg_s,
      pressureRatio: seaLevel.pressureRatio,
      turbineInletTemperature_K: seaLevel.turbineInletTemperature_K,
      afterburner: false,
    },
    j47Diameter_m: inchesToMetres(J47_SIZE.compressorTipDiameter_in),
    j47Length_m: inchesToMetres(J47_SIZE.length_in),
    j47Mass_kg: poundsToKilograms(J47_SIZE.weight_lb),
  };
  return basis;
}

/** Whether a design is near the J47: no afterburner and each figure within 5 percent of the J47's. */
export function isNearJ47(design: EngineDesign, j47: EngineDesign): boolean {
  const near = (value: number, reference: number): boolean => Math.abs(value / reference - 1) <= NEAR_J47_FRACTION;
  return (
    design.afterburner === false &&
    near(design.designAirflow_kg_s, j47.designAirflow_kg_s) &&
    near(design.pressureRatio, j47.pressureRatio) &&
    near(design.turbineInletTemperature_K, j47.turbineInletTemperature_K)
  );
}

/**
 * Evidence of an output (docs/cp/007.md, "Regla de región"). "validated" needs
 * all of: a design near the J47, the afterburner out, a flight condition inside
 * a test region that was compared with a hit, and a shaft speed that region tested.
 */
export function evidenceRule(
  regions: readonly ComparedRegion[],
  nearJ47: boolean,
): (condition: FlightCondition, speedFractionOfFull: number, afterburnerLit: boolean) => Evidence {
  return (condition, speedFractionOfFull, afterburnerLit) => {
    if (!nearJ47 || afterburnerLit) return "estimated";
    const region = regionOfFlight(regions, {
      mach: condition.mach,
      ambientPressure_Pa: condition.ambient.pressure_Pa,
      ambientTemperature_K: condition.ambient.temperature_K,
    });
    if (region === null || !region.hit) return "estimated";
    return isSpeedTested(region, speedFractionOfFull) ? "validated" : "estimated";
  };
}

/** Identifier of a design: the four decisions written out in full, never rounded. */
export function engineId(design: EngineDesign): string {
  const tail = design.afterburner ? "ab" : "dry";
  return `tj-${design.designAirflow_kg_s}-${design.pressureRatio}-${design.turbineInletTemperature_K}-${tail}`;
}

function rejection(
  reasonId: DesignRejection["reasonId"],
  decision: DesignRejection["decision"],
  limit: DesignRejection["limit"] = null,
): DesignRejection {
  return { reasonId, decision, limit };
}

const NUMERIC_DECISIONS = ["designAirflow_kg_s", "pressureRatio", "turbineInletTemperature_K"] as const;

/**
 * Designs an engine on a given basis and within given ranges. `designEngine` is
 * this function on the J47 basis and the published ranges; the tests also call
 * it with other ones.
 */
export function designEngineOn(
  design: EngineDesign,
  getBasis: () => DesignBasis,
  ranges: EngineDesignRanges,
  regions: readonly ComparedRegion[],
): EngineDesignResult {
  try {
    const outOfRange: DesignRejection[] = [];
    for (const decision of NUMERIC_DECISIONS) {
      const value: unknown = design?.[decision];
      const range = ranges[decision];
      if (typeof value !== "number" || !Number.isFinite(value) || value < range.min || value > range.max) {
        outOfRange.push(rejection("decision-out-of-range", decision));
      }
    }
    if (typeof design?.afterburner !== "boolean") outOfRange.push(rejection("decision-out-of-range", "afterburner"));
    const [first, ...rest] = outOfRange;
    if (first !== undefined) return { ok: false, rejections: [first, ...rest] };

    const b = getBasis();
    const built = buildHardware(b.technology, {
      ambientPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
      inletTotalPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
      inletTotalTemperature_K: SEA_LEVEL_STATIC.temperature_K,
      airflow_kg_s: design.designAirflow_kg_s,
      pressureRatio: design.pressureRatio,
      turbineInletTemperature_K: design.turbineInletTemperature_K,
      burnerPressureLoss: b.burnerPressureLoss,
      tailpipePressureLoss: b.tailpipePressureLoss,
    });
    // A hotter turbine inlet is what gives the turbine more work to take: the decision to change first.
    if (!built.ok) return { ok: false, rejections: [rejection(built.reason, "turbineInletTemperature_K")] };

    // "Not even standing still": at idle, sea-level static, the engine has to run inside its limits.
    const idle = solveOperatingPoint(built.hardware, {
      ambientPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
      inletTotalPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
      inletTotalTemperature_K: SEA_LEVEL_STATIC.temperature_K,
      flightSpeed_m_s: 0,
      speedFraction: b.idleSpeedFraction,
    });
    if (!idle.ok) return { ok: false, rejections: [rejection("turbine-cannot-drive-compressor", null)] };
    const idleLimit = turbineLimitStatus(idle.point.turbineInletTemperature_K, b.turbineLimit);
    if (idleLimit.fraction > 1) {
      return { ok: false, rejections: [rejection("limit-exceeded-at-idle", "turbineInletTemperature_K", idleLimit)] };
    }

    const frozen: EngineDesign = {
      designAirflow_kg_s: design.designAirflow_kg_s,
      pressureRatio: design.pressureRatio,
      turbineInletTemperature_K: design.turbineInletTemperature_K,
      afterburner: design.afterburner,
    };
    const stepper = createEngineStepper({
      hardware: built.hardware,
      idleSpeedFraction: b.idleSpeedFraction,
      fullSpeedFraction: 1,
      turbineLimit: b.turbineLimit,
      afterburner: design.afterburner ? AFTERBURNER_V0 : null,
      evidence: evidenceRule(regions, isNearJ47(frozen, b.j47Design)),
    });
    // Size and mass: geometric similarity with the J47. ESTIMATED for every design: the diameter goes
    // with the square root of the air flow, the length with the diameter and the mass with its cube.
    // The afterburner adds neither length nor mass in version 0. Sources arrive with gate 3.
    const scale = Math.sqrt(design.designAirflow_kg_s / b.j47Design.designAirflow_kg_s);
    const engine: DesignedEngine = {
      id: engineId(frozen),
      design: frozen,
      mass_kg: b.j47Mass_kg * scale ** 3,
      massEvidence: "estimated",
      diameter_m: b.j47Diameter_m * scale,
      length_m: b.j47Length_m * scale,
      sizeEvidence: "estimated",
      initialState: stepper.initialState,
      step: stepper.step,
    };
    return { ok: true, engine };
  } catch {
    // Nothing reaches the caller as an exception: whatever the gas model refused is a design it cannot compute.
    return { ok: false, rejections: [rejection("decision-out-of-range", null)] };
  }
}

/** Designs an engine from the four decisions, with the technology of the J47. Pure, and it never throws. */
export const designEngine: DesignEngine = (design) =>
  designEngineOn(design, designBasis, ENGINE_DESIGN_RANGES, J47_COMPARED_REGIONS);
