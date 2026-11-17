/**
 * The one place where tunnel units become flight units (brief 006, "Trampas conocidas").
 *
 * The wind-tunnel geometry of NACA RM L52B08 is in inches and square inches
 * (packages/physics/src/geometry.ts); the flight model is in SI. The aircraft
 * is the tested wing-body scaled geometrically: every length is multiplied by
 * the same factor k, every area by k^2, so every coefficient on the reference
 * area keeps its value.
 */

/** International inch, exact by definition (1959): 0.0254 m. */
export const M_PER_IN = 0.0254;
/** Square inch in square metres, exact. */
export const M2_PER_IN2 = M_PER_IN * M_PER_IN;
/** Square foot in square metres, exact (12 in per ft). */
export const M2_PER_FT2 = 144 * M2_PER_IN2;
/** Pound mass in kilograms, exact by definition (1959). */
export const KG_PER_LB = 0.45359237;
/** Pound force in newtons: one pound mass under standard gravity, exact. */
export const N_PER_LBF = KG_PER_LB * 9.80665;
/** Foot in metres, exact. */
export const M_PER_FT = 12 * M_PER_IN;
/** Metres per second to kilometres per hour. */
export const KMH_PER_MS = 3.6;

export function inchesToMetres(lengthIn: number): number {
  return lengthIn * M_PER_IN;
}

export function squareInchesToSquareMetres(areaIn2: number): number {
  return areaIn2 * M2_PER_IN2;
}

/**
 * Linear scale factor from the tunnel model to the full-size aircraft:
 * k = sqrt(S_aircraft / S_model), both areas in square metres.
 */
export function scaleFactor(modelAreaIn2: number, aircraftAreaM2: number): number {
  return Math.sqrt(aircraftAreaM2 / squareInchesToSquareMetres(modelAreaIn2));
}

/** A tunnel-model length in inches, on the full-size aircraft, in metres. */
export function scaledLength(lengthIn: number, k: number): number {
  return inchesToMetres(lengthIn) * k;
}
