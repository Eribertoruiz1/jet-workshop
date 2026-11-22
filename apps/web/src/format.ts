/** Number formats of the interface: a point for decimals in both languages (decision 0003). */

/** Mach number to two decimals: 0.95. */
export const mach2 = (v: number): string => v.toFixed(2);
/** A ratio to one decimal: 1.9. */
export const ratio1 = (v: number): string => v.toFixed(1);
/** A percentage with no decimals: 37. */
export const percent0 = (v: number): string => Math.round(v).toFixed(0);
/** A sweep angle as NACA named the wings: 10.8, 35, 47. */
export const sweepLabel = (v: number): string => (Number.isInteger(v) ? v.toFixed(0) : v.toFixed(1));
