/**
 * Transonic drag rise: Korn's equation with Mason's simple-sweep extension for
 * the drag-divergence Mach number, the critical Mach number from the
 * divergence criterion, and Lock's fourth-power law for the rise, applied
 * strip by strip along the exposed span and weighted by strip area.
 *
 *   Mdd   = kA / cos(L) - (t/c) / cos^2(L) - cl / (10 cos^3(L))
 *   Mcrit = Mdd - (0.1 / 80)^(1/3)
 *   dCD   = 20 (M - Mcrit)^4   for M > Mcrit
 *
 * L is the mid-chord sweep. kA = 0.87 for NACA 6-series sections; it is not
 * moved to match the data.
 *
 * Lock's law grows without bound; beyond about Mdd + 0.05 it no longer
 * describes the drag. The model reports that as outside its range instead
 * of extending the curve.
 *
 * The method as a whole is outside its demonstrated range on the wings of
 * this bench (brief 001, gate 4, and Amendment 3, point 4). Korn's relation is
 * empirical, from transonic transport airfoils; the strip method is shown on
 * transport wings (Mason: Boeing 747-100 and 777). On the three tested wings,
 * 4 percent thick with aspect ratio 3.5, its drag-divergence Mach number
 * misses the measured drag rise in both directions as sweep changes. So the
 * models report every condition where the drag-rise term acts, above the
 * critical Mach number of the first strip to diverge, as outside their range,
 * and never claim a Mach number above 0.90 (models.ts, SUBSONIC_LIMIT_MACH).
 */

import { strips, sweepAtDeg, geometry, type WingBody } from "./geometry.ts";

const DEG = Math.PI / 180;

export const KORN_FACTOR_NACA6 = 0.87;
export const MCRIT_OFFSET = Math.cbrt(0.1 / 80);
/** Lock's law is not used beyond Mdd plus this margin. */
export const LOCK_VALIDITY_MARGIN = 0.05;

/** Korn-Mason drag-divergence Mach number of a section in simple sweep theory. */
export function dragDivergenceMach(kA: number, thicknessRatio: number, cl: number, midChordSweepDeg: number): number {
  const c = Math.cos(midChordSweepDeg * DEG);
  return kA / c - thicknessRatio / (c * c) - cl / (10 * c * c * c);
}

export function criticalMach(mdd: number): number {
  return mdd - MCRIT_OFFSET;
}

/** Lock's fourth-power law. */
export function lockRise(mach: number, mcrit: number): number {
  return mach > mcrit ? 20 * Math.pow(mach - mcrit, 4) : 0;
}

/**
 * Spanwise section lift coefficient by Schrenk's approximation: the mean of
 * the planform chord distribution and an elliptic one of the same area.
 */
export function schrenkCl(w: WingBody, wingCl: number, eta: number, chordIn: number): number {
  // UNVERIFIED: Schrenk's approximation (NACA TM 948, 1940) for the spanwise loading; check against a lifting-surface solution.
  const g = geometry(w);
  const meanChord = w.planform.areaIn2 / g.spanIn;
  const elliptic = (4 / Math.PI) * meanChord * Math.sqrt(Math.max(0, 1 - eta * eta));
  return (wingCl * (chordIn + elliptic)) / (2 * chordIn);
}

export interface WaveDrag {
  /** Drag-rise increment on the reference area */
  cd: number;
  /** Lowest strip divergence Mach number (the first strip to diverge) */
  mddMin: number;
  /** Wing divergence Mach number with the section cl equal to the wing CL */
  mddWing: number;
  /** Critical Mach number of the first strip to diverge: the drag-rise term is zero below it */
  mcritMin: number;
  /** True when M exceeds the lowest strip Mdd by more than the validity margin */
  beyondLock: boolean;
}

export function waveDrag(w: WingBody, mach: number, wingCl: number, kA = KORN_FACTOR_NACA6, nStrips = 20): WaveDrag {
  const p = w.planform;
  const half = sweepAtDeg(p, 0.5);
  let cd = 0;
  let mddMin = Number.POSITIVE_INFINITY;
  for (const s of strips(w, nStrips)) {
    const cl = schrenkCl(w, wingCl, s.eta, s.chordIn);
    const mdd = dragDivergenceMach(kA, p.thicknessRatio, cl, half);
    mddMin = Math.min(mddMin, mdd);
    cd += lockRise(mach, criticalMach(mdd)) * (s.areaIn2 / p.areaIn2);
  }
  const mddWing = dragDivergenceMach(kA, p.thicknessRatio, wingCl, half);
  return { cd, mddMin, mddWing, mcritMin: criticalMach(mddMin), beyondLock: mach > mddMin + LOCK_VALIDITY_MARGIN };
}
