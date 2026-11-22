/**
 * The General Electric J47 turbojet of the NACA Lewis altitude-wind-tunnel
 * investigation of 1949, and the engine model anchored on it.
 *
 * Sources, all NACA research memorandums on the same engine and test campaign:
 * - RM E9G09, Conrad and Sobolewski, over-all performance (NTRS 19930093773).
 * - RM E9G28, Prince and Jansen, compressor (NTRS 19930086062).
 * - RM E9L02, Campbell, combustion chamber (NTRS 19930086104).
 * - RM E9K10, Thorman and McAulay, turbine (NTRS 19930086035).
 * Page numbers below are pages of the PDF file, not printed page numbers.
 *
 * The model is anchored on one test run and predicts every other one. Nothing in
 * this file is fitted to more than that run: see docs/cp/007.md, "Decisiones
 * tomadas al leer los informes, antes de calcular".
 */

import { combustionGas, temperatureFromEnthalpy, type GasModel } from "./gas.ts";
import { buildHardware, solveOperatingPoint, type EngineHardware, type OperatingPoint, type Technology } from "./offdesign.ts";
import type { CyclePoint } from "./cycle.ts";
import {
  btuPerLbToJoulePerKg,
  lbPerHourToKgPerSecond,
  lbPerSecondToKgPerSecond,
  lbfToNewton,
  psfToPascal,
  rankineToKelvin,
  squareInchesToSquareMetres,
} from "./units.ts";

/** Rated shaft speed, rpm. Report text: RM E9G09, page 3. */
export const J47_RATED_SPEED_RPM = 7900;

/** Lowest shaft speed in the tabulated runs, rpm, taken as idle. Measured: RM E9G09, table I (pages 17 and 18). */
export const J47_LOWEST_TESTED_SPEED_RPM = 2046;

/**
 * Limiting turbine-outlet gas temperature, degrees Fahrenheit. Report text:
 * RM E9G09, page 3, and RM E9K10, page 4 ("the limiting turbine-outlet
 * temperature, 1275 F").
 */
export const J47_TURBINE_OUTLET_LIMIT_F = 1275;

/** Fuel of the tests. Report text: RM E9G09, page 5, and RM E9L02, page 14. */
export const J47_FUEL = {
  /** Lower heating value, Btu/lb */
  lowerHeatingValue_Btu_lb: 18550,
  /** Hydrogen-carbon ratio by mass */
  hydrogenCarbonRatio: 0.155,
} as const;

/** Standard exhaust nozzle. Report text: RM E9G09, pages 3 and 11. */
export const J47_NOZZLE = {
  /** Outlet area, cold, square inches */
  coldArea_sq_in: 280,
  /** Hot over cold area, at 1570 R */
  hotOverColdArea: 1.01,
} as const;

/** Size and weight. Report text: RM E9G09, page 3; compressor tip diameter from RM E9G28, page 5. */
export const J47_SIZE = {
  /** Over-all length without the exhaust nozzle, inches */
  length_in: 143,
  /** Maximum diameter, inches ("approximately") */
  maximumDiameter_in: 37,
  /** Outside diameter of the compressor blading, inches */
  compressorTipDiameter_in: 28.9,
  /** Total weight, pounds */
  weight_lb: 2475,
} as const;

/**
 * Figures the reports give in their text and the study quotes. None enters the model.
 */
export const J47_REPORT_TEXT = {
  /** RM E9G09, page 5: "Engine-inlet air temperatures below 439 R were unobtainable." */
  minimumInletTemperature_R: 439,
  /** RM E9G09, page 14: air flow by three methods "agreed within 3 percent". */
  airFlowAgreement_percent: 3,
  /** RM E9G28, page 3: maximum compressor efficiency "approximately 87 percent", at a corrected speed "of about 6300 rpm". */
  compressorPeakEfficiency_percent: 87,
  compressorPeakEfficiencySpeed_rpm: 6300,
  /** RM E9G28, page 11: at rated speed, "from 5000 to 50,000 feet decreased the compressor efficiency from 79 to 72 percent". */
  compressorEfficiencyAtRatedSpeed5000ft_percent: 79,
  compressorEfficiencyAtRatedSpeed50000ft_percent: 72,
  /** RM E9L02, page 6: combustion efficiency "accurate to approximately +-0.04". */
  combustionEfficiencyAccuracy: 0.04,
  /** RM E9K10, page 5: maximum error in turbine efficiency "from +-3 percent at high pressure levels to +-8 percent at low". */
  turbineEfficiencyMaximumErrorHighPressure_percent: 3,
  turbineEfficiencyMaximumErrorLowPressure_percent: 8,
  /**
   * RM E9G09, page 3: at 25,000 feet the internal drag of the windmilling engine "varied from 2 percent of the
   * available net thrust at a true airspeed of 200 miles per hour to 15 percent at ... 650 miles per hour".
   */
  windmillingDragAt200mph_percent: 2,
  windmillingDragAt650mph_percent: 15,
} as const;

/** Sea-level static rating. Report text: RM E9G09, page 3, and RM E9L02, page 3 (fuel). Not used by the model. */
export const J47_RATING = {
  thrust_lbf: 5000,
  airFlow_lb_s: 94,
  pressureRatio: 5.1,
  fuelFlow_lb_h: 5250,
} as const;

/**
 * The anchor: run 1 of the standard-nozzle tests, 5000 ft, Mach 0.23, 7895 rpm,
 * in report units. Every value is `measured` and is a row of
 * packages/physics/data/engines/j47/ (a test checks they agree).
 */
export const J47_ANCHOR_REPORT_UNITS = {
  /** RM E9G09, table I, page 17 */
  tunnelStaticPressure_psf: 1740,
  flightMach: 0.23,
  equivalentAmbientTemperature_R: 507,
  engineSpeed_rpm: 7895,
  airFlow_lb_s: 81.08,
  fuelFlow_lb_h: 5300,
  jetThrust_lbf: 4880,
  /** Nozzle total pressure over engine-inlet total pressure, P7/P1 */
  engineTotalPressureRatio: 1.865,
  /** RM E9G28, table I, pages 14 and 15 */
  engineInletTotalPressure_psf: 1806,
  engineInletTotalTemperature_R: 512,
  compressorOutletTotalPressure_psf: 9339,
  compressorOutletTotalTemperature_R: 902,
  /** RM E9K10, table I, pages 18 and 19 */
  turbineInletTotalPressure_psf: 8977,
  turbineOutletTotalPressure_psf: 3465,
  turbineOutletTotalTemperature_R: 1740,
} as const;

/** What the reports tabulate for the anchor run and the model recomputes. Checks only, never inputs. */
export const J47_ANCHOR_REPORTED = {
  /** RM E9G28, table I: adiabatic compressor efficiency, percent */
  compressorEfficiency_percent: 78.8,
  /** RM E9L02, table I: combustion efficiency, and the measured over-all total-pressure-loss ratio of the chamber */
  combustionEfficiency: 0.952,
  burnerPressureLossRatio: 0.0388,
  /** RM E9K10, table I: adiabatic turbine efficiency, and turbine-inlet temperature from the work balance */
  turbineEfficiency: 0.798,
  turbineInletTotalTemperature_R: 2080,
  /** RM E9K10, table I: air bled from the compressor, lb/s. The model carries no bleed. */
  compressorLeakageAirFlow_lb_s: 1.74,
  turbineCoolingAirFlow_lb_s: 0.42,
} as const;

/** The measured state of one run, in SI, that anchors an engine. */
export interface AnchorState {
  readonly ambientPressure_Pa: number;
  readonly inletTotalPressure_Pa: number;
  readonly inletTotalTemperature_K: number;
  readonly airflow_kg_s: number;
  readonly fuelFlow_kg_s: number;
  readonly jetThrust_N: number;
  readonly compressorOutletPressure_Pa: number;
  readonly compressorOutletTemperature_K: number;
  readonly turbineInletPressure_Pa: number;
  readonly turbineOutletPressure_Pa: number;
  readonly turbineOutletTemperature_K: number;
  readonly nozzleInletPressure_Pa: number;
  readonly fuelHeatingValue_J_kg: number;
  /** Hydrogen mass fraction of the fuel */
  readonly fuelHydrogenMassFraction: number;
}

/** The anchor run in SI. */
export function j47AnchorState(): AnchorState {
  const a = J47_ANCHOR_REPORT_UNITS;
  const inletTotalPressure_Pa = psfToPascal(a.engineInletTotalPressure_psf);
  return {
    ambientPressure_Pa: psfToPascal(a.tunnelStaticPressure_psf),
    inletTotalPressure_Pa,
    inletTotalTemperature_K: rankineToKelvin(a.engineInletTotalTemperature_R),
    airflow_kg_s: lbPerSecondToKgPerSecond(a.airFlow_lb_s),
    fuelFlow_kg_s: lbPerHourToKgPerSecond(a.fuelFlow_lb_h),
    jetThrust_N: lbfToNewton(a.jetThrust_lbf),
    compressorOutletPressure_Pa: psfToPascal(a.compressorOutletTotalPressure_psf),
    compressorOutletTemperature_K: rankineToKelvin(a.compressorOutletTotalTemperature_R),
    turbineInletPressure_Pa: psfToPascal(a.turbineInletTotalPressure_psf),
    turbineOutletPressure_Pa: psfToPascal(a.turbineOutletTotalPressure_psf),
    turbineOutletTemperature_K: rankineToKelvin(a.turbineOutletTotalTemperature_R),
    nozzleInletPressure_Pa: inletTotalPressure_Pa * a.engineTotalPressureRatio,
    fuelHeatingValue_J_kg: btuPerLbToJoulePerKg(J47_FUEL.lowerHeatingValue_Btu_lb),
    fuelHydrogenMassFraction: J47_FUEL.hydrogenCarbonRatio / (1 + J47_FUEL.hydrogenCarbonRatio),
  };
}

/** An engine sized on a measured state, and what was computed from that state to size it. */
export interface AnchoredEngine {
  readonly gas: GasModel;
  readonly hardware: EngineHardware;
  /** The cycle at the anchor as the model reproduces it */
  readonly point: CyclePoint;
  /** Turbine inlet total temperature from the shaft balance, K. Nobody measured it. */
  readonly turbineInletTemperature_K: number;
  readonly burnerPressureLoss: number;
  readonly tailpipePressureLoss: number;
  /** Adiabatic efficiencies with the model's gas, to set against the ones the reports tabulate */
  readonly compressorIsentropicEfficiency: number;
  readonly turbineIsentropicEfficiency: number;
}

/**
 * Sizes an engine on a measured state: turbine-outlet temperature closes the
 * cycle, the shaft balance gives the turbine inlet temperature, and each
 * efficiency and loss is the one that makes the model reproduce the measured
 * pressures, temperatures, fuel flow and jet thrust of that state.
 * Mechanical efficiency is 1: no accessory power or bearing friction, as in the
 * work balance of RM E9K10 (page 16).
 */
export function anchorEngine(state: AnchorState): AnchoredEngine {
  const gas = combustionGas({ hydrogenMassFraction: state.fuelHydrogenMassFraction });
  const T1 = state.inletTotalTemperature_K;
  const T3 = state.compressorOutletTemperature_K;
  const T5 = state.turbineOutletTemperature_K;
  const airGasConstant = gas.gasConstant(0);

  const pressureRatio = state.compressorOutletPressure_Pa / state.inletTotalPressure_Pa;
  const compressorWork = gas.enthalpy(T3, 0) - gas.enthalpy(T1, 0);
  const compressorEntropyRise = gas.entropyFunction(T3, 0) - gas.entropyFunction(T1, 0);
  const compressorPolytropicEfficiency = (airGasConstant * Math.log(pressureRatio)) / compressorEntropyRise;
  const idealT3 = temperatureFromEntropyRise(gas, T1, 0, airGasConstant * Math.log(pressureRatio));
  const compressorIsentropicEfficiency = (gas.enthalpy(idealT3, 0) - gas.enthalpy(T1, 0)) / compressorWork;

  const f = state.fuelFlow_kg_s / state.airflow_kg_s;
  const gasConstant = gas.gasConstant(f);
  const turbineWork = compressorWork / (1 + f);
  const T4 = temperatureFromEnthalpy(gas, gas.enthalpy(T5, f) + turbineWork, f, T5 + turbineWork / gas.cp(T5, f));
  const burnerEfficiency =
    ((1 + f) * gas.enthalpy(T4, f) - gas.enthalpy(T3, 0)) / (f * state.fuelHeatingValue_J_kg);
  const turbineLogRatio = Math.log(state.turbineOutletPressure_Pa / state.turbineInletPressure_Pa);
  const turbinePolytropicEfficiency = (gas.entropyFunction(T5, f) - gas.entropyFunction(T4, f)) / (gasConstant * turbineLogRatio);
  const idealT5 = temperatureFromEntropyRise(gas, T4, f, gasConstant * turbineLogRatio);
  const turbineIsentropicEfficiency = turbineWork / (gas.enthalpy(T4, f) - gas.enthalpy(idealT5, f));

  const burnerPressureLoss = 1 - state.turbineInletPressure_Pa / state.compressorOutletPressure_Pa;
  const tailpipePressureLoss = 1 - state.nozzleInletPressure_Pa / state.turbineOutletPressure_Pa;

  const technology: Technology = {
    gas,
    fuelHeatingValue_J_kg: state.fuelHeatingValue_J_kg,
    compressorPolytropicEfficiency,
    turbinePolytropicEfficiency,
    burnerEfficiency,
    mechanicalEfficiency: 1,
    nozzleThrustCoefficient: 1,
  };
  const reference = {
    ambientPressure_Pa: state.ambientPressure_Pa,
    inletTotalTemperature_K: T1,
    inletTotalPressure_Pa: state.inletTotalPressure_Pa,
    airflow_kg_s: state.airflow_kg_s,
    pressureRatio,
    turbineInletTemperature_K: T4,
    burnerPressureLoss,
    tailpipePressureLoss,
  };
  // First with a thrust coefficient of 1, to get the ideal jet thrust; then with the measured one.
  const ideal = buildHardware(technology, reference);
  if (!ideal.ok) throw new RangeError(`the anchor state is not a running engine: ${ideal.reason}`);
  const anchored = buildHardware(
    { ...technology, nozzleThrustCoefficient: state.jetThrust_N / ideal.point.grossThrust_N },
    reference,
  );
  if (!anchored.ok) throw new RangeError(`the anchor state is not a running engine: ${anchored.reason}`);
  return {
    gas,
    hardware: anchored.hardware,
    point: anchored.point,
    turbineInletTemperature_K: T4,
    burnerPressureLoss,
    tailpipePressureLoss,
    compressorIsentropicEfficiency,
    turbineIsentropicEfficiency,
  };
}

/** Temperature reached from `from_K` by an isentropic change whose entropy-function rise is given. */
function temperatureFromEntropyRise(gas: GasModel, from_K: number, f: number, rise_J_kg_K: number): number {
  // Newton's method on d(phi)/dT = Cp / T, as in gas.ts, inlined to keep that module's interface small.
  const target = gas.entropyFunction(from_K, f) + rise_J_kg_K;
  let T = from_K * Math.exp(rise_J_kg_K / gas.cp(from_K, f));
  for (let i = 0; i < 40; i++) {
    const next = T - ((gas.entropyFunction(T, f) - target) * T) / gas.cp(T, f);
    if (Math.abs(next - T) <= 1e-13 * T) return next;
    T = next;
  }
  return T;
}

let cached: AnchoredEngine | null = null;

/** The J47 of the tests, anchored on run 1. Computed once. */
export function j47Engine(): AnchoredEngine {
  cached ??= anchorEngine(j47AnchorState());
  return cached;
}

/** Shaft speed of the J47, as the fraction of the anchor speed that `solveOperatingPoint` takes. */
export function j47SpeedFraction(speed_rpm: number): number {
  return speed_rpm / J47_ANCHOR_REPORT_UNITS.engineSpeed_rpm;
}

/** Geometric hot area of the standard nozzle, m2. Report text. */
export function j47NozzleHotArea_m2(): number {
  return squareInchesToSquareMetres(J47_NOZZLE.coldArea_sq_in * J47_NOZZLE.hotOverColdArea);
}

/** NACA standard sea-level static conditions, the design point of the player's engine. */
export const SEA_LEVEL_STATIC = { pressure_Pa: 101325, temperature_K: 288.15 } as const;

/** The anchored J47 at sea-level static and rated speed. Computed: the tunnel did not test there. */
export function j47AtSeaLevelStatic(engine: AnchoredEngine = j47Engine()): OperatingPoint {
  const solved = solveOperatingPoint(engine.hardware, {
    ambientPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
    inletTotalPressure_Pa: SEA_LEVEL_STATIC.pressure_Pa,
    inletTotalTemperature_K: SEA_LEVEL_STATIC.temperature_K,
    flightSpeed_m_s: 0,
    speedFraction: j47SpeedFraction(J47_RATED_SPEED_RPM),
  });
  if (!solved.ok) throw new RangeError("the anchored J47 has no running point at sea-level static");
  return solved.point;
}
