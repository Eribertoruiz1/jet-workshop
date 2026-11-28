/**
 * A built engine away from its reference point.
 *
 * Method: matching with a choked turbine and a fixed exhaust nozzle, without
 * component maps (candidate A of studies/002-engine-cycle/PLAN.md). The engine is
 * two fixed flow areas in series, the turbine nozzle and the exhaust nozzle, and
 * a compressor whose work per kilogram goes with the square of the shaft speed.
 * Conservation of mass and energy between the two areas fixes the running point.
 *
 * What is held constant away from the reference point, and is therefore the
 * model error the study measures: the polytropic efficiencies of compressor and
 * turbine, the combustion efficiency and the thrust coefficient of the nozzle.
 *
 * Left out, and said so: bleed and cooling air, accessory power, the effect of
 * Reynolds number on the compressor, and the thermal growth of the nozzle area.
 */

import { convergentNozzle, expandForWork, jetThrust, solveReferencePoint, type CyclePoint, type NozzleFlow } from "./cycle.ts";
import { temperatureFromEnthalpy, type GasModel } from "./gas.ts";

/** What does not depend on the size of an engine: the gas, the fuel and how lossy each component is. */
export interface Technology {
  readonly gas: GasModel;
  /** Lower heating value of the fuel, J/kg */
  readonly fuelHeatingValue_J_kg: number;
  readonly compressorPolytropicEfficiency: number;
  readonly turbinePolytropicEfficiency: number;
  /** Fraction of the heating value that reaches the gas */
  readonly burnerEfficiency: number;
  /** Fraction of the turbine work that reaches the compressor */
  readonly mechanicalEfficiency: number;
  /** Actual over ideal jet thrust of the convergent nozzle, see `jetThrust` */
  readonly nozzleThrustCoefficient: number;
}

/** The point at which an engine is sized: shaft speed fraction 1 by definition. */
export interface HardwareReference {
  readonly ambientPressure_Pa: number;
  readonly inletTotalTemperature_K: number;
  readonly inletTotalPressure_Pa: number;
  readonly airflow_kg_s: number;
  readonly pressureRatio: number;
  readonly turbineInletTemperature_K: number;
  /** Total pressure lost in the burner at this point, as a fraction of its inlet pressure */
  readonly burnerPressureLoss: number;
  /** Total pressure lost between turbine outlet and nozzle inlet at this point, as a fraction */
  readonly tailpipePressureLoss: number;
}

/** A sized engine: its technology and what was fixed at its reference point. */
export interface EngineHardware {
  readonly technology: Technology;
  /** Effective flow area of the turbine nozzle, m2 */
  readonly turbineThroatArea_m2: number;
  /** Effective flow area of the exhaust nozzle, m2 */
  readonly nozzleArea_m2: number;
  /** Compressor work per kilogram of air at shaft speed fraction 1, J/kg. At fraction n it is n^2 times this. */
  readonly compressorWorkAtFullSpeed_J_kg: number;
  /**
   * Burner pressure loss, as a fraction, per unit of Wair^2 T3 / P3^2 at its inlet.
   * That is the form of the friction loss of NACA RM E9L02, equation 7c (PDF page 15).
   * MODEL: it is applied here to the whole loss. The part due to heat addition, which
   * that report computes from a chart, does not follow it exactly.
   */
  readonly burnerLossCoefficient: number;
  /**
   * Tailpipe pressure loss, as a fraction, per unit of Wgas^2 T5 / P5^2 at its inlet.
   * UNVERIFIED: the same form as the burner's, assumed; no source for the tailpipe.
   */
  readonly tailpipeLossCoefficient: number;
  /** Turbine inlet temperature at the reference point, K. It only seeds the iteration. */
  readonly referenceTurbineInletTemperature_K: number;
}

export type HardwareResult =
  | { readonly ok: true; readonly hardware: EngineHardware; readonly point: CyclePoint }
  | { readonly ok: false; readonly reason: "turbine-cannot-drive-compressor" };

/**
 * Gas flow per unit of area and of inlet total pressure through the turbine,
 * treated as one nozzle that expands the gas from its inlet total state to its
 * outlet total pressure. Choked at high speed, unchoked at low speed.
 */
function turbineFlux(gas: GasModel, inlet_K: number, f: number, pressureRatio: number): number {
  return convergentNozzle(gas, inlet_K, 1, f, pressureRatio).massFlux_kg_s_m2;
}

/**
 * Sizes an engine at its reference point.
 *
 * UNVERIFIED, both the assumptions of candidate A and neither read in a source:
 * compressor work per kilogram proportional to the square of the shaft speed, and
 * the turbine passing the flow of a single nozzle of fixed area at its over-all
 * pressure ratio (`turbineFlux`), which matters only where it is not choked.
 */
export function buildHardware(technology: Technology, reference: HardwareReference): HardwareResult {
  const solved = solveReferencePoint({
    gas: technology.gas,
    ambientPressure_Pa: reference.ambientPressure_Pa,
    flightSpeed_m_s: 0,
    inletTotalTemperature_K: reference.inletTotalTemperature_K,
    inletTotalPressure_Pa: reference.inletTotalPressure_Pa,
    airflow_kg_s: reference.airflow_kg_s,
    pressureRatio: reference.pressureRatio,
    turbineInletTemperature_K: reference.turbineInletTemperature_K,
    compressorEfficiency: { kind: "polytropic", value: technology.compressorPolytropicEfficiency },
    turbineEfficiency: { kind: "polytropic", value: technology.turbinePolytropicEfficiency },
    burnerEfficiency: technology.burnerEfficiency,
    burnerPressureLoss: reference.burnerPressureLoss,
    mechanicalEfficiency: technology.mechanicalEfficiency,
    tailpipePressureLoss: reference.tailpipePressureLoss,
    nozzleThrustCoefficient: technology.nozzleThrustCoefficient,
    fuelHeatingValue_J_kg: technology.fuelHeatingValue_J_kg,
  });
  if (!solved.ok) return solved;
  const p = solved.point;
  const gasFlow = p.airflow_kg_s * (1 + p.fuelAirRatio);
  const flux = turbineFlux(
    technology.gas,
    reference.turbineInletTemperature_K,
    p.fuelAirRatio,
    p.turbineOutletPressure_Pa / p.turbineInletPressure_Pa,
  );
  return {
    ok: true,
    point: p,
    hardware: {
      technology,
      turbineThroatArea_m2: gasFlow / (p.turbineInletPressure_Pa * flux),
      nozzleArea_m2: p.nozzleArea_m2,
      compressorWorkAtFullSpeed_J_kg: p.compressorSpecificWork_J_kg,
      burnerLossCoefficient:
        (reference.burnerPressureLoss * p.compressorOutletPressure_Pa ** 2) /
        (p.airflow_kg_s ** 2 * p.compressorOutletTemperature_K),
      tailpipeLossCoefficient:
        (reference.tailpipePressureLoss * p.turbineOutletPressure_Pa ** 2) / (gasFlow ** 2 * p.turbineOutletTemperature_K),
      referenceTurbineInletTemperature_K: reference.turbineInletTemperature_K,
    },
  };
}

/** Where and how fast the engine runs. */
export interface OperatingConditions {
  /** Ambient static pressure, Pa */
  readonly ambientPressure_Pa: number;
  /** Total temperature and pressure at the compressor face, after the intake */
  readonly inletTotalTemperature_K: number;
  readonly inletTotalPressure_Pa: number;
  /** Flight speed, m/s. Only the ram drag depends on it. */
  readonly flightSpeed_m_s: number;
  /** Shaft speed as a fraction of the speed at the reference point */
  readonly speedFraction: number;
}

export interface OperatingPoint {
  readonly speedFraction: number;
  readonly airflow_kg_s: number;
  readonly fuelAirRatio: number;
  readonly fuelFlow_kg_s: number;
  /** Air plus fuel through the turbine and the nozzle, kg/s */
  readonly gasFlow_kg_s: number;
  readonly pressureRatio: number;
  readonly compressorSpecificWork_J_kg: number;
  readonly compressorOutletTemperature_K: number;
  readonly compressorOutletPressure_Pa: number;
  readonly turbineInletTemperature_K: number;
  readonly turbineInletPressure_Pa: number;
  readonly turbineOutletTemperature_K: number;
  readonly turbineOutletPressure_Pa: number;
  /** Turbine outlet over inlet total pressure */
  readonly turbinePressureRatio: number;
  readonly nozzleInletPressure_Pa: number;
  readonly nozzle: NozzleFlow;
  readonly grossThrust_N: number;
  readonly netThrust_N: number;
  /**
   * True when ram pressure alone turns the engine at this speed. The burner is at
   * its lowest and the two flow areas are not in balance: see `solveOperatingPoint`.
   */
  readonly windmilling: boolean;
  /** Evaluations of the cycle the matching took */
  readonly evaluations: number;
}

export type OperatingResult =
  | { readonly ok: true; readonly point: OperatingPoint }
  /** No turbine inlet temperature the burner can reach balances the two flow areas at this speed. */
  | { readonly ok: false; readonly reason: "no-running-point" };

/** The matching never looks for a turbine inlet temperature above this, K. Lean combustion ends near it. */
const MAX_TURBINE_INLET_K = 2200;
/**
 * Nor below this, K, or 1 K above the compressor outlet if that is higher. Colder
 * gas has a sonic state under the 200 K at which the gas model starts, once the
 * turbine has taken its work. It also stands for the least the burner can burn.
 */
const MIN_TURBINE_INLET_K = 300;
const MAX_EVALUATIONS = 80;
const NO_RUNNING_POINT: OperatingResult = { ok: false, reason: "no-running-point" };

/**
 * Finds the running point of an engine at a shaft speed.
 *
 * One unknown, the turbine inlet temperature. For a trial value, the burner
 * balance gives the fuel, the shaft balance the turbine work and with it the
 * turbine outlet state, and each of the two areas a gas flow. The running point
 * is the temperature at which the two flows are equal.
 *
 * Windmilling. At flight speed and low shaft speed the exhaust nozzle would pass
 * more than the turbine does even at the lowest turbine inlet temperature: ram
 * pressure alone would turn the engine faster than asked. No temperature balances
 * the two areas there. ESTIMATED: the engine is then taken at that lowest
 * temperature, with the gas flow the turbine passes, and the jet as that flow
 * expanded through the nozzle. It joins the balanced solution without a jump, and
 * it is not a model of a windmilling engine: the report measured its drag (NACA
 * RM E9G09, figures 8 and 9) and those data are not used yet.
 */
export function solveOperatingPoint(
  hardware: EngineHardware,
  conditions: OperatingConditions,
  relativeTolerance = 1e-10,
): OperatingResult {
  const tech = hardware.technology;
  const gas = tech.gas;
  const T1 = conditions.inletTotalTemperature_K;
  const P1 = conditions.inletTotalPressure_Pa;
  const ambient = conditions.ambientPressure_Pa;
  const n = conditions.speedFraction;
  if (!(n > 0) || !(T1 >= gas.minTemperature_K) || !(T1 < MAX_TURBINE_INLET_K) || !(P1 > 0) || !(ambient > 0)) {
    return NO_RUNNING_POINT;
  }

  // Compressor: work from the speed, pressure ratio from the work and the polytropic efficiency.
  const work = hardware.compressorWorkAtFullSpeed_J_kg * n * n;
  const T3 = temperatureFromEnthalpy(gas, gas.enthalpy(T1, 0) + work, 0, T1 + work / gas.cp(T1, 0));
  const pressureRatio = Math.exp(
    (tech.compressorPolytropicEfficiency * (gas.entropyFunction(T3, 0) - gas.entropyFunction(T1, 0))) / gas.gasConstant(0),
  );
  const P3 = P1 * pressureRatio;
  const heatRelease = tech.burnerEfficiency * tech.fuelHeatingValue_J_kg;
  const turbineEfficiency = { kind: "polytropic", value: tech.turbinePolytropicEfficiency } as const;

  const low = Math.max(T3 + 1, MIN_TURBINE_INLET_K);
  const high = Math.min(MAX_TURBINE_INLET_K, gas.maxTemperature_K);
  if (!(low < high)) return NO_RUNNING_POINT;

  // State of the last trial, filled by `residual`.
  let f = 0;
  let T5 = 0;
  let turbineRatio = 0;
  let P4 = 0;
  let P5 = 0;
  let P7 = 0;
  let gasFlow = 0;
  let nozzle: NozzleFlow | null = null;
  let evaluations = 0;

  /** Nozzle flow minus turbine flow, over the turbine flow, at a trial turbine inlet temperature. */
  const residual = (T4: number): number => {
    evaluations += 1;
    nozzle = null;
    f = gas.fuelAirRatioIncrement(T3, 0, T4, heatRelease);
    if (!(f > 0) || !(f < gas.stoichiometricFuelAirRatio)) return 1;
    const turbine = expandForWork(gas, T4, f, work / (tech.mechanicalEfficiency * (1 + f)), turbineEfficiency);
    T5 = turbine.outletTemperature_K;
    turbineRatio = turbine.pressureRatio;
    const flux = turbineFlux(gas, T4, f, turbineRatio);
    // Burner loss: x = P4 / P3 solves x = 1 - c Wair^2 T3 / P3^2 with Wair = A4 P3 x flux / (1 + f).
    const a = hardware.burnerLossCoefficient * ((hardware.turbineThroatArea_m2 * flux) / (1 + f)) ** 2 * T3;
    P4 = (P3 * 2) / (1 + Math.sqrt(1 + 4 * a));
    gasFlow = hardware.turbineThroatArea_m2 * P4 * flux;
    P5 = P4 * turbineRatio;
    if (!(P5 > 0)) return -1;
    P7 = P5 * (1 - (hardware.tailpipeLossCoefficient * gasFlow * gasFlow * T5) / (P5 * P5));
    if (!(P7 > ambient)) return -1;
    nozzle = convergentNozzle(gas, T5, P7, f, ambient);
    return (nozzle.massFlux_kg_s_m2 * hardware.nozzleArea_m2 - gasFlow) / gasFlow;
  };

  // Bracket the root, starting next to the value the two choked throats would give.
  const clamp = (T: number): number => Math.min(high, Math.max(low, T));
  const guess = clamp(hardware.referenceTurbineInletTemperature_K * n * n);
  let a = clamp(guess * 0.97);
  let b = clamp(guess * 1.03);
  if (b - a < 1) {
    a = clamp(a - 1);
    b = clamp(b + 1);
  }
  let fa = residual(a);
  let fb = residual(b);
  let step = b - a;
  while (fa > 0 && a > low && evaluations < MAX_EVALUATIONS) {
    b = a;
    fb = fa;
    step *= 2;
    a = clamp(a - step);
    fa = residual(a);
  }
  while (fb < 0 && b < high && evaluations < MAX_EVALUATIONS) {
    a = b;
    fa = fb;
    step *= 2;
    b = clamp(b + step);
    fb = residual(b);
  }
  // The nozzle passes more than the turbine even at the lowest temperature: the engine windmills.
  const windmilling = fa > 0 && a === low;
  if (!windmilling && !(fa <= 0 && fb >= 0)) return NO_RUNNING_POINT;

  // Illinois variant of the false-position method: it keeps the bracket and converges fast.
  let T4 = windmilling ? low : b;
  let fT = windmilling ? residual(low) : fb;
  let side = 0;
  while (!windmilling && evaluations < MAX_EVALUATIONS) {
    if (b - a <= relativeTolerance * b) break;
    let next = fb === fa ? 0.5 * (a + b) : b - (fb * (b - a)) / (fb - fa);
    if (!(next > a && next < b)) next = 0.5 * (a + b);
    T4 = next;
    fT = residual(T4);
    if (fT === 0) break;
    if (fT < 0) {
      a = T4;
      fa = fT;
      if (side === -1) fb *= 0.5;
      side = -1;
    } else {
      b = T4;
      fb = fT;
      if (side === 1) fa *= 0.5;
      side = 1;
    }
  }
  // Leave the state of the trial closest to the root: the one with the smaller residual.
  if (!windmilling && (Math.abs(fa) < Math.abs(fT) || Math.abs(fb) < Math.abs(fT))) {
    T4 = Math.abs(fa) < Math.abs(fb) ? a : b;
    fT = residual(T4);
  }
  // The compiler cannot see that `residual` assigns it.
  const exit = nozzle as NozzleFlow | null;
  if (exit === null) return NO_RUNNING_POINT;

  const airflow = gasFlow / (1 + f);
  // In balance the jet fills the nozzle. Windmilling, it is the area this smaller flow needs.
  const jetArea = windmilling ? gasFlow / exit.massFlux_kg_s_m2 : hardware.nozzleArea_m2;
  const gross = jetThrust(tech.nozzleThrustCoefficient, gasFlow, exit, jetArea, ambient);
  return {
    ok: true,
    point: {
      speedFraction: n,
      airflow_kg_s: airflow,
      fuelAirRatio: f,
      fuelFlow_kg_s: airflow * f,
      gasFlow_kg_s: gasFlow,
      pressureRatio,
      compressorSpecificWork_J_kg: work,
      compressorOutletTemperature_K: T3,
      compressorOutletPressure_Pa: P3,
      turbineInletTemperature_K: T4,
      turbineInletPressure_Pa: P4,
      turbineOutletTemperature_K: T5,
      turbineOutletPressure_Pa: P5,
      turbinePressureRatio: turbineRatio,
      nozzleInletPressure_Pa: P7,
      nozzle: exit,
      grossThrust_N: gross,
      netThrust_N: gross - airflow * conditions.flightSpeed_m_s,
      windmilling,
      evaluations,
    },
  };
}
