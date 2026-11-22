/**
 * The engine the flight model flies: the contract of contract.ts around the
 * off-design solver.
 *
 * `step` never throws. A condition the gas model cannot represent stops the
 * engine with a failure that names its identifier ("gas-model-range"), and so
 * does anything unexpected inside the cycle. The flight model never sees an
 * exception from the engine.
 */

import type {
  EngineCommand,
  EngineFailure,
  EngineLimit,
  EngineOutput,
  EngineState,
  EngineStep,
  Evidence,
  FlightCondition,
} from "./contract.ts";
import { convergentNozzle, jetThrust } from "./cycle.ts";
import { gamma, temperatureFromEnthalpy, type GasModel } from "./gas.ts";
import {
  GAS_MODEL_RANGE_LIMIT_ID,
  TURBINE_INLET_TEMPERATURE_LIMIT_ID,
  overheatAfter,
  turbineHasFailed,
  turbineLimitStatus,
  type TurbineTemperatureLimit,
} from "./limits.ts";
import { solveOperatingPoint, type EngineHardware, type OperatingPoint } from "./offdesign.ts";

/** An afterburner and its variable nozzle. Every number of it is ESTIMATED in version 0. */
export interface AfterburnerSpec {
  /** Total temperature the afterburner heats the gas to, K */
  readonly outletTemperature_K: number;
  /** Fraction of the heating value that reaches the gas */
  readonly efficiency: number;
  /** Total pressure lost in the lit afterburner, as a fraction */
  readonly pressureLoss: number;
}

/**
 * Afterburner, version 0. ESTIMATED, no source yet: the J47 afterburner reports
 * (NACA RM E50G13, RM E53F10) belong to gate 3. The outlet temperature is kept
 * at 1900 K because the gas model has no dissociation above about that. The
 * nozzle is the ideal variable one: it opens just enough for the turbine not to
 * notice the afterburner.
 */
export const AFTERBURNER_V0: AfterburnerSpec = {
  outletTemperature_K: 1900,
  efficiency: 0.9,
  pressureLoss: 0.05,
};

/** Everything `createEngineStepper` needs to know about one engine. */
export interface EngineDefinition {
  readonly hardware: EngineHardware;
  /** Shaft speed at throttle 0 and at throttle 1, as fractions of the speed at the hardware's reference point */
  readonly idleSpeedFraction: number;
  readonly fullSpeedFraction: number;
  readonly turbineLimit: TurbineTemperatureLimit;
  readonly afterburner: AfterburnerSpec | null;
  /** Evidence of the output at a flight condition and a shaft speed, as a fraction of the speed at throttle 1 */
  readonly evidence: (condition: FlightCondition, speedFractionOfFull: number, afterburnerLit: boolean) => Evidence;
}

/** Codes of `state.failure`. 0 is a running engine. */
const FAILURE_IDS: readonly (string | null)[] = [null, TURBINE_INLET_TEMPERATURE_LIMIT_ID, GAS_MODEL_RANGE_LIMIT_ID];
const TURBINE_FAILURE = 1;
const GAS_RANGE_FAILURE = 2;

/**
 * Intake pressure recovery: total pressure at the compressor face over free-stream
 * total pressure. Complete below Mach 1. Above it, ESTIMATED and
 * UNVERIFIED: the standard military recovery schedule, 1 - 0.075 (M - 1)^1.35,
 * written from memory and not yet read in an open source.
 */
export function intakeRecovery(mach: number): number {
  if (!(mach > 1)) return 1;
  return Math.max(0.01, 1 - 0.075 * (mach - 1) ** 1.35);
}

/** Total conditions at the compressor face in flight, or null where the gas model has no data. */
export function flightInlet(
  gas: GasModel,
  condition: FlightCondition,
): { readonly totalTemperature_K: number; readonly totalPressure_Pa: number; readonly speed_m_s: number } | null {
  const pressure = condition.ambient.pressure_Pa;
  const temperature = condition.ambient.temperature_K;
  if (!Number.isFinite(pressure) || !(pressure > 0)) return null;
  if (!Number.isFinite(temperature) || !(temperature >= gas.minTemperature_K) || !(temperature <= gas.maxTemperature_K)) {
    return null;
  }
  if (Number.isNaN(condition.mach) || condition.mach === Number.POSITIVE_INFINITY) return null;
  const mach = Math.max(0, condition.mach);
  const speed = mach * Math.sqrt(gamma(gas, temperature, 0) * gas.gasConstant(0) * temperature);
  const totalEnthalpy = gas.enthalpy(temperature, 0) + 0.5 * speed * speed;
  if (!(totalEnthalpy < gas.enthalpy(gas.maxTemperature_K, 0))) return null;
  const totalTemperature = temperatureFromEnthalpy(gas, totalEnthalpy, 0, temperature * (1 + 0.2 * mach * mach));
  const isentropicRatio = Math.exp(
    (gas.entropyFunction(totalTemperature, 0) - gas.entropyFunction(temperature, 0)) / gas.gasConstant(0),
  );
  return {
    totalTemperature_K: totalTemperature,
    totalPressure_Pa: pressure * isentropicRatio * intakeRecovery(mach),
    speed_m_s: speed,
  };
}

/** Thrust and fuel flow with the afterburner lit, or null where it cannot burn. */
function afterburning(
  hardware: EngineHardware,
  spec: AfterburnerSpec,
  point: OperatingPoint,
  ambient_Pa: number,
  flightSpeed_m_s: number,
): { readonly netThrust_N: number; readonly fuelFlow_kg_s: number } | null {
  const tech = hardware.technology;
  const gas = tech.gas;
  if (!(spec.outletTemperature_K > point.turbineOutletTemperature_K)) return null;
  const added = gas.fuelAirRatioIncrement(
    point.turbineOutletTemperature_K,
    point.fuelAirRatio,
    spec.outletTemperature_K,
    spec.efficiency * tech.fuelHeatingValue_J_kg,
  );
  const f = point.fuelAirRatio + added;
  if (!(added > 0) || !(f < 0.98 * gas.stoichiometricFuelAirRatio)) return null;
  const totalPressure = point.nozzleInletPressure_Pa * (1 - spec.pressureLoss);
  if (!(totalPressure > ambient_Pa)) return null;
  const nozzle = convergentNozzle(gas, spec.outletTemperature_K, totalPressure, f, ambient_Pa);
  if (!(nozzle.massFlux_kg_s_m2 > 0)) return null;
  const gasFlow = point.airflow_kg_s * (1 + f);
  // The variable nozzle takes whatever area passes the hotter flow at the same turbine back pressure.
  const area = gasFlow / nozzle.massFlux_kg_s_m2;
  const gross = jetThrust(tech.nozzleThrustCoefficient, gasFlow, nozzle, area, ambient_Pa);
  return { netThrust_N: gross - point.airflow_kg_s * flightSpeed_m_s, fuelFlow_kg_s: point.airflow_kg_s * f };
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** The two functions of the contract that depend on time, for one engine. */
export function createEngineStepper(definition: EngineDefinition): {
  initialState(): EngineState;
  step(state: EngineState, command: EngineCommand, condition: FlightCondition, dt_s: number): EngineStep;
} {
  const { hardware, turbineLimit } = definition;
  const gas = hardware.technology.gas;

  const stopped = (failureCode: number, overheat_K_s: number, lastTurbineInlet_K: number): EngineStep => {
    const limitId = FAILURE_IDS[failureCode] ?? null;
    const failure: EngineFailure | null = limitId === null ? null : { limitId };
    const limits: readonly EngineLimit[] = [turbineLimitStatus(lastTurbineInlet_K, turbineLimit)];
    const output: EngineOutput = {
      thrust_N: 0,
      fuelFlow_kg_s: 0,
      afterburnerLit: false,
      limits,
      failure,
      evidence: "estimated",
    };
    return {
      state: { failure: failureCode, turbineOverheat_K_s: overheat_K_s, turbineInletTemperature_K: lastTurbineInlet_K },
      output,
    };
  };

  const advance = (state: EngineState, command: EngineCommand, condition: FlightCondition, dt_s: number): EngineStep => {
    const overheat = Math.max(0, finiteOr(state?.turbineOverheat_K_s, 0));
    const lastTurbineInlet = Math.max(0, finiteOr(state?.turbineInletTemperature_K, 0));
    const failureCode = finiteOr(state?.failure, 0);
    // A failure, once set, stays set.
    if (failureCode === TURBINE_FAILURE || failureCode === GAS_RANGE_FAILURE) {
      return stopped(failureCode, overheat, lastTurbineInlet);
    }

    const inlet = flightInlet(gas, condition);
    if (inlet === null) return stopped(GAS_RANGE_FAILURE, overheat, lastTurbineInlet);

    const throttle = Math.min(1, Math.max(0, finiteOr(command?.throttle, 0)));
    const speedFractionOfFull = definition.idleSpeedFraction + (1 - definition.idleSpeedFraction) * throttle;
    const solved = solveOperatingPoint(hardware, {
      ambientPressure_Pa: condition.ambient.pressure_Pa,
      inletTotalPressure_Pa: inlet.totalPressure_Pa,
      inletTotalTemperature_K: inlet.totalTemperature_K,
      flightSpeed_m_s: inlet.speed_m_s,
      speedFraction: speedFractionOfFull * definition.fullSpeedFraction,
    });
    // No running point: the engine gives no thrust and burns no fuel here. It is not a failure.
    if (!solved.ok) return stopped(0, overheat, inlet.totalTemperature_K);

    const point = solved.point;
    const T4 = point.turbineInletTemperature_K;
    const newOverheat = overheatAfter(overheat, T4, turbineLimit, dt_s);
    if (turbineHasFailed(newOverheat, T4, turbineLimit)) return stopped(TURBINE_FAILURE, newOverheat, T4);

    const lit =
      definition.afterburner !== null && command?.afterburner === true
        ? afterburning(hardware, definition.afterburner, point, condition.ambient.pressure_Pa, inlet.speed_m_s)
        : null;
    const thrust = lit ? lit.netThrust_N : point.netThrust_N;
    const fuelFlow = lit ? lit.fuelFlow_kg_s : point.fuelFlow_kg_s;
    if (!Number.isFinite(thrust) || !Number.isFinite(fuelFlow)) return stopped(GAS_RANGE_FAILURE, overheat, lastTurbineInlet);

    return {
      state: { failure: 0, turbineOverheat_K_s: newOverheat, turbineInletTemperature_K: T4 },
      output: {
        thrust_N: thrust,
        fuelFlow_kg_s: fuelFlow,
        afterburnerLit: lit !== null,
        limits: [turbineLimitStatus(T4, turbineLimit)],
        failure: null,
        evidence: definition.evidence(condition, speedFractionOfFull, lit !== null),
      },
    };
  };

  return {
    initialState: () => ({ failure: 0, turbineOverheat_K_s: 0, turbineInletTemperature_K: 0 }),
    step: (state, command, condition, dt_s) => {
      try {
        return advance(state, command, condition, dt_s);
      } catch {
        // Nothing inside the cycle may reach the flight model as an exception.
        return stopped(GAS_RANGE_FAILURE, Math.max(0, finiteOr(state?.turbineOverheat_K_s, 0)), 0);
      }
    },
  };
}
