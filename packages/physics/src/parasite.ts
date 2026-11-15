/**
 * Minimum (parasite) drag by component build-up: skin friction times form
 * factor times wetted area, for the wing and the body, over the reference area.
 *
 * Friction uses the tunnel Reynolds number, not a flight one. By default the
 * boundary layer is taken as fully turbulent. The report does not say that
 * transition was fixed, so on these small models at 2 million Reynolds number
 * part of it was probably laminar; the `mixed` option gives the textbook
 * transitional friction with the standard critical Reynolds number. Neither
 * the critical Reynolds number nor any form factor is a constant to tune:
 * the options exist to show how far the book methods disagree.
 *
 * The drag of the tested models was corrected to free-stream base pressure,
 * so there is no base drag term.
 */

import { geometry, sweepAtDeg, type Body, type WingBody } from "./geometry.ts";
import { reynoldsPerInch } from "./tunnel.ts";

const DEG = Math.PI / 180;

/** Turbulent flat-plate skin friction with compressibility. */
export function turbulentCf(reynolds: number, mach: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  return 0.455 / (Math.pow(Math.log10(reynolds), 2.58) * Math.pow(1 + 0.144 * mach * mach, 0.65));
}

/** Standard critical Reynolds number of flat-plate transition, on the running length. */
export const TRANSITION_REYNOLDS = 5e5;

/** Constant A of the transitional formula for TRANSITION_REYNOLDS. */
export const TRANSITIONAL_A = 1700;

/**
 * Flat-plate skin friction with a laminar run from the leading edge up to
 * the standard critical Reynolds number, then turbulent (Prandtl-Schlichting):
 * Cf = Cf_turbulent - A / Re, A = 1700 for Re_crit = 5e5. The compressibility
 * factor is applied to the turbulent term only; at M 0.5 its effect on the
 * laminar correction would be below one percent of it. Below Re_crit the plate
 * is laminar (Blasius).
 */
export function mixedCf(reynolds: number, mach: number): number {
  // UNVERIFIED: check against H. Schlichting, Boundary-Layer Theory (transitional friction law and the table of A against Re_crit).
  if (reynolds <= TRANSITION_REYNOLDS) return 1.328 / Math.sqrt(reynolds);
  return turbulentCf(reynolds, mach) - TRANSITIONAL_A / reynolds;
}

export type BoundaryLayer = "turbulent" | "mixed";

export const BOUNDARY_LAYERS: Record<BoundaryLayer, { label: string; cf: (reynolds: number, mach: number) => number }> = {
  turbulent: { label: "fully turbulent", cf: turbulentCf },
  mixed: { label: "laminar to Re 5e5, then turbulent", cf: mixedCf },
};

/** Inputs every wing form factor below may use. */
export interface FormFactorInput {
  thicknessRatio: number;
  /** Chordwise position of maximum thickness, x/c */
  maxThicknessX: number;
  sweepMaxThicknessDeg: number;
  sweepQuarterChordDeg: number;
  mach: number;
}

/** Form factor of a wing or tail surface (Raymer). */
export function wingFormFactor(thicknessRatio: number, maxThicknessX: number, sweepMaxThicknessDeg: number, mach: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const t = thicknessRatio;
  return (1 + (0.6 / maxThicknessX) * t + 100 * Math.pow(t, 4)) * (1.34 * Math.pow(mach, 0.18) * Math.pow(Math.cos(sweepMaxThicknessDeg * DEG), 0.28));
}

export type WingFormFactorId = "raymer" | "torenbeek" | "hoerner" | "shevell";

/**
 * Wing form factors from four textbooks, each as published. They disagree:
 * only Raymer's grows with Mach number (the 1.34 M^0.18 term, 1.18 at M 0.5),
 * only Raymer's and Shevell's fall with sweep.
 */
export const WING_FORM_FACTORS: Record<WingFormFactorId, { label: string; source: string; value: (f: FormFactorInput) => number }> = {
  raymer: {
    label: "Raymer",
    source: "D. P. Raymer, Aircraft Design: A Conceptual Approach",
    value: (f) => wingFormFactor(f.thicknessRatio, f.maxThicknessX, f.sweepMaxThicknessDeg, f.mach),
  },
  torenbeek: {
    label: "Torenbeek",
    source: "E. Torenbeek, Synthesis of Subsonic Airplane Design (1982)",
    // UNVERIFIED: check against Torenbeek, Synthesis of Subsonic Airplane Design: 1 + 2.7 t/c + 100 (t/c)^4.
    value: (f) => 1 + 2.7 * f.thicknessRatio + 100 * Math.pow(f.thicknessRatio, 4),
  },
  hoerner: {
    label: "Hoerner",
    source: "S. F. Hoerner, Fluid-Dynamic Drag (1965)",
    // UNVERIFIED: check against Hoerner, Fluid-Dynamic Drag, chapter 6: 1 + 2 t/c + 60 (t/c)^4.
    value: (f) => 1 + 2 * f.thicknessRatio + 60 * Math.pow(f.thicknessRatio, 4),
  },
  shevell: {
    label: "Shevell",
    source: "R. S. Shevell, Fundamentals of Flight (1989)",
    // UNVERIFIED: check against Shevell, Fundamentals of Flight: 1 + Z t/c + 100 (t/c)^4, Z = (2 - M^2) cos L / sqrt(1 - M^2 cos^2 L), L the quarter-chord sweep.
    value: (f) => {
      const c = Math.cos(f.sweepQuarterChordDeg * DEG);
      const m2 = f.mach * f.mach;
      const z = ((2 - m2) * c) / Math.sqrt(1 - m2 * c * c);
      return 1 + z * f.thicknessRatio + 100 * Math.pow(f.thicknessRatio, 4);
    },
  },
};

export interface ParasiteOptions {
  /** Default "raymer" */
  wingFormFactor?: WingFormFactorId;
  /** Default "turbulent" */
  boundaryLayer?: BoundaryLayer;
}

/** Form factor of a body of revolution of fineness ratio f = length / diameter. */
export function bodyFormFactor(fineness: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  return 1 + 60 / Math.pow(fineness, 3) + fineness / 400;
}

interface BodyTerm {
  wettedIn2: number;
  reynolds: number;
  cf: number;
  formFactor: number;
  /** Cf times form factor times wetted area, square inches (divide by the reference area) */
  drag: number;
}

/**
 * Cylinder with an ogive nose, as a body of revolution with friction and a
 * form factor, the path of Gur, Mason and Schetz. The nose is given 2/3 of the
 * area of a cylinder of the same length; `coveredIn2` is the body side hidden
 * by the wing roots (0 for the body alone). No wave or base drag: the tested
 * drag was corrected to free-stream base pressure, and the body's own
 * compressibility drag is not modelled (brief 002).
 */
function bodyTerm(b: Body, rePerIn: number, machForFactors: number, cf: (re: number, m: number) => number, coveredIn2: number): BodyTerm {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const wettedIn2 = Math.PI * b.diameterIn * (b.lengthIn - b.noseLengthIn) + (2 / 3) * Math.PI * b.diameterIn * b.noseLengthIn - coveredIn2;
  const reynolds = rePerIn * b.lengthIn;
  const c = cf(reynolds, machForFactors);
  const formFactor = bodyFormFactor(b.lengthIn / b.diameterIn);
  return { wettedIn2, reynolds, cf: c, formFactor, drag: c * formFactor * wettedIn2 };
}

export interface BodyAloneDrag {
  /** Drag coefficient on the given reference area */
  cd: number;
  wettedIn2: number;
  reynolds: number;
  cf: number;
  formFactor: number;
}

/**
 * Drag of the body alone, at zero angle of attack, on a reference area: the
 * body term of the wing-body model with nothing covered. NACA RM L51I04a gives
 * the tested body's drag on the wing area of 1.143 sq ft, at the tunnel
 * Reynolds number of the wing-body tests.
 */
export function bodyAloneDrag(b: Body, mach: number, refAreaIn2: number, boundaryLayer: BoundaryLayer = "turbulent"): BodyAloneDrag {
  const t = bodyTerm(b, reynoldsPerInch(mach), mach, BOUNDARY_LAYERS[boundaryLayer].cf, 0);
  return { cd: t.drag / refAreaIn2, wettedIn2: t.wettedIn2, reynolds: t.reynolds, cf: t.cf, formFactor: t.formFactor };
}

export interface ParasiteBreakdown {
  wing: number;
  body: number;
  total: number;
  wingWettedIn2: number;
  bodyWettedIn2: number;
  wingReynolds: number;
  bodyReynolds: number;
  wingCf: number;
  bodyCf: number;
  wingFormFactor: number;
  bodyFormFactor: number;
}

/**
 * Parasite drag coefficient at a Mach number, on the reference area.
 * `machForFactors` lets the incompressible baseline freeze the Mach-dependent
 * terms of friction and form factor at one Mach number.
 */
export function parasiteDrag(w: WingBody, mach: number, machForFactors: number = mach, options: ParasiteOptions = {}): ParasiteBreakdown {
  const g = geometry(w);
  const p = w.planform;
  const rePerIn = reynoldsPerInch(mach);
  const S = p.areaIn2;
  const cf = BOUNDARY_LAYERS[options.boundaryLayer ?? "turbulent"].cf;
  const formFactor = WING_FORM_FACTORS[options.wingFormFactor ?? "raymer"].value;

  // Wing: exposed area, both surfaces.
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const wingWet = g.exposedAreaIn2 * (1.977 + 0.52 * p.thicknessRatio);
  const wingRe = rePerIn * g.macIn;
  const wingCf = cf(wingRe, machForFactors);
  const ffWing = formFactor({
    thicknessRatio: p.thicknessRatio,
    maxThicknessX: w.airfoil.maxThicknessX,
    sweepMaxThicknessDeg: sweepAtDeg(p, w.airfoil.maxThicknessX),
    sweepQuarterChordDeg: p.sweepQuarterChordDeg,
    mach: machForFactors,
  });
  const wing = (wingCf * ffWing * wingWet) / S;

  // Body: the wing roots cover two airfoil-shaped patches of the body side.
  const rootPatch = w.airfoil.areaFactor * p.thicknessRatio * g.sideChordIn * g.sideChordIn;
  const b = bodyTerm(w.body, rePerIn, machForFactors, cf, 2 * rootPatch);
  const bodyWet = b.wettedIn2;
  const bodyRe = b.reynolds;
  const bodyCf = b.cf;
  const ffBody = b.formFactor;
  const body = b.drag / S;

  return {
    wing,
    body,
    total: wing + body,
    wingWettedIn2: wingWet,
    bodyWettedIn2: bodyWet,
    wingReynolds: wingRe,
    bodyReynolds: bodyRe,
    wingCf,
    bodyCf,
    wingFormFactor: ffWing,
    bodyFormFactor: ffBody,
  };
}
