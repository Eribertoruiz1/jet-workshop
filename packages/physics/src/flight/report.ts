/**
 * Figures of the hangar and the flight report, computed by the model.
 */

import { STALL_WARNING_SPEED_MARGIN } from "./aero.ts";
import type { Aircraft } from "./aircraft.ts";
import { atmosphere, G0 } from "./atmosphere.ts";
import { DT, speedForLift, type FlightState, type Outcome } from "./model.ts";
import { PLACEHOLDER_ID } from "./placeholder-engine.ts";
import type { EngineState } from "../propulsion/contract.ts";

/**
 * Estimated take-off speed of the hangar: the speed at which the wing carries
 * the weight at sea level with the stall warning just starting, CL_max / 1.05^2
 * (see STALL_WARNING_SPEED_MARGIN). Slower than this, a lift-off is a stall.
 */
export function estimatedTakeoffSpeed(ac: Aircraft, mass_kg: number): number {
  const m2 = STALL_WARNING_SPEED_MARGIN * STALL_WARNING_SPEED_MARGIN;
  return speedForLift(ac, mass_kg, 0, (m) => ac.aerodynamics(m, 0, 1e7).lift.clMax / m2);
}

/** Excess of thrust along the path over drag in level flight (lift equal to weight), N; null where the wing cannot carry the weight. */
export function levelFlightExcess(ac: Aircraft, mass_kg: number, height_m: number, mach: number, engine: EngineState, throttle = 1, afterburner = false): number | null {
  const air = atmosphere(height_m);
  const v = mach * air.speedOfSound_m_s;
  const q = 0.5 * air.density_kg_m3 * v * v;
  const cl = (mass_kg * G0) / (q * ac.wingArea_m2);
  const probe = ac.aerodynamics(mach, 0, 1e7).lift;
  if (cl > probe.clMax) return null;
  const alpha = probe.alpha0 + cl / probe.slope;
  const a = ac.aerodynamics(mach, alpha, (air.density_kg_m3 * v) / air.viscosity_Pa_s);
  const out = ac.engine.step(engine, { throttle, afterburner }, { ambient: { pressure_Pa: air.pressure_Pa, temperature_K: air.temperature_K }, mach }, DT).output;
  const thrust = out.failure ? 0 : out.thrust_N;
  return thrust * Math.cos(alpha) - q * ac.wingArea_m2 * a.drag.cd;
}

/** Highest Mach number searched for the level-flight balance of thrust and drag. */
export const TOP_MACH_SEARCH_LIMIT = 3;

/**
 * Highest Mach number at which full-throttle thrust still balances drag in
 * level flight, at a height and mass: the top speed of the aircraft there.
 * Null if thrust never reaches drag (or exceeds it up to the search limit).
 */
export function levelFlightTopMach(ac: Aircraft, mass_kg: number, height_m: number, engine: EngineState, afterburner = false): number | null {
  const excess = (m: number): number | null => levelFlightExcess(ac, mass_kg, height_m, m, engine, 1, afterburner);
  const step = 0.005;
  let hi = TOP_MACH_SEARCH_LIMIT;
  const top = excess(hi);
  if (top !== null && top >= 0) return null;
  for (let m = hi - step; m > step / 2; m -= step) {
    const e = excess(m);
    if (e === null) return null;
    if (e >= 0) {
      let lo = m;
      for (let i = 0; i < 50; i++) {
        const mid = (lo + hi) / 2;
        const em = excess(mid);
        if (em !== null && em >= 0) lo = mid;
        else hi = mid;
      }
      return lo;
    }
    hi = m;
  }
  return null;
}

export interface FlightReport {
  readonly outcome: Outcome;
  readonly maxMach: number;
  readonly supersonic: boolean;
  /**
   * For a flight that stayed below Mach 1: the level-flight Mach number at
   * full throttle where drag equals thrust, at the height and mass of its top
   * speed. Below 1, the aircraft could not go supersonic there.
   */
  readonly dragEqualsThrustMach: number | null;
  /** Fuel left over fuel loaded */
  readonly fuelLeftFraction: number;
  readonly maxHeight_m: number;
  readonly flightTime_s: number;
  readonly engineId: string;
  readonly provisionalEngine: boolean;
}

export function flightReport(s: FlightState, ac: Aircraft): FlightReport | null {
  if (!s.outcome) return null;
  const r = s.records;
  const supersonic = r.maxMach > 1;
  return {
    outcome: s.outcome,
    maxMach: r.maxMach,
    supersonic,
    dragEqualsThrustMach: supersonic ? null : levelFlightTopMach(ac, r.maxMachMass_kg, r.maxMachHeight_m, s.engine),
    fuelLeftFraction: s.initialFuel_kg > 0 ? s.fuel_kg / s.initialFuel_kg : 0,
    maxHeight_m: r.maxHeight_m,
    flightTime_s: r.liftoff === null ? 0 : s.outcome.t - r.liftoff.t,
    engineId: ac.engine.id,
    provisionalEngine: ac.engine.id === PLACEHOLDER_ID,
  };
}
