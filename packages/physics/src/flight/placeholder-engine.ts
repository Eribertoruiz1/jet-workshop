/**
 * The provisional engine of brief 006, until lane E delivers its own: a
 * chosen static thrust that falls with air density, and fuel flow
 * proportional to thrust. It implements the engine contract
 * (packages/physics/src/propulsion/contract.ts), so the flight model only
 * ever talks to `EngineModel`. Identifier `placeholder`, class `estimated`.
 *
 *   T = T_static * throttle * rho / rho_0
 *   fuel flow = TSFC * T
 *   mass = T_static / (g0 * engine thrust-to-weight ratio)
 *
 * It has no afterburner (`afterburnerLit` is always false), no limits and
 * never fails. Thrust does not change with Mach number at a given density
 * (no ram effect): a declared simplification.
 *
 * Contract version 2 makes the throttle a shaft-speed demand, with thrust not
 * linear in it. This provisional engine has no shaft: it keeps thrust linear
 * in the demand, a declared simplification. Lane E's engine brings the real
 * relation.
 */

import type { EngineModel, EngineOutput, EngineStep } from "../propulsion/contract.ts";
import { G0, R_AIR, SEA_LEVEL_DENSITY } from "./atmosphere.ts";
import { KG_PER_LB, N_PER_LBF } from "./units.ts";

/**
 * Thrust-specific fuel consumption, kg/(N s): 1.014 lb of fuel per lbf of
 * thrust per hour, the J47-GE-27 turbojet (the development engine of
 * decision 0006). Source: Wikipedia, "General Electric J47",
 * Specifications (J47-GE-27), read on 16 November 2026. `report text` of a
 * secondary source; the NACA reports of decision 0006 are lane E's.
 */
export const PLACEHOLDER_TSFC = (1.014 * KG_PER_LB) / (N_PER_LBF * 3600);

/** Thrust-to-weight ratio of the bare engine: J47-GE-27, 5970 lbf for 2554 lb dry (same source). */
export const PLACEHOLDER_THRUST_TO_WEIGHT = 5970 / 2554;

export const PLACEHOLDER_ID = "placeholder";

export interface PlaceholderDesign {
  /** Sea-level static thrust at full throttle, N */
  readonly staticThrust_N: number;
}

export function makePlaceholderEngine(d: PlaceholderDesign): EngineModel {
  if (!(d.staticThrust_N >= 0)) throw new RangeError("static thrust must not be negative");
  const mass = d.staticThrust_N / (G0 * PLACEHOLDER_THRUST_TO_WEIGHT);
  const state = Object.freeze({});
  return {
    id: PLACEHOLDER_ID,
    mass_kg: mass,
    massEvidence: "estimated",
    initialState: () => state,
    step(s, command, condition): EngineStep {
      const rho = condition.ambient.pressure_Pa / (R_AIR * condition.ambient.temperature_K);
      const throttle = Math.min(1, Math.max(0, command.throttle));
      const thrust = d.staticThrust_N * throttle * (rho / SEA_LEVEL_DENSITY);
      const output: EngineOutput = { thrust_N: thrust, fuelFlow_kg_s: PLACEHOLDER_TSFC * thrust, afterburnerLit: false, limits: [], failure: null, evidence: "estimated" };
      return { state: s, output };
    },
  };
}
