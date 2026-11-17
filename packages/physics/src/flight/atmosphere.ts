/**
 * U.S. Standard Atmosphere, 1976 (NOAA, NASA and USAF; NASA-TM-X-74335,
 * NTRS 19770009539), lower layers.
 *
 * Temperature is linear in geopotential altitude H inside each layer; pressure
 * follows from hydrostatic balance and the perfect-gas law:
 *   lapse L != 0:  p = p_b (T_b / T)^(g0 M0 / (R* L))
 *   lapse L == 0:  p = p_b exp(-g0 M0 (H - H_b) / (R* T_b))
 * with T = T_b + L (H - H_b). Geopotential from geometric altitude Z:
 *   H = r0 Z / (r0 + Z).
 * The base pressure of each layer is computed from the one below, so the
 * profile is continuous; the source's own table is the test (check 3).
 *
 * The brief asks for 0 to 20 km. The third layer (20 to 32 km geopotential)
 * is the same standard and is included so that the air does not end at an
 * invisible ceiling; above 32 km geopotential the model extends the third
 * layer and says it is out of range.
 */

// UNVERIFIED: constants and layer table of the 1976 standard, check against NASA-TM-X-74335, part 1, tables I and 4.
/** Standard acceleration of gravity, m/s^2 (also the gravity of the flight model). */
export const G0 = 9.80665;
/** Effective Earth radius of the standard for the geopotential, m. */
export const EARTH_RADIUS_M = 6356766;
/** Universal gas constant as adopted by the 1976 standard, J / (kmol K). */
export const R_STAR = 8314.32;
/** Mean molecular weight of air at sea level, kg / kmol. */
export const M0 = 28.9644;
/** Specific gas constant of air, J / (kg K). */
export const R_AIR = R_STAR / M0;
/** Ratio of specific heats of air. */
export const GAMMA_AIR = 1.4;
/** Sutherland's law of the standard: mu = beta T^1.5 / (T + S). */
export const SUTHERLAND_BETA = 1.458e-6;
export const SUTHERLAND_S_K = 110.4;

export const SEA_LEVEL_PRESSURE_PA = 101325;
export const SEA_LEVEL_TEMPERATURE_K = 288.15;

interface Layer {
  /** Base geopotential altitude, m */
  readonly h: number;
  /** Lapse rate dT/dH, K/m */
  readonly lapse: number;
}

const LAYERS: readonly Layer[] = [
  { h: 0, lapse: -0.0065 },
  { h: 11000, lapse: 0 },
  { h: 20000, lapse: 0.001 },
];
/** Top of the third layer, geopotential metres. */
export const ATMOSPHERE_TOP_GEOPOTENTIAL_M = 32000;

const BASES: readonly { h: number; lapse: number; t: number; p: number }[] = (() => {
  const out: { h: number; lapse: number; t: number; p: number }[] = [];
  let t = SEA_LEVEL_TEMPERATURE_K;
  let p = SEA_LEVEL_PRESSURE_PA;
  for (let i = 0; i < LAYERS.length; i++) {
    const layer = LAYERS[i]!;
    out.push({ h: layer.h, lapse: layer.lapse, t, p });
    const next = LAYERS[i + 1];
    if (next) {
      const top = layerAt(out[i]!, next.h);
      t = top.t;
      p = top.p;
    }
  }
  return out;
})();

function layerAt(b: { h: number; lapse: number; t: number; p: number }, hGeopotential: number): { t: number; p: number } {
  const dh = hGeopotential - b.h;
  if (b.lapse === 0) {
    return { t: b.t, p: b.p * Math.exp((-G0 * M0 * dh) / (R_STAR * b.t)) };
  }
  const t = b.t + b.lapse * dh;
  return { t, p: b.p * Math.pow(b.t / t, (G0 * M0) / (R_STAR * b.lapse)) };
}

export function geopotentialAltitude(geometricM: number): number {
  return (EARTH_RADIUS_M * geometricM) / (EARTH_RADIUS_M + geometricM);
}

export interface Air {
  /** Static pressure, Pa */
  readonly pressure_Pa: number;
  /** Static temperature, K */
  readonly temperature_K: number;
  /** Density, kg/m^3 */
  readonly density_kg_m3: number;
  /** Speed of sound, m/s */
  readonly speedOfSound_m_s: number;
  /** Dynamic viscosity, Pa s */
  readonly viscosity_Pa_s: number;
  /** False above the third layer of the standard (32 km geopotential) or below sea level */
  readonly inRange: boolean;
}

/** The standard atmosphere at a geometric altitude in metres. */
export function atmosphere(geometricM: number): Air {
  const h = geopotentialAltitude(geometricM);
  let base = BASES[0]!;
  for (const b of BASES) if (h >= b.h) base = b;
  const { t, p } = layerAt(base, h);
  const rho = p / (R_AIR * t);
  return {
    pressure_Pa: p,
    temperature_K: t,
    density_kg_m3: rho,
    speedOfSound_m_s: Math.sqrt(GAMMA_AIR * R_AIR * t),
    viscosity_Pa_s: (SUTHERLAND_BETA * Math.pow(t, 1.5)) / (t + SUTHERLAND_S_K),
    inRange: h >= 0 && h <= ATMOSPHERE_TOP_GEOPOTENTIAL_M,
  };
}

/** Sea-level density of the standard, kg/m^3. */
export const SEA_LEVEL_DENSITY = SEA_LEVEL_PRESSURE_PA / (R_AIR * SEA_LEVEL_TEMPERATURE_K);
