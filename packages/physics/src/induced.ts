/**
 * Drag due to lift: Oswald span efficiency after Raymer, K = 1 / (pi A e).
 */

import { sweepAtDeg, type Planform } from "./geometry.ts";

const DEG = Math.PI / 180;

/**
 * Aspect-ratio range in which these fits are used. Below about A = 2.3 the
 * straight-wing fit gives e > 1, and above about A = 7.6 the swept-wing fit
 * makes K rise again with aspect ratio; both are artefacts of the fits, so the
 * model reports such wings as outside its range.
 */
export const OSWALD_ASPECT_RATIO_RANGE: readonly [number, number] = [2.5, 7];

/** Straight wing: e = 1.78 (1 - 0.045 A^0.68) - 0.64 */
export function oswaldStraight(aspectRatio: number): number {
  return 1.78 * (1 - 0.045 * Math.pow(aspectRatio, 0.68)) - 0.64;
}

/** Swept wing, leading-edge sweep above 30 deg: e = 4.61 (1 - 0.045 A^0.68) cos(L_LE)^0.15 - 3.1 */
export function oswaldSwept(aspectRatio: number, leadingEdgeSweepDeg: number): number {
  return 4.61 * (1 - 0.045 * Math.pow(aspectRatio, 0.68)) * Math.pow(Math.cos(leadingEdgeSweepDeg * DEG), 0.15) - 3.1;
}

/** Oswald efficiency for any leading-edge sweep. */
export function oswaldEfficiency(p: Planform): number {
  const lle = sweepAtDeg(p, 0);
  if (lle >= 30) return oswaldSwept(p.aspectRatio, lle);
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  // Linear interpolation in leading-edge sweep between the straight-wing value
  // at 0 deg and the swept-wing value at 30 deg.
  const e0 = oswaldStraight(p.aspectRatio);
  const e30 = oswaldSwept(p.aspectRatio, 30);
  const f = Math.max(0, lle) / 30;
  return e0 + f * (e30 - e0);
}

/** Induced-drag factor K = 1 / (pi A e). */
export function inducedDragFactor(p: Planform): number {
  return 1 / (Math.PI * p.aspectRatio * oswaldEfficiency(p));
}

/**
 * True where the fits behave physically for this planform: aspect ratio in
 * OSWALD_ASPECT_RATIO_RANGE and K still falling as aspect ratio grows (the
 * swept-wing fit turns back at lower aspect ratio the higher the sweep).
 */
export function oswaldFitValid(p: Planform): boolean {
  const [aLow, aHigh] = OSWALD_ASPECT_RATIO_RANGE;
  if (p.aspectRatio < aLow || p.aspectRatio > aHigh) return false;
  return inducedDragFactor({ ...p, aspectRatio: p.aspectRatio + 0.01 }) < inducedDragFactor(p);
}
