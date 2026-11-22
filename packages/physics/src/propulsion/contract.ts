/**
 * Contract between the engine model (lane E) and anything that flies it (lane D).
 * Types only, SI units throughout. Only the PM changes this file (docs/PROCESS.md).
 *
 * Version 2, 2026-11-16 (gate 1 of lane E): the throttle is a shaft-speed demand,
 * `afterburnerLit` is new in `EngineOutput`, the direction of `thrust_N` is stated (engine axis,
 * not flight path), and the design signature is added at the end.
 *
 * The aircraft owns the fuel tank. The engine does not know how much fuel is left:
 * when the tank is empty the caller stops using the thrust and names the cause itself.
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
  /**
   * Shaft-speed demand: 0 is idle speed, 1 is 100 % speed, linear in between.
   * Thrust is not linear in it: at mid travel an engine gives well under half its dry thrust.
   * The engine clamps values outside 0 to 1.
   */
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
  /**
   * Net thrust, N: gross thrust minus the ram drag of the air the engine takes in.
   * It acts along the engine axis, which the caller takes as the body axis of the aircraft.
   */
  readonly thrust_N: number;
  /** Fuel mass flow, afterburner included, kg/s */
  readonly fuelFlow_kg_s: number;
  /**
   * True while the afterburner burns. False when it was not requested, when the engine has none,
   * and when it was requested but cannot stay lit: the limit "afterburner-blowout" then shows why.
   * An afterburner that is out is not a failure. The engine keeps running dry.
   */
  readonly afterburnerLit: boolean;
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

/*
 * Design signature. Lane E exports, from `propulsion/index.ts`:
 *   export const ENGINE_DESIGN_RANGES: EngineDesignRanges
 *   export const designEngine: DesignEngine
 */

/**
 * The four design decisions (docs/briefs/007-engine-workshop.md). They hold at the design point:
 * sea-level static on a standard day (101 325 Pa, 288.15 K, Mach 0), throttle 1, afterburner off.
 */
export interface EngineDesign {
  /** Air mass flow at the design point, kg/s */
  readonly designAirflow_kg_s: number;
  /** Compressor total-pressure ratio at the design point, dimensionless */
  readonly pressureRatio: number;
  /** Turbine inlet total temperature at the design point, K */
  readonly turbineInletTemperature_K: number;
  /** Whether the engine carries an afterburner */
  readonly afterburner: boolean;
}

/** Allowed range of one numeric decision. Values outside it are rejected. */
export interface DesignRange {
  readonly min: number;
  readonly max: number;
  readonly unit: string;
}

export interface EngineDesignRanges {
  readonly designAirflow_kg_s: DesignRange;
  readonly pressureRatio: DesignRange;
  readonly turbineInletTemperature_K: DesignRange;
}

/** Why a design cannot exist as an engine. */
export interface DesignRejection {
  /**
   * Stable kebab-case identifier: "decision-out-of-range", "turbine-cannot-drive-compressor"
   * or "limit-exceeded-at-idle".
   */
  readonly reasonId: string;
  /** The decision to change first, or null when no single one is to blame */
  readonly decision: "designAirflow_kg_s" | "pressureRatio" | "turbineInletTemperature_K" | "afterburner" | null;
  /** For "limit-exceeded-at-idle": the limit and where the design stands against it. Otherwise null. */
  readonly limit: EngineLimit | null;
}

/** A designed engine: the flight contract plus what the workshop shows. */
export interface DesignedEngine extends EngineModel {
  readonly design: EngineDesign;
  /** Compressor-face diameter, m */
  readonly diameter_m: number;
  /** Overall length, m */
  readonly length_m: number;
  readonly sizeEvidence: Evidence;
}

/** Either the engine or the reasons it cannot exist. A rejection always carries at least one reason. */
export type EngineDesignResult =
  | { readonly ok: true; readonly engine: DesignedEngine }
  | { readonly ok: false; readonly rejections: readonly [DesignRejection, ...DesignRejection[]] };

/** Type of the design function. Pure, and it never throws: the same design gives the same result. */
export type DesignEngine = (design: EngineDesign) => EngineDesignResult;
