/**
 * Subsonic base common to every candidate (PLAN.md, section 4):
 *   CD0(M) = base(M) + W(M).
 * base(M) is the current band of eight parasite variants (four wing form
 * factors by two boundary-layer states) plus the model's zero-lift term,
 * computed with packages/physics unchanged:
 * - form factors and the zero-lift term frozen at min(M, 0.90);
 * - skin friction at the Mach number M, at the Reynolds number of the tunnel
 *   line of tunnel.ts times `reynoldsFactor` (input I5);
 * - for M >= 1, two more variants with form factor 1 on the wing and the body
 *   (the usual supersonic convention, UNVERIFIED).
 * No drag data is read here.
 */

import {
  BIELAT_AIRFOIL,
  BIELAT_AREA_IN2,
  BIELAT_BODY,
  BOUNDARY_LAYERS,
  WING_FORM_FACTORS,
  inducedDragFactor,
  minimumDragCl,
  parasiteDrag,
  type BoundaryLayer,
  type WingBody,
  type WingFormFactorId,
} from "../../../packages/physics/src/index.ts";

export const FORM_FACTOR_FREEZE_MACH = 0.9;

export interface BaseVariant {
  id: string;
  formFactor: WingFormFactorId | "one";
  boundaryLayer: BoundaryLayer;
}

export const BASE_VARIANTS: BaseVariant[] = (["turbulent", "mixed"] as BoundaryLayer[]).flatMap((bl) =>
  (Object.keys(WING_FORM_FACTORS) as WingFormFactorId[]).map((ff) => ({ id: `${ff}/${bl}`, formFactor: ff, boundaryLayer: bl })),
);
export const SUPERSONIC_EXTRA: BaseVariant[] = (["turbulent", "mixed"] as BoundaryLayer[]).map((bl) => ({ id: `ff1/${bl}`, formFactor: "one", boundaryLayer: bl }));

export function variantsAt(mach: number): BaseVariant[] {
  return mach >= 1 ? [...BASE_VARIANTS, ...SUPERSONIC_EXTRA] : BASE_VARIANTS;
}

/** WingBody for packages/physics with a given sweep, thickness and body length. */
export function wingBody(sweepQuarterChordDeg: number, thicknessRatio: number, bodyLengthIn = BIELAT_BODY.lengthIn): WingBody {
  return {
    planform: { aspectRatio: 3.5, taperRatio: 0.2, sweepQuarterChordDeg, thicknessRatio, areaIn2: BIELAT_AREA_IN2 },
    airfoil: BIELAT_AIRFOIL,
    body: { ...BIELAT_BODY, lengthIn: bodyLengthIn },
  };
}

/** One base variant at one Mach number. */
export function baseValue(w: WingBody, mach: number, v: BaseVariant, reynoldsFactor = 1): number {
  const mFF = Math.min(mach, FORM_FACTOR_FREEZE_MACH);
  const ff: WingFormFactorId = v.formFactor === "one" ? "raymer" : v.formFactor;
  const p = parasiteDrag(w, mach, mFF, { wingFormFactor: ff, boundaryLayer: v.boundaryLayer });
  const cf = BOUNDARY_LAYERS[v.boundaryLayer].cf;
  const S = w.planform.areaIn2;
  const wingFF = v.formFactor === "one" ? 1 : p.wingFormFactor;
  const bodyFF = v.formFactor === "one" ? 1 : p.bodyFormFactor;
  const wing = (cf(p.wingReynolds * reynoldsFactor, mach) * wingFF * p.wingWettedIn2) / S;
  const body = (cf(p.bodyReynolds * reynoldsFactor, mach) * bodyFF * p.bodyWettedIn2) / S;
  const clMin = minimumDragCl(w, mFF);
  const zeroLift = inducedDragFactor(w.planform) * clMin * clMin;
  return wing + body + zeroLift;
}

export interface BaseBand {
  values: number[];
  min: number;
  max: number;
  center: number;
}

/** The base band at a Mach number; for several thicknesses (the thickened root), the envelope of all. */
export function baseBand(ws: WingBody[], mach: number, reynoldsFactor = 1): BaseBand {
  const values: number[] = [];
  for (const w of ws) for (const v of variantsAt(mach)) values.push(baseValue(w, mach, v, reynoldsFactor));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { values, min, max, center: (min + max) / 2 };
}
