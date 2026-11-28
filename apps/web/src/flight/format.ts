/**
 * Figures as the page prints them: a point for decimals in both languages
 * (decision 0003), a fixed number of decimals per quantity, no thousands
 * separator. Every figure on the page goes through here.
 */

import { KMH_PER_MS } from "@jet-workshop/physics/flight";

export function fixed(x: number, decimals: number): string {
  if (!Number.isFinite(x)) return "—";
  const r = x.toFixed(decimals);
  // No "-0" or "-0.0".
  return Number(r) === 0 ? (0).toFixed(decimals) : r;
}

export const kmh = (ms: number): string => fixed(ms * KMH_PER_MS, 0);
export const mach = (m: number): string => fixed(m, 2);
export const metres = (m: number): string => fixed(m, 0);
export const km = (m: number): string => fixed(m / 1000, 1);
export const percent = (fraction: number): string => fixed(fraction * 100, 0);
export const loadFactor = (n: number): string => fixed(n, 1);
export const kg = (m: number): string => fixed(m, 0);
export const kN = (n: number): string => fixed(n / 1000, 0);
export const ratio = (r: number): string => fixed(r, 2);
export const degrees = (rad: number): string => fixed((rad * 180) / Math.PI, 1);
/** The fewest decimals, from `min` to `max`, at which two different figures print apart. */
export function decimalsApart(a: number, b: number, min: number, max: number): number {
  let d = min;
  while (d < max && fixed(a, d) === fixed(b, d)) d++;
  return d;
}
export const sweep =(deg: number): string => (Number.isInteger(deg) ? fixed(deg, 0) : fixed(deg, 1));
