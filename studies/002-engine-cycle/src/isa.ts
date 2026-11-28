/**
 * Standard atmosphere, for the study only: the engine never uses it (the caller
 * of the engine owns the atmosphere model).
 *
 * UNVERIFIED: the International Standard Atmosphere up to 20 km, written from
 * memory and not read in a source for this study. Sea level 288.15 K and
 * 101 325 Pa, lapse rate 6.5 K/km up to 11 km, constant 216.65 K above.
 */

const SEA_LEVEL_K = 288.15;
const SEA_LEVEL_Pa = 101325;
const LAPSE_K_PER_M = 0.0065;
const TROPOPAUSE_M = 11000;
const GRAVITY_M_S2 = 9.80665;
const GAS_CONSTANT_J_KG_K = 287.05287;

export function standardAtmosphere(altitude_m: number): { readonly temperature_K: number; readonly pressure_Pa: number } {
  const h = Math.min(altitude_m, TROPOPAUSE_M);
  const temperature_K = SEA_LEVEL_K - LAPSE_K_PER_M * h;
  let pressure_Pa = SEA_LEVEL_Pa * (temperature_K / SEA_LEVEL_K) ** (GRAVITY_M_S2 / (GAS_CONSTANT_J_KG_K * LAPSE_K_PER_M));
  if (altitude_m > TROPOPAUSE_M) {
    pressure_Pa *= Math.exp((-GRAVITY_M_S2 * (altitude_m - TROPOPAUSE_M)) / (GAS_CONSTANT_J_KG_K * temperature_K));
  }
  return { temperature_K, pressure_Pa };
}
