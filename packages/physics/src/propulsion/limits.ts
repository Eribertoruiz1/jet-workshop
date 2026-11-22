/**
 * Physical limits of the engine and the rule by which exceeding one damages it.
 *
 * Gate 2 of brief 007 carries one limit, the turbine inlet temperature. The
 * others (compressor outlet temperature, surge margin, combustor and afterburner
 * blowout) arrive with gate 3, each with its source.
 */

import type { EngineLimit } from "./contract.ts";

/** Identifier of the turbine material limit. */
export const TURBINE_INLET_TEMPERATURE_LIMIT_ID = "turbine-inlet-temperature";

/**
 * Identifier of the failure reported when the engine is asked to run where the
 * gas model has no data (air colder than 200 K or hotter than 6000 K, or a
 * condition that is not a number). The engine stops; nothing is thrown.
 */
export const GAS_MODEL_RANGE_LIMIT_ID = "gas-model-range";

export interface TurbineTemperatureLimit {
  /** Turbine inlet total temperature the turbine stands indefinitely, K */
  readonly limit_K: number;
  /** Excess temperature times time the turbine stands before it fails, K s */
  readonly overheatBudget_K_s: number;
  /** Excess temperature at which the turbine fails at once, K */
  readonly instantFailureExcess_K: number;
}

/**
 * Damage rule, version 0. ESTIMATED, no source: damage grows with the excess over
 * the limit times the time spent there, the turbine fails when a budget in
 * kelvin-seconds is used up, and above a ceiling it fails at once. The two
 * numbers are the judgement of lane E. Gate 3 looks for an open creep-rupture
 * source for the bucket alloy, which would give an exponential rule.
 */
export const DAMAGE_RULE_V0 = {
  overheatBudget_K_s: 3000,
  instantFailureExcess_K: 150,
} as const;

/** Where the engine stands against its turbine limit. `fraction` is value over limit, both in kelvin. */
export function turbineLimitStatus(turbineInletTemperature_K: number, limit: TurbineTemperatureLimit): EngineLimit {
  return {
    id: TURBINE_INLET_TEMPERATURE_LIMIT_ID,
    value: turbineInletTemperature_K,
    limit: limit.limit_K,
    unit: "K",
    fraction: turbineInletTemperature_K / limit.limit_K,
  };
}

/** Accumulated overheat after `dt_s` seconds at a turbine inlet temperature. It never decreases. */
export function overheatAfter(
  overheat_K_s: number,
  turbineInletTemperature_K: number,
  limit: TurbineTemperatureLimit,
  dt_s: number,
): number {
  const excess = Math.max(0, turbineInletTemperature_K - limit.limit_K);
  const time = Number.isFinite(dt_s) && dt_s > 0 ? dt_s : 0;
  // Capped so that an absurdly long step cannot leave a state that is not a finite number.
  return Math.min(Number.MAX_VALUE, overheat_K_s + excess * time);
}

/** Whether the turbine has failed: budget used up, or the temperature at or above the ceiling. */
export function turbineHasFailed(
  overheat_K_s: number,
  turbineInletTemperature_K: number,
  limit: TurbineTemperatureLimit,
): boolean {
  return (
    overheat_K_s >= limit.overheatBudget_K_s ||
    turbineInletTemperature_K >= limit.limit_K + limit.instantFailureExcess_K
  );
}
