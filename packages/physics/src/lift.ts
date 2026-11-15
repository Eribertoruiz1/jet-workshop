/**
 * Subsonic lift of the wing-body.
 *
 * Lift-curve slope: Helmbold's equation in the DATCOM form given by Raymer,
 * with Prandtl-Glauert compressibility (beta) and the fuselage lift factor.
 * It has no meaning at or above M = 1 (its flag) and degrades above the
 * critical Mach number: `liftInRange` in models.ts gives the full range.
 */

import { geometry, sweepAtDeg, type WingBody } from "./geometry.ts";

const DEG = Math.PI / 180;

export interface LiftSlope {
  perRad: number;
  perDeg: number;
  valid: boolean;
}

/** Wing-body lift-curve slope at Mach `mach`, on the reference area. */
export function liftCurveSlope(w: WingBody, mach: number): LiftSlope {
  if (mach >= 0.999) return { perRad: Number.NaN, perDeg: Number.NaN, valid: false };
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const p = w.planform;
  const g = geometry(w);
  const A = p.aspectRatio;
  const beta2 = 1 - mach * mach;
  const eta = w.airfoil.liftSlopeEfficiency;
  const tanHalf = Math.tan(sweepAtDeg(p, 0.5) * DEG);
  const wingOnly = (2 * Math.PI * A) / (2 + Math.sqrt(4 + ((A * A * beta2) / (eta * eta)) * (1 + (tanHalf * tanHalf) / beta2)));
  // Fuselage lift factor F = 1.07 (1 + d/b)^2; Raymer caps F * S_exposed / S_ref at 0.98.
  const F = 1.07 * Math.pow(1 + w.body.diameterIn / g.spanIn, 2);
  const factor = Math.min(0.98, (F * g.exposedAreaIn2) / p.areaIn2);
  const perRad = wingOnly * factor;
  return { perRad, perDeg: perRad * DEG, valid: true };
}

/** Section lift-curve slope with Prandtl-Glauert compressibility, per radian. */
export function sectionLiftSlope(w: WingBody, mach: number): number {
  return (2 * Math.PI * w.airfoil.liftSlopeEfficiency) / Math.sqrt(1 - mach * mach);
}

/**
 * Lift coefficient at which the polar has its minimum drag: the lift the
 * wing carries when the mean line works at its ideal angle. Taken from the
 * airfoil geometry (zero-lift and ideal angles), never fitted to the data.
 */
export function minimumDragCl(w: WingBody, mach: number): number {
  // UNVERIFIED: simple-sweep estimate of the design lift of the mean line; check against DATCOM 4.1.3.
  const m = Math.min(mach, 0.95);
  const slope = liftCurveSlope(w, m).perDeg;
  return slope * (w.airfoil.idealAngleDeg - w.airfoil.zeroLiftAngleDeg);
}

/** Lift coefficient at angle of attack alpha (deg), linear range. */
export function liftAtAlpha(w: WingBody, mach: number, alphaDeg: number): { cl: number; valid: boolean } {
  const s = liftCurveSlope(w, mach);
  return { cl: s.perDeg * (alphaDeg - w.airfoil.zeroLiftAngleDeg), valid: s.valid };
}
