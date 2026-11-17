/**
 * Contract between the engine model (lane E) and anything that flies it (lane D).
 * Types only, SI units throughout. Only the PM changes this file (docs/PROCESS.md).
 */

/** Ambient air at the aircraft. The caller owns the atmosphere model. */
export interface AmbientAir {
  /** Static pressure, Pa */
  readonly pressure_Pa: number;
  /** Static temperature, K */
  readonly temperature_K: number;
}

export interface FlightCondition {
  readonly ambient: AmbientAir;
  /** Flight Mach number, 0 or more */
  readonly mach: number;
}

/** What the pilot asks of the engine. */
export interface EngineCommand {
  /** 0 is idle, 1 is maximum thrust without afterburner */
  readonly throttle: number;
  /** Afterburner requested. An engine without one ignores it. */
  readonly afterburner: boolean;
}

/**
 * How far a value is backed by measurement.
 * "validated": the model was compared with measured data in this range (docs/PROCESS.md, evidence rules).
 * "estimated": outside that range, or no measured data exists.
 */
export type Evidence = "validated" | "estimated";

/** One physical limit of the engine and where the engine stands against it. */
export interface EngineLimit {
  /** Stable kebab-case identifier, for example "turbine-inlet-temperature" */
  readonly id: string;
  /** Current value, in `unit` */
  readonly value: number;
  /** The limit, in `unit` */
  readonly limit: number;
  /** Unit of `value` and `limit`, for example "K" */
  readonly unit: string;
  /** 0 is far from the limit, 1 is at the limit, above 1 is beyond it */
  readonly fraction: number;
}

export interface EngineFailure {
  /** The `id` of the limit whose violation destroyed or stopped the engine */
  readonly limitId: string;
}

export interface EngineOutput {
  /** Net thrust along the flight path, N */
  readonly thrust_N: number;
  /** Fuel mass flow, afterburner included, kg/s */
  readonly fuelFlow_kg_s: number;
  readonly limits: readonly EngineLimit[];
  /** null while the engine runs. Once set it stays set, and thrust and fuel flow are 0. */
  readonly failure: EngineFailure | null;
  readonly evidence: Evidence;
}

/** Whatever the model integrates in time (damage, rotor speed). Opaque to the caller. */
export type EngineState = Readonly<Record<string, number>>;

export interface EngineStep {
  readonly state: EngineState;
  readonly output: EngineOutput;
}

export interface EngineModel {
  /** Stable identifier of this design, shown in the flight report */
  readonly id: string;
  /** Dry mass of the engine, kg */
  readonly mass_kg: number;
  readonly massEvidence: Evidence;
  initialState(): EngineState;
  /** Advances the engine by `dt_s` seconds. Pure: the same inputs give the same result. */
  step(state: EngineState, command: EngineCommand, condition: FlightCondition, dt_s: number): EngineStep;
}
