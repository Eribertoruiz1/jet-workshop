/**
 * Thermodynamic cycle of a single-spool turbojet at one operating point.
 *
 * Stations: 2 compressor face, 3 compressor outlet, 4 turbine inlet, 5 turbine
 * outlet, 7 nozzle inlet, 9 nozzle exit. Temperatures and pressures at 2 to 7 are
 * total (stagnation) values. Every component is a balance of mass and energy on
 * the gas model it is given; nothing here is fitted to an engine.
 *
 * What is left out, and said so: bleed, turbine cooling air, power taken for
 * accessories, and heat lost through the casing.
 */

import { gamma, temperatureFromEnthalpy, temperatureFromEntropyFunction, type GasModel } from "./gas.ts";

/**
 * How lossy a compressor or a turbine is.
 * - "isentropic": ideal work over actual work (compressor) or the inverse (turbine),
 *   the adiabatic efficiency the test reports give.
 * - "polytropic": the same ratio for an infinitesimal step. It does not change with
 *   pressure ratio, so it is the one that describes a level of technology.
 */
export interface Efficiency {
  readonly kind: "isentropic" | "polytropic";
  readonly value: number;
}

/** Compression of air from total temperature `inlet_K` through a total-pressure ratio. */
export function compress(
  gas: GasModel,
  inlet_K: number,
  pressureRatio: number,
  efficiency: Efficiency,
): { readonly outletTemperature_K: number; readonly specificWork_J_kg: number } {
  const isentropicRise = gas.gasConstant(0) * Math.log(pressureRatio);
  const phiIn = gas.entropyFunction(inlet_K, 0);
  const hIn = gas.enthalpy(inlet_K, 0);
  const guess = inlet_K * pressureRatio ** 0.3;
  if (efficiency.kind === "polytropic") {
    // UNVERIFIED: polytropic efficiency written with the entropy function,
    // phi(T3) - phi(T2) = R ln(ratio) / e. It reduces to the textbook exponent
    // (gamma - 1) / (gamma e) for constant specific heat; no open source cited yet.
    const outlet = temperatureFromEntropyFunction(gas, phiIn + isentropicRise / efficiency.value, 0, guess);
    return { outletTemperature_K: outlet, specificWork_J_kg: gas.enthalpy(outlet, 0) - hIn };
  }
  const idealOutlet = temperatureFromEntropyFunction(gas, phiIn + isentropicRise, 0, guess);
  const work = (gas.enthalpy(idealOutlet, 0) - hIn) / efficiency.value;
  return { outletTemperature_K: temperatureFromEnthalpy(gas, hIn + work, 0, idealOutlet), specificWork_J_kg: work };
}

/**
 * Expansion in a turbine that has to deliver `specificWork_J_kg` per kilogram of gas.
 * Returns the outlet total temperature and the total-pressure ratio, outlet over inlet.
 * A pressure ratio of 0 means the gas does not hold that much work at any pressure.
 */
export function expandForWork(
  gas: GasModel,
  inlet_K: number,
  f: number,
  specificWork_J_kg: number,
  efficiency: Efficiency,
): { readonly outletTemperature_K: number; readonly pressureRatio: number } {
  const R = gas.gasConstant(f);
  const hIn = gas.enthalpy(inlet_K, f);
  const phiIn = gas.entropyFunction(inlet_K, f);
  const floor = gas.enthalpy(gas.minTemperature_K, f);
  const idealWork = efficiency.kind === "isentropic" ? specificWork_J_kg / efficiency.value : specificWork_J_kg;
  if (hIn - idealWork <= floor) return { outletTemperature_K: gas.minTemperature_K, pressureRatio: 0 };

  const guess = inlet_K - specificWork_J_kg / gas.cp(inlet_K, f);
  const outlet = temperatureFromEnthalpy(gas, hIn - specificWork_J_kg, f, guess);
  if (efficiency.kind === "polytropic") {
    const ratio = Math.exp((gas.entropyFunction(outlet, f) - phiIn) / (R * efficiency.value));
    return { outletTemperature_K: outlet, pressureRatio: ratio };
  }
  const idealOutlet = temperatureFromEnthalpy(gas, hIn - idealWork, f, outlet);
  return { outletTemperature_K: outlet, pressureRatio: Math.exp((gas.entropyFunction(idealOutlet, f) - phiIn) / R) };
}

/**
 * State of a gas of total temperature `total_K` brought isentropically to the speed
 * of sound: static temperature, velocity, and static over total pressure.
 */
export function sonicState(
  gas: GasModel,
  total_K: number,
  f: number,
): { readonly temperature_K: number; readonly velocity_m_s: number; readonly pressureRatio: number } {
  const R = gas.gasConstant(f);
  const hTotal = gas.enthalpy(total_K, f);
  // Energy: h(Tt) - h(T) = V^2 / 2, with V^2 = gamma R T at the speed of sound.
  let T = (2 * total_K) / (gamma(gas, total_K, f) + 1);
  for (let i = 0; i < 40; i++) {
    const g = gamma(gas, T, f);
    const residual = hTotal - gas.enthalpy(T, f) - 0.5 * g * R * T;
    const next = T + residual / (gas.cp(T, f) + 0.5 * g * R);
    if (Math.abs(next - T) <= 1e-13 * T) {
      T = next;
      break;
    }
    T = next;
  }
  return {
    temperature_K: T,
    velocity_m_s: Math.sqrt(gamma(gas, T, f) * R * T),
    pressureRatio: Math.exp((gas.entropyFunction(T, f) - gas.entropyFunction(total_K, f)) / R),
  };
}

/** Flow at the exit plane of a convergent nozzle. */
export interface NozzleFlow {
  /** True when the exit is sonic and its pressure stays above ambient. */
  readonly choked: boolean;
  /** Static temperature at the exit, K */
  readonly exitTemperature_K: number;
  /** Static pressure at the exit, Pa */
  readonly exitPressure_Pa: number;
  readonly exitVelocity_m_s: number;
  /** Mass flow per unit of exit area, kg/(s m2) */
  readonly massFlux_kg_s_m2: number;
}

/** Isentropic flow from total conditions through a convergent nozzle to ambient pressure. */
export function convergentNozzle(
  gas: GasModel,
  total_K: number,
  total_Pa: number,
  f: number,
  ambient_Pa: number,
): NozzleFlow {
  const R = gas.gasConstant(f);
  const sonic = sonicState(gas, total_K, f);
  const sonicPressure = total_Pa * sonic.pressureRatio;
  if (sonicPressure >= ambient_Pa) {
    return {
      choked: true,
      exitTemperature_K: sonic.temperature_K,
      exitPressure_Pa: sonicPressure,
      exitVelocity_m_s: sonic.velocity_m_s,
      massFlux_kg_s_m2: (sonicPressure / (R * sonic.temperature_K)) * sonic.velocity_m_s,
    };
  }
  if (total_Pa <= ambient_Pa) {
    return {
      choked: false,
      exitTemperature_K: total_K,
      exitPressure_Pa: ambient_Pa,
      exitVelocity_m_s: 0,
      massFlux_kg_s_m2: 0,
    };
  }
  const phiExit = gas.entropyFunction(total_K, f) + R * Math.log(ambient_Pa / total_Pa);
  const exit_K = temperatureFromEntropyFunction(gas, phiExit, f, sonic.temperature_K);
  const velocity = Math.sqrt(2 * (gas.enthalpy(total_K, f) - gas.enthalpy(exit_K, f)));
  return {
    choked: false,
    exitTemperature_K: exit_K,
    exitPressure_Pa: ambient_Pa,
    exitVelocity_m_s: velocity,
    massFlux_kg_s_m2: (ambient_Pa / (R * exit_K)) * velocity,
  };
}

/** Everything that fixes one operating point of the engine when its geometry is still free. */
export interface ReferenceInputs {
  readonly gas: GasModel;
  /** Ambient static pressure, Pa */
  readonly ambientPressure_Pa: number;
  /** Flight speed, m/s */
  readonly flightSpeed_m_s: number;
  /** Total temperature and pressure at the compressor face, after the intake */
  readonly inletTotalTemperature_K: number;
  readonly inletTotalPressure_Pa: number;
  /** Air mass flow through the compressor, kg/s */
  readonly airflow_kg_s: number;
  /** Compressor total-pressure ratio */
  readonly pressureRatio: number;
  /** Turbine inlet total temperature, K */
  readonly turbineInletTemperature_K: number;
  readonly compressorEfficiency: Efficiency;
  readonly turbineEfficiency: Efficiency;
  /** Fraction of the heating value that reaches the gas */
  readonly burnerEfficiency: number;
  /** Total pressure lost in the burner, as a fraction of its inlet pressure */
  readonly burnerPressureLoss: number;
  /** Fraction of the turbine work that reaches the compressor */
  readonly mechanicalEfficiency: number;
  /** Total pressure lost between turbine outlet and nozzle inlet, as a fraction */
  readonly tailpipePressureLoss: number;
  /** Actual over ideal exit velocity */
  readonly nozzleVelocityCoefficient: number;
  /** Actual over ideal mass flow for the geometric exit area */
  readonly nozzleDischargeCoefficient: number;
  /** Lower heating value of the fuel, J/kg */
  readonly fuelHeatingValue_J_kg: number;
}

/** The cycle at one operating point, and the two throat areas that pass its flow. */
export interface CyclePoint {
  readonly airflow_kg_s: number;
  readonly fuelAirRatio: number;
  readonly fuelFlow_kg_s: number;
  readonly compressorSpecificWork_J_kg: number;
  readonly compressorOutletTemperature_K: number;
  readonly compressorOutletPressure_Pa: number;
  readonly turbineInletPressure_Pa: number;
  readonly turbineOutletTemperature_K: number;
  readonly turbineOutletPressure_Pa: number;
  readonly nozzleInletPressure_Pa: number;
  readonly nozzle: NozzleFlow;
  /** Effective flow area of the choked turbine nozzle, m2 */
  readonly turbineThroatArea_m2: number;
  /** Geometric exit area of the exhaust nozzle, m2 */
  readonly nozzleArea_m2: number;
  /** Momentum and pressure thrust of the jet, N */
  readonly grossThrust_N: number;
  /** Gross thrust minus the momentum of the incoming air, N */
  readonly netThrust_N: number;
}

export type ReferenceResult =
  | { readonly ok: true; readonly point: CyclePoint }
  | { readonly ok: false; readonly reason: "turbine-cannot-drive-compressor" };

/**
 * Solves the cycle at a point where air flow, pressure ratio and turbine inlet
 * temperature are given, and sizes the turbine throat and the exhaust nozzle for it.
 * Fails when the turbine cannot take the compressor work from the gas and still
 * leave it above ambient pressure.
 */
export function solveReferencePoint(inputs: ReferenceInputs): ReferenceResult {
  const { gas } = inputs;
  const T4 = inputs.turbineInletTemperature_K;

  const compressor = compress(gas, inputs.inletTotalTemperature_K, inputs.pressureRatio, inputs.compressorEfficiency);
  const T3 = compressor.outletTemperature_K;
  const p3 = inputs.inletTotalPressure_Pa * inputs.pressureRatio;
  if (!(T4 > T3)) {
    throw new RangeError(`turbine inlet temperature ${T4} K is not above the compressor outlet, ${T3} K`);
  }

  // Burner energy balance, the form of equation 15 of NASA TM 78653 (PDF page 12).
  const f = gas.fuelAirRatioIncrement(T3, 0, T4, inputs.burnerEfficiency * inputs.fuelHeatingValue_J_kg);
  const p4 = p3 * (1 - inputs.burnerPressureLoss);

  // Shaft balance per kilogram of air: the turbine gas, 1 + f kilograms, drives the compressor.
  const turbineWork = compressor.specificWork_J_kg / (inputs.mechanicalEfficiency * (1 + f));
  const turbine = expandForWork(gas, T4, f, turbineWork, inputs.turbineEfficiency);
  const T5 = turbine.outletTemperature_K;
  const p5 = p4 * turbine.pressureRatio;
  const p7 = p5 * (1 - inputs.tailpipePressureLoss);
  if (!(p7 > inputs.ambientPressure_Pa)) return { ok: false, reason: "turbine-cannot-drive-compressor" };

  const gasFlow = inputs.airflow_kg_s * (1 + f);
  const nozzle = convergentNozzle(gas, T5, p7, f, inputs.ambientPressure_Pa);
  // UNVERIFIED: thrust as jet momentum plus exit pressure over the geometric area,
  // with the velocity coefficient on the momentum term and the discharge coefficient
  // on the mass flow. Standard form; to be checked against the definitions of the
  // J47 reports, which may place the coefficients differently.
  const nozzleArea = gasFlow / (inputs.nozzleDischargeCoefficient * nozzle.massFlux_kg_s_m2);
  const grossThrust =
    inputs.nozzleVelocityCoefficient * gasFlow * nozzle.exitVelocity_m_s +
    (nozzle.exitPressure_Pa - inputs.ambientPressure_Pa) * nozzleArea;

  // Choked turbine nozzle: W sqrt(T) / (A p) is fixed, equation 16 of NASA TM 78653 (PDF page 12).
  const throat = sonicState(gas, T4, f);
  const throatFlux = ((p4 * throat.pressureRatio) / (gas.gasConstant(f) * throat.temperature_K)) * throat.velocity_m_s;

  return {
    ok: true,
    point: {
      airflow_kg_s: inputs.airflow_kg_s,
      fuelAirRatio: f,
      fuelFlow_kg_s: inputs.airflow_kg_s * f,
      compressorSpecificWork_J_kg: compressor.specificWork_J_kg,
      compressorOutletTemperature_K: T3,
      compressorOutletPressure_Pa: p3,
      turbineInletPressure_Pa: p4,
      turbineOutletTemperature_K: T5,
      turbineOutletPressure_Pa: p5,
      nozzleInletPressure_Pa: p7,
      nozzle,
      turbineThroatArea_m2: gasFlow / throatFlux,
      nozzleArea_m2: nozzleArea,
      grossThrust_N: grossThrust,
      netThrust_N: grossThrust - inputs.airflow_kg_s * inputs.flightSpeed_m_s,
    },
  };
}
