/**
 * Minimum (parasite) drag by component build-up: skin friction times form
 * factor times wetted area, for the wing and the body, over the reference area.
 *
 * Friction uses the tunnel Reynolds number, not a flight one. The boundary
 * layer is taken as fully turbulent; on a small model at 2 million Reynolds
 * number part of it may be laminar, which would lower the real drag. That is
 * an open uncertainty of the model, not a constant to tune.
 *
 * The drag of the tested models was corrected to free-stream base pressure,
 * so there is no base drag term.
 */

import { geometry, sweepAtDeg, type WingBody } from "./geometry.ts";
import { reynoldsPerInch } from "./tunnel.ts";

const DEG = Math.PI / 180;

/** Turbulent flat-plate skin friction with compressibility. */
export function turbulentCf(reynolds: number, mach: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  return 0.455 / (Math.pow(Math.log10(reynolds), 2.58) * Math.pow(1 + 0.144 * mach * mach, 0.65));
}

/** Form factor of a wing or tail surface. */
export function wingFormFactor(thicknessRatio: number, maxThicknessX: number, sweepMaxThicknessDeg: number, mach: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const t = thicknessRatio;
  return (1 + (0.6 / maxThicknessX) * t + 100 * Math.pow(t, 4)) * (1.34 * Math.pow(mach, 0.18) * Math.pow(Math.cos(sweepMaxThicknessDeg * DEG), 0.28));
}

/** Form factor of a body of revolution of fineness ratio f = length / diameter. */
export function bodyFormFactor(fineness: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  return 1 + 60 / Math.pow(fineness, 3) + fineness / 400;
}

export interface ParasiteBreakdown {
  wing: number;
  body: number;
  total: number;
  wingWettedIn2: number;
  bodyWettedIn2: number;
  wingReynolds: number;
  bodyReynolds: number;
}

/**
 * Parasite drag coefficient at a Mach number, on the reference area.
 * `machForFactors` lets the incompressible baseline freeze the Mach-dependent
 * terms of friction and form factor at one Mach number.
 */
export function parasiteDrag(w: WingBody, mach: number, machForFactors: number = mach): ParasiteBreakdown {
  const g = geometry(w);
  const p = w.planform;
  const rePerIn = reynoldsPerInch(mach);
  const S = p.areaIn2;

  // Wing: exposed area, both surfaces.
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const wingWet = g.exposedAreaIn2 * (1.977 + 0.52 * p.thicknessRatio);
  const wingRe = rePerIn * g.macIn;
  const wingCf = turbulentCf(wingRe, machForFactors);
  const ffWing = wingFormFactor(p.thicknessRatio, w.airfoil.maxThicknessX, sweepAtDeg(p, w.airfoil.maxThicknessX), machForFactors);
  const wing = (wingCf * ffWing * wingWet) / S;

  // Body: cylinder with an ogive nose, as a body of revolution. The nose is
  // given 2/3 of the area of a cylinder of the same length; the wing roots
  // cover two airfoil-shaped patches of the body side.
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const b = w.body;
  const rootPatch = w.airfoil.areaFactor * p.thicknessRatio * g.sideChordIn * g.sideChordIn;
  const bodyWet = Math.PI * b.diameterIn * (b.lengthIn - b.noseLengthIn) + (2 / 3) * Math.PI * b.diameterIn * b.noseLengthIn - 2 * rootPatch;
  const bodyRe = rePerIn * b.lengthIn;
  const bodyCf = turbulentCf(bodyRe, machForFactors);
  const body = (bodyCf * bodyFormFactor(b.lengthIn / b.diameterIn) * bodyWet) / S;

  return { wing, body, total: wing + body, wingWettedIn2: wingWet, bodyWettedIn2: bodyWet, wingReynolds: wingRe, bodyReynolds: bodyRe };
}
