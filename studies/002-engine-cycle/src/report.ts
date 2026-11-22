/**
 * Tables and figures of study 002, as text. Every number in the study comes
 * out of these functions; none is typed into the template.
 */

import {
  ANCHOR_RUN,
  HIT_FRACTION,
  MAX_MEDIAN_UVAL_FRACTION,
  MEASUREMENT_UNCERTAINTY,
  MIN_HIT_FRACTION,
  MIN_SCORED_POINTS,
  QUANTITIES,
  type ComparedPoint,
  type J47Comparison,
  type Quantity,
  type TemperatureMatchedPoint,
} from "../../../packages/physics/src/propulsion/j47-comparison.ts";
import type { DesignBasis } from "../../../packages/physics/src/propulsion/design.ts";
import { DAMAGE_RULE_V0 } from "../../../packages/physics/src/propulsion/limits.ts";
import {
  HIGH_SPEED_FRACTION,
  J47_TESTED_CONDITIONS,
  REGION_TEMPERATURE_TOLERANCE,
  type J47Region,
} from "../../../packages/physics/src/propulsion/j47-regions.ts";
import type { J47Run } from "../../../packages/physics/src/propulsion/j47-data.ts";
import {
  J47_ANCHOR_REPORTED,
  J47_ANCHOR_REPORT_UNITS,
  J47_FUEL,
  J47_NOZZLE,
  J47_RATED_SPEED_RPM,
  J47_RATING,
  J47_REPORT_TEXT,
  J47_TURBINE_OUTLET_LIMIT_F,
  j47NozzleHotArea_m2,
  type AnchoredEngine,
} from "../../../packages/physics/src/propulsion/j47.ts";
import type { OperatingPoint } from "../../../packages/physics/src/propulsion/offdesign.ts";
import { standardAtmosphere } from "./isa.ts";

const N_PER_LBF = 4.4482216152605;
const KG_PER_LB = 0.45359237;
const K_PER_R = 5 / 9;

export const fmt = (value: number, decimals: number): string => value.toFixed(decimals);
const signed = (value: number, decimals: number): string => (value >= 0 ? "+" : "") + value.toFixed(decimals);
const percent = (fraction: number, decimals = 1): string => signed(100 * fraction, decimals);

const QUANTITY_NAME: Record<Quantity, string> = { netThrust: "Empuje neto", fuelFlow: "Gasto de combustible", airflow: "Gasto de aire" };

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1 ? (sorted[mid] ?? Number.NaN) : ((sorted[mid - 1] ?? Number.NaN) + (sorted[mid] ?? Number.NaN)) / 2;
}

function table(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const line = (cells: readonly string[]): string => `| ${cells.join(" | ")} |`;
  return [line(header), line(header.map(() => "---")), ...rows.map(line)].join("\n");
}

/** Rows of the anchor table: the measured values, then the ones from report text. */
function anchorRows(): { readonly measured: string[][]; readonly text: string[][] } {
  const a = J47_ANCHOR_REPORT_UNITS;
  return {
    measured: [
      ["Presión estática del túnel", String(a.tunnelStaticPressure_psf), "lb/ft²", "RM E9G09, tabla I"],
      ["Presión total a la entrada", String(a.engineInletTotalPressure_psf), "lb/ft²", "RM E9G28, tabla I"],
      ["Temperatura total a la entrada", String(a.engineInletTotalTemperature_R), "°R", "RM E9G28, tabla I"],
      ["Vueltas", String(a.engineSpeed_rpm), "rpm", "RM E9G09, tabla I"],
      ["Gasto de aire", String(a.airFlow_lb_s), "lb/s", "RM E9G09, tabla I"],
      ["Presión total a la salida del compresor", String(a.compressorOutletTotalPressure_psf), "lb/ft²", "RM E9G28, tabla I"],
      ["Temperatura total a la salida del compresor", String(a.compressorOutletTotalTemperature_R), "°R", "RM E9G28, tabla I"],
      ["Presión total a la entrada de la turbina", String(a.turbineInletTotalPressure_psf), "lb/ft²", "RM E9K10, tabla I"],
      ["Presión total a la salida de la turbina", String(a.turbineOutletTotalPressure_psf), "lb/ft²", "RM E9K10, tabla I"],
      ["Temperatura total a la salida de la turbina", String(a.turbineOutletTotalTemperature_R), "°R", "RM E9K10, tabla I"],
      ["Presión total en la tobera sobre la de entrada", String(a.engineTotalPressureRatio), "sin unidad", "RM E9G09, tabla I"],
      ["Gasto de combustible", String(a.fuelFlow_lb_h), "lb/h", "RM E9G09, tabla I"],
      ["Empuje del chorro, de la balanza", String(a.jetThrust_lbf), "lbf", "RM E9G09, tabla I"],
    ],
    text: [
      ["Poder calorífico inferior (`report text`)", String(J47_FUEL.lowerHeatingValue_Btu_lb), "Btu/lb", "RM E9L02, p. 14"],
      ["Relación hidrógeno-carbono del combustible (`report text`)", String(J47_FUEL.hydrogenCarbonRatio), "en masa", "RM E9L02, p. 14"],
      ["Vueltas nominales (`report text`)", String(J47_RATED_SPEED_RPM), "rpm", "RM E9G09, p. 3"],
    ],
  };
}

/** What is taken from the anchor run, in report units as printed. */
export function anchorInputsTable(): string {
  const rows = anchorRows();
  return table(["Valor del ancla (`measured`)", "Cifra", "Unidad del informe", "Fuente"], [...rows.measured, ...rows.text]);
}

/** What the model computes at the anchor, next to what the reports tabulate for the same run. */
export function anchorDerivedTable(engine: AnchoredEngine): string {
  const t = engine.hardware.technology;
  const r = J47_ANCHOR_REPORTED;
  return table(
    ["En el ancla", "Modelo (`computed`)", "Informe", "Nota"],
    [
      [
        "Temperatura de entrada a la turbina",
        `${fmt(engine.turbineInletTemperature_K, 1)} K (${fmt(engine.turbineInletTemperature_K / K_PER_R, 0)} °R)`,
        `${r.turbineInletTotalTemperature_R} °R, calculada por el informe`,
        "Nadie la midió. El informe descuenta los sangrados; el modelo no",
      ],
      [
        "Rendimiento adiabático del compresor",
        fmt(engine.compressorIsentropicEfficiency, 3),
        fmt(r.compressorEfficiency_percent / 100, 3),
        "El informe usa calor específico constante",
      ],
      ["Rendimiento politrópico del compresor", fmt(t.compressorPolytropicEfficiency, 3), "no lo da", "El que usa el modelo"],
      [
        "Rendimiento adiabático de la turbina",
        fmt(engine.turbineIsentropicEfficiency, 3),
        fmt(r.turbineEfficiency, 3),
        "El informe declara un error máximo de ±3 % a presión alta",
      ],
      ["Rendimiento politrópico de la turbina", fmt(t.turbinePolytropicEfficiency, 3), "no lo da", "El que usa el modelo"],
      ["Rendimiento de combustión", fmt(t.burnerEfficiency, 3), fmt(r.combustionEfficiency, 3), "El informe declara ±0.04"],
      ["Pérdida de presión de la cámara", fmt(engine.burnerPressureLoss, 4), "0.0388, medida", "Es el mismo cociente de presiones medidas"],
      ["Pérdida de presión del conducto de salida", fmt(engine.tailpipePressureLoss, 4), "no la da", "De dos presiones medidas"],
      [
        "Coeficiente de empuje de la tobera",
        fmt(t.nozzleThrustCoefficient, 4),
        "figura 3: nube entre 0.96 y 1.00 por encima de 1.8",
        "Empuje del chorro medido entre el ideal del modelo",
      ],
      [
        "Área efectiva de la tobera",
        `${fmt(engine.hardware.nozzleArea_m2, 4)} m²`,
        `${fmt(j47NozzleHotArea_m2(), 4)} m² (${J47_NOZZLE.coldArea_sq_in} in² por ${J47_NOZZLE.hotOverColdArea})`,
        `Cociente ${fmt(engine.hardware.nozzleArea_m2 / j47NozzleHotArea_m2(), 3)}: el coeficiente de descarga que el informe no da`,
      ],
      ["Área efectiva de paso de la turbina", `${fmt(engine.hardware.turbineThroatArea_m2, 4)} m²`, "no la da", ""],
    ],
  );
}

/** The anchored J47 at sea-level static, next to the nominal rating of the report text. */
export function seaLevelTable(point: OperatingPoint): string {
  const thrust_lbf = point.netThrust_N / N_PER_LBF;
  const air_lb_s = point.airflow_kg_s / KG_PER_LB;
  const fuel_lb_h = (point.fuelFlow_kg_s / KG_PER_LB) * 3600;
  const outlet_F = point.turbineOutletTemperature_K / K_PER_R - 459.67;
  const row = (name: string, model: number, decimals: number, unit: string, nominal: number): string[] => [
    name,
    `${fmt(model, decimals)} ${unit}`,
    `${nominal} ${unit}`,
    `${percent(model / nominal - 1)} %`,
  ];
  return table(
    [`Parado a nivel del mar, ${J47_RATED_SPEED_RPM} rpm`, "Modelo anclado (`computed`)", "Nominal del informe (`report text`)", "Diferencia"],
    [
      row("Empuje", thrust_lbf, 0, "lbf", J47_RATING.thrust_lbf),
      row("Gasto de aire", air_lb_s, 1, "lb/s", J47_RATING.airFlow_lb_s),
      row("Relación de compresión", point.pressureRatio, 2, "", J47_RATING.pressureRatio),
      row("Gasto de combustible", fuel_lb_h, 0, "lb/h", J47_RATING.fuelFlow_lb_h),
      [
        "Temperatura de salida de la turbina",
        `${fmt(outlet_F, 0)} °F`,
        `${J47_TURBINE_OUTLET_LIMIT_F} °F`,
        `${signed(outlet_F - J47_TURBINE_OUTLET_LIMIT_F, 0)} °F`,
      ],
    ],
  );
}

/** The J47 as the player's design, and the turbine limit that follows from it. */
export function designBasisTable(basis: DesignBasis): string {
  const d = basis.j47Design;
  return table(
    ["Cifra", "Valor", "Clase"],
    [
      ["Gasto de aire de diseño del J47", `${fmt(d.designAirflow_kg_s, 2)} kg/s`, "`computed`"],
      ["Relación de compresión de diseño del J47", fmt(d.pressureRatio, 3), "`computed`"],
      ["Temperatura de entrada a la turbina de diseño del J47", `${fmt(d.turbineInletTemperature_K, 1)} K`, "`computed`"],
      [
        "Límite de temperatura de entrada a la turbina",
        `${fmt(basis.turbineLimit.limit_K, 1)} K`,
        `\`computed\`: ${J47_TURBINE_OUTLET_LIMIT_F} °F a la salida (\`report text\`) por el cociente de temperaturas de la turbina en el ancla`,
      ],
      ["Presupuesto de sobretemperatura", `${DAMAGE_RULE_V0.overheatBudget_K_s} K·s`, "`estimated`, sin fuente"],
      ["Exceso con fallo inmediato", `${DAMAGE_RULE_V0.instantFailureExcess_K} K`, "`estimated`, sin fuente"],
      ["Vueltas de ralentí sobre las nominales", fmt(basis.idleSpeedFraction, 3), "`measured`: la menor velocidad de la tabla I; `estimated` en otros diseños"],
    ],
  );
}

function hitMark(point: ComparedPoint, q: Quantity): string {
  if (!point.hit) return "sin punto";
  return point.hit[q] ? "sí" : "no";
}

/** One row per scored point. */
export function pointsTable(comparison: J47Comparison): string {
  const rows = comparison.points
    .filter((point) => point.scored)
    .map((point) => {
      const cells = [String(point.run), point.regionId ?? "", String(point.speed_rpm)];
      for (const q of QUANTITIES) {
        cells.push(point.error ? percent(point.error[q] / point.measured[q]) : "sin punto");
        cells.push(point.uVal ? fmt((100 * point.uVal[q]) / point.measured[q], 1) : "");
        cells.push(hitMark(point, q));
      }
      return cells;
    });
  return table(
    ["Corrida", "Región", "rpm", "E empuje, %", "u_val, %", "Acierta", "E combustible, %", "u_val, %", "Acierta", "E aire, %", "u_val, %", "Acierta"],
    rows,
  );
}

/** The same points as CSV, in SI, with every term of u_val. */
export function pointsCsv(comparison: J47Comparison): string {
  const header = ["run", "region", "speed_rpm", "scored"];
  for (const q of QUANTITIES) header.push(`${q}_measured`, `${q}_model`, `${q}_E`, `${q}_uD`, `${q}_uInput`, `${q}_uNum`, `${q}_uVal`, `${q}_hit`);
  const lines = [header.join(",")];
  for (const point of comparison.points) {
    const cells: string[] = [String(point.run), point.regionId ?? "", String(point.speed_rpm), String(point.scored)];
    for (const q of QUANTITIES) {
      cells.push(
        point.measured[q].toPrecision(7),
        point.model ? point.model[q].toPrecision(7) : "",
        point.error ? point.error[q].toPrecision(5) : "",
        point.uD[q].toPrecision(5),
        point.uInput ? point.uInput[q].toPrecision(5) : "",
        point.uNum ? point.uNum[q].toPrecision(3) : "",
        point.uVal ? point.uVal[q].toPrecision(5) : "",
        point.hit ? String(point.hit[q]) : "",
      );
    }
    lines.push(cells.join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** One row per region. */
export function regionsTable(comparison: J47Comparison): string {
  const rows = comparison.regions.map((result) => {
    const n = result.points.length;
    return [
      result.region.id,
      String(n),
      result.medianUvalFraction ? QUANTITIES.map((q) => fmt(100 * (result.medianUvalFraction?.[q] ?? 0), 1)).join(" / ") : "",
      result.compared ? "sí" : "no",
      `${result.hits} de ${n}`,
      QUANTITIES.map((q) => String(result.withinFraction[q])).join(" / "),
      result.hit ? "sí" : "no",
    ];
  });
  return table(
    [
      "Región (pies-Mach)",
      "Puntos puntuados",
      "Mediana de u_val, % (empuje / combustible / aire)",
      "Comparada",
      "Puntos que aciertan en las tres",
      "Dentro del 5 / 5 / 3 %, sin u_val",
      "Acierto",
    ],
    rows,
  );
}

/** Mean signed error by speed, which shows the shape of the error. */
export function errorBySpeedTable(comparison: J47Comparison): string {
  const scored = comparison.points.filter((point) => point.scored && point.error);
  const speeds = [...new Set(scored.map((point) => point.speed_rpm))].sort((a, b) => a - b);
  const rows = speeds.map((speed) => {
    const group = scored.filter((point) => point.speed_rpm === speed);
    const mean = (q: Quantity): number =>
      group.reduce((sum, point) => sum + (point.error?.[q] ?? 0) / point.measured[q], 0) / group.length;
    return [String(speed), fmt((100 * speed) / J47_RATED_SPEED_RPM, 1), String(group.length), ...QUANTITIES.map((q) => percent(mean(q)))];
  });
  return table(["rpm", "% de las nominales", "Puntos", "E medio empuje, %", "E medio combustible, %", "E medio aire, %"], rows);
}

/** The comparison at matched exhaust-gas temperature, by speed. */
export function temperatureMatchedTable(points: readonly TemperatureMatchedPoint[]): string {
  const matched = points.filter((point) => point.error);
  const speeds = [...new Set(matched.map((point) => point.speed_rpm))].sort((a, b) => a - b);
  const rows = speeds.map((speed) => {
    const group = matched.filter((point) => point.speed_rpm === speed);
    const mean = (q: Quantity): number =>
      group.reduce((sum, point) => sum + (point.error?.[q] ?? 0) / point.measured[q], 0) / group.length;
    const speedError =
      group.reduce((sum, point) => sum + ((point.modelSpeed_rpm ?? Number.NaN) / point.speed_rpm - 1), 0) / group.length;
    return [String(speed), String(group.length), percent(speedError), ...QUANTITIES.map((q) => percent(mean(q)))];
  });
  return table(
    ["rpm medidas", "Puntos", "Vueltas del modelo menos medidas, % medio", "E medio empuje, %", "E medio combustible, %", "E medio aire, %"],
    rows,
  );
}

/** Which regions a standard-day flight at the nominal altitude and Mach number falls in. */
export function standardDayTable(regions: readonly J47Region[]): string {
  const rows = regions.map((region) => {
    const standard = standardAtmosphere(region.altitude_ft * 0.3048);
    const offset = standard.temperature_K / region.ambientTemperature_K - 1;
    return [
      region.id,
      fmt(region.ambientTemperature_K, 1),
      fmt(standard.temperature_K, 1),
      percent(offset),
      Math.abs(offset) <= REGION_TEMPERATURE_TOLERANCE ? "sí" : "no",
    ];
  });
  return table(
    ["Región", "Temperatura ambiente equivalente del ensayo, K", "Atmósfera estándar a esa altitud, K", "Diferencia, %", "¿Cae un día estándar en la región?"],
    rows,
  );
}

/** Numbers quoted in the prose of the study, by name. */
export function snippets(
  runs: readonly J47Run[],
  comparison: J47Comparison,
  matched: readonly TemperatureMatchedPoint[],
  seaLevel: OperatingPoint,
  basis: DesignBasis,
): Record<string, string> {
  const scored = comparison.points.filter((point) => point.scored);
  const withModel = scored.filter((point) => point.error);
  const anchor = runs.find((run) => run.run === ANCHOR_RUN);
  if (!anchor) throw new Error("the anchor run is not in the table");
  const a = J47_ANCHOR_REPORT_UNITS;
  const reported = J47_ANCHOR_REPORTED;
  const engine = comparison.engine;
  const meanThrustErrorAt = (speed: number): string => {
    const group = withModel.filter((point) => point.speed_rpm === speed);
    return percent(group.reduce((sum, point) => sum + (point.error?.netThrust ?? 0) / point.measured.netThrust, 0) / group.length);
  };
  const speeds = [...new Set(withModel.map((point) => point.speed_rpm))].sort((x, y) => x - y);
  const lowestSpeed = speeds[0] ?? Number.NaN;
  const highestSpeed = speeds[speeds.length - 1] ?? Number.NaN;
  const middleSpeed = 7500;
  type WithError = { readonly error: Readonly<Record<Quantity, number>> | null; readonly measured: Readonly<Record<Quantity, number>> };
  const medianAbs = (points: readonly WithError[], q: Quantity): number =>
    median(points.filter((point) => point.error).map((point) => Math.abs((point.error?.[q] ?? 0) / point.measured[q])));
  const matchedWorse = QUANTITIES.filter((q) => medianAbs(matched, q) > medianAbs(withModel, q)).length;
  const seaLevelPressure_psf = 101325 / 47.88025898033584;
  const out: Record<string, string> = {
    runs: String(comparison.points.length),
    anchorRun: String(ANCHOR_RUN),
    scoredPoints: String(scored.length),
    regions: String(comparison.regions.length),
    comparedRegions: String(comparison.regions.filter((r) => r.compared).length),
    hitRegions: String(comparison.regions.filter((r) => r.hit).length),
    notComparedRegions: comparison.regions
      .filter((r) => !r.compared)
      .map((r) => r.region.id)
      .join(", "),
    allThreeHits: String(scored.filter((point) => point.hit && QUANTITIES.every((q) => point.hit?.[q])).length),
    noRunningPoint: String(scored.length - withModel.length),
    seaLevelThrust_kN: fmt(seaLevel.netThrust_N / 1000, 1),
    seaLevelThrust_lbf: fmt(seaLevel.netThrust_N / N_PER_LBF, 0),
    turbineLimit_K: fmt(basis.turbineLimit.limit_K, 0),
    idlePercent: fmt(100 * basis.idleSpeedFraction, 0),
    thrustCoefficient: fmt(comparison.engine.hardware.technology.nozzleThrustCoefficient, 3),
    uAir: fmt(100 * MEASUREMENT_UNCERTAINTY.airflow, 1),
    uJet: fmt(100 * MEASUREMENT_UNCERTAINTY.jetThrust, 1),
    uFuel: fmt(100 * MEASUREMENT_UNCERTAINTY.fuelFlow, 1),
    matchedPoints: String(matched.filter((point) => point.error).length),
    unmatchedPoints: String(matched.filter((point) => !point.error).length),
    matchedVerdict:
      matchedWorse === QUANTITIES.length
        ? "A igual temperatura el error no baja: sube en las tres magnitudes. El modelo necesita más vueltas que el motor para llegar a la temperatura medida; dicho al revés, a las mismas vueltas el motor real va más caliente de lo que el modelo predice. La ley de vueltas no es, por tanto, la causa principal del error"
        : matchedWorse === 0
          ? "A igual temperatura el error baja en las tres magnitudes: la ley de vueltas explica una parte del error, pero no todo"
          : "A igual temperatura el error baja en unas magnitudes y sube en otras: la ley de vueltas no es la única causa",
    anchorMeasuredCount: String(anchorRows().measured.length),
    anchorTextCount: String(anchorRows().text.length),
    anchorAltitude_ft: String(anchor.altitude_ft),
    anchorMach: fmt(anchor.flightMach, 2),
    anchorSpeed_rpm: String(anchor.engineSpeed_rpm),
    anchorJetThrust_lbf: String(a.jetThrust_lbf),
    anchorInletPressurePercent: fmt((100 * a.engineInletTotalPressure_psf) / seaLevelPressure_psf, 0),
    nozzleArea_sq_in: String(J47_NOZZLE.coldArea_sq_in),
    nozzleAreaDifferencePercent: fmt(100 * Math.abs(engine.hardware.nozzleArea_m2 / j47NozzleHotArea_m2() - 1), 1),
    leakage_lb_s: String(reported.compressorLeakageAirFlow_lb_s),
    cooling_lb_s: String(reported.turbineCoolingAirFlow_lb_s),
    bleedPercent: fmt((100 * (reported.compressorLeakageAirFlow_lb_s + reported.turbineCoolingAirFlow_lb_s)) / a.airFlow_lb_s, 1),
    seaLevelAirflowDifferencePercent: fmt(100 * Math.abs(seaLevel.airflow_kg_s / KG_PER_LB / J47_RATING.airFlow_lb_s - 1), 1),
    seaLevelPressureRatioDifferencePercent: fmt(100 * Math.abs(seaLevel.pressureRatio / J47_RATING.pressureRatio - 1), 1),
    highSpeedPercent: fmt(100 * HIGH_SPEED_FRACTION, 0),
    minPoints: String(MIN_SCORED_POINTS),
    maxMedianUvalPercent: fmt(100 * MAX_MEDIAN_UVAL_FRACTION, 0),
    minHitPercent: fmt(100 * MIN_HIT_FRACTION, 0),
    airFlowAgreementPercent: String(J47_REPORT_TEXT.airFlowAgreement_percent),
    minimumInletTemperature_R: String(J47_REPORT_TEXT.minimumInletTemperature_R),
    compressorPeakEfficiencyPercent: String(J47_REPORT_TEXT.compressorPeakEfficiency_percent),
    compressorPeakEfficiencySpeed_rpm: String(J47_REPORT_TEXT.compressorPeakEfficiencySpeed_rpm),
    compressorEfficiencyLowAltitudePercent: String(J47_REPORT_TEXT.compressorEfficiencyAtRatedSpeed5000ft_percent),
    compressorEfficiencyHighAltitudePercent: String(J47_REPORT_TEXT.compressorEfficiencyAtRatedSpeed50000ft_percent),
    lowestTestedAltitude_ft: String(Math.min(...J47_TESTED_CONDITIONS.map((c) => c.altitude_ft))),
    highestTestedAltitude_ft: String(Math.max(...J47_TESTED_CONDITIONS.map((c) => c.altitude_ft))),
    lowestTestedMach: fmt(Math.min(...J47_TESTED_CONDITIONS.flatMap((c) => c.machs)), 2),
    lowestSpeedPercent: fmt((100 * lowestSpeed) / J47_RATED_SPEED_RPM, 1),
    middleSpeedPercent: fmt((100 * middleSpeed) / J47_RATED_SPEED_RPM, 1),
    highestSpeedPercent: fmt((100 * highestSpeed) / J47_RATED_SPEED_RPM, 1),
    meanThrustErrorLowestSpeed: meanThrustErrorAt(lowestSpeed),
    meanThrustErrorMiddleSpeed: meanThrustErrorAt(middleSpeed),
    meanThrustErrorHighestSpeed: meanThrustErrorAt(highestSpeed),
  };
  for (const q of QUANTITIES) {
    const relative = withModel.map((point) => Math.abs((point.error?.[q] ?? 0) / point.measured[q]));
    out[`hits:${q}`] = String(withModel.filter((point) => point.hit?.[q]).length);
    out[`within:${q}`] = String(withModel.filter((point) => point.withinFraction?.[q]).length);
    out[`median:${q}`] = fmt(100 * median(relative), 1);
    out[`max:${q}`] = fmt(100 * Math.max(...relative), 1);
    out[`threshold:${q}`] = fmt(100 * HIT_FRACTION[q], 0);
    out[`medianUval:${q}`] = fmt(100 * median(withModel.map((point) => (point.uVal?.[q] ?? 0) / point.measured[q])), 1);
    out[`maxUnum:${q}`] = (100 * Math.max(...withModel.map((point) => (point.uNum?.[q] ?? 0) / point.measured[q]))).toExponential(0);
    const matchedRelative = matched.filter((point) => point.error).map((point) => Math.abs((point.error?.[q] ?? 0) / point.measured[q]));
    out[`matchedWithin:${q}`] = String(matched.filter((point) => point.withinFraction?.[q]).length);
    out[`matchedMedian:${q}`] = fmt(100 * median(matchedRelative), 1);
    out[`name:${q}`] = QUANTITY_NAME[q];
  }
  return out;
}

/** Figure: comparison error against shaft speed, one panel per scored quantity. */
export function errorFigure(comparison: J47Comparison): string {
  const scored = comparison.points.filter((point) => point.scored && point.error);
  const altitudes = [...new Set(comparison.regions.map((r) => r.region.altitude_ft))];
  const colours = ["#1b4f72", "#2e86c1", "#17a589", "#b7950b", "#ca6f1e", "#922b21"];
  const colourOf = (regionIdText: string | null): string => {
    const altitude = Number((regionIdText ?? "").split("-")[0]);
    return colours[altitudes.indexOf(altitude)] ?? "#444444";
  };
  const panelWidth = 300;
  const panelHeight = 240;
  const margin = { left: 52, top: 40, right: 12, bottom: 44 };
  const width = QUANTITIES.length * (panelWidth + margin.left + margin.right);
  const height = panelHeight + margin.top + margin.bottom + 40;
  const xMin = 87;
  const xMax = 101;
  const yMin = -25;
  const yMax = 20;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="sans-serif" font-size="12">`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
  ];
  QUANTITIES.forEach((q, i) => {
    const x0 = i * (panelWidth + margin.left + margin.right) + margin.left;
    const y0 = margin.top;
    const sx = (speedPercent: number): number => x0 + ((speedPercent - xMin) / (xMax - xMin)) * panelWidth;
    const sy = (errorPercent: number): number => y0 + ((yMax - errorPercent) / (yMax - yMin)) * panelHeight;
    const band = 100 * HIT_FRACTION[q];
    parts.push(`<text x="${x0}" y="${y0 - 14}" font-weight="bold">${QUANTITY_NAME[q]}: E, % de lo medido</text>`);
    parts.push(`<rect x="${x0}" y="${sy(band)}" width="${panelWidth}" height="${sy(-band) - sy(band)}" fill="#d5f5e3"/>`);
    parts.push(`<rect x="${x0}" y="${y0}" width="${panelWidth}" height="${panelHeight}" fill="none" stroke="#333333"/>`);
    for (let tick = yMin; tick <= yMax; tick += 5) {
      parts.push(`<line x1="${x0 - 4}" y1="${sy(tick)}" x2="${x0}" y2="${sy(tick)}" stroke="#333333"/>`);
      parts.push(`<text x="${x0 - 8}" y="${sy(tick) + 4}" text-anchor="end">${tick}</text>`);
    }
    parts.push(`<line x1="${x0}" y1="${sy(0)}" x2="${x0 + panelWidth}" y2="${sy(0)}" stroke="#333333" stroke-dasharray="4 3"/>`);
    for (let tick = 88; tick <= 100; tick += 4) {
      parts.push(`<line x1="${sx(tick)}" y1="${y0 + panelHeight}" x2="${sx(tick)}" y2="${y0 + panelHeight + 4}" stroke="#333333"/>`);
      parts.push(`<text x="${sx(tick)}" y="${y0 + panelHeight + 18}" text-anchor="middle">${tick}</text>`);
    }
    parts.push(`<text x="${x0 + panelWidth / 2}" y="${y0 + panelHeight + 36}" text-anchor="middle">Vueltas, % de las nominales</text>`);
    for (const point of scored) {
      const error = (100 * (point.error?.[q] ?? 0)) / point.measured[q];
      const clipped = Math.max(yMin, Math.min(yMax, error));
      parts.push(
        `<circle cx="${sx((100 * point.speed_rpm) / J47_RATED_SPEED_RPM).toFixed(1)}" cy="${sy(clipped).toFixed(1)}" r="4" fill="${colourOf(point.regionId)}" fill-opacity="0.8"/>`,
      );
    }
  });
  altitudes.forEach((altitude, i) => {
    const x = margin.left + i * 130;
    const y = height - 14;
    parts.push(`<circle cx="${x}" cy="${y - 4}" r="4" fill="${colours[i] ?? "#444444"}"/>`);
    parts.push(`<text x="${x + 10}" y="${y}">${altitude} pies</text>`);
  });
  parts.push(`<text x="${width - 12}" y="${height - 14}" text-anchor="end">Banda verde: umbral de acierto sin u_val</text>`);
  parts.push("</svg>");
  return `${parts.join("\n")}\n`;
}
