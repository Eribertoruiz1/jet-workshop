/**
 * The one scoring function. `pnpm validate` and the wing bench both use it,
 * so the reliability strip on screen is computed exactly as the report is.
 *
 * Errors are model minus measured. A point is scored only where the model
 * claims validity; points outside the model's range are counted and listed,
 * never mixed into the error statistics.
 */

import {
  BOUNDARY_LAYERS,
  WING_FORM_FACTORS,
  bielatWing,
  criticalMach,
  makeKornMasonLock,
  waveDrag,
  type BoundaryLayer,
  type Condition,
  type DragModel,
  type ModelResult,
  type ParasiteOptions,
  type TestedWingId,
  type WingBody,
  type WingFormFactorId,
} from "@jet-workshop/physics";
import type { Dataset, FairedSample, LiftPoint, PolarPoint } from "./data.ts";

/**
 * The parasite-drag variants of the gate 4 sensitivity: every textbook wing
 * form factor with each boundary-layer state. Each is a book method used as
 * published; none is chosen to match the data.
 */
export const PARASITE_VARIANTS: { id: string; label: string; options: ParasiteOptions; model: DragModel }[] = (
  Object.keys(BOUNDARY_LAYERS) as BoundaryLayer[]
).flatMap((bl) =>
  (Object.keys(WING_FORM_FACTORS) as WingFormFactorId[]).map((ff) => ({
    id: `${ff}/${bl}`,
    label: `${WING_FORM_FACTORS[ff].label}, ${BOUNDARY_LAYERS[bl].label}`,
    options: { wingFormFactor: ff, boundaryLayer: bl },
    model: makeKornMasonLock({ wingFormFactor: ff, boundaryLayer: bl }),
  })),
);

export interface ModelRange {
  values: { id: string; cd: number }[];
  min: number;
  max: number;
  /** False if any variant is outside the model's range (they share the validity rules) */
  valid: boolean;
}

/** Drag of every parasite variant at one condition, and the range they span. */
export function modelRange(wing: WingBody, c: Condition): ModelRange {
  const results = PARASITE_VARIANTS.map((v) => ({ id: v.id, r: v.model(wing, c) }));
  const cds = results.map((x) => x.r.cd);
  return {
    values: results.map((x) => ({ id: x.id, cd: x.r.cd })),
    min: Math.min(...cds),
    max: Math.max(...cds),
    valid: results.every((x) => x.r.valid),
  };
}

/** Signed distance from a value to a range: 0 inside, negative below, positive above. */
export function outsideBy(value: number, lo: number, hi: number): number {
  if (value < lo) return value - lo;
  if (value > hi) return value - hi;
  return 0;
}

/** CD0 bands of brief 001, check 3 (precedent: Gur, Mason & Schetz 2010). */
export const CD0_BANDS = [
  { limit: 0.001, label: "within the declared test accuracy (0.0010)" },
  { limit: 0.0015, label: "within the charter target (0.0015)" },
  { limit: 0.002, label: "matches the published precedent (0.0020)" },
  { limit: Number.POSITIVE_INFINITY, label: "worse than the published precedent (above 0.0020)" },
] as const;

/** The reliability strip calls a segment validated within this band. */
export const VALIDATED_BAND = 0.002;
/** Symbols used for the CD0 comparison and the reliability strip: |CL - CL_sel| within this. */
export const LOW_LIFT = 0.3;

export function bandOf(absError: number): number {
  return CD0_BANDS.findIndex((b) => absError <= b.limit);
}

export interface PointScore {
  point: PolarPoint;
  result: ModelResult;
  /** model minus measured */
  error: number;
  /** |error| in multiples of the point's total uncertainty */
  ratio: number;
}

export function scorePolarPoint(model: DragModel, wing: WingBody, p: PolarPoint): PointScore {
  const result = model(wing, { mach: p.mach, cl: p.cl });
  const error = result.cd - p.cd;
  return { point: p, result, error, ratio: Math.abs(error) / p.uCd };
}

export interface Stats {
  n: number;
  meanAbs: number;
  maxAbs: number;
  rms: number;
  meanRatio: number;
  meanSigned: number;
}

export function stats(scores: PointScore[]): Stats | null {
  const v = scores.filter((s) => s.result.valid);
  if (!v.length) return null;
  const abs = v.map((s) => Math.abs(s.error));
  return {
    n: v.length,
    meanAbs: abs.reduce((a, b) => a + b, 0) / v.length,
    maxAbs: Math.max(...abs),
    rms: Math.sqrt(v.reduce((a, s) => a + s.error * s.error, 0) / v.length),
    meanRatio: v.reduce((a, s) => a + s.ratio, 0) / v.length,
    meanSigned: v.reduce((a, s) => a + s.error, 0) / v.length,
  };
}

export const ACCEPTANCE_RANGES = [
  { id: "to-0.90", label: "M up to 0.90", lo: 0, hi: 0.9 + 1e-9, target: 0.002 },
  { id: "0.90-1.12", label: "M above 0.90 to 1.13", lo: 0.9 + 1e-9, hi: 1.131, target: 0.003 },
] as const;

export function pointsFor(data: Dataset, wing: TestedWingId): PolarPoint[] {
  return data.polar.filter((p) => p.wing === wing);
}

/** Model at CL = 0 against the NACA faired curve of figure 9. */
export function fairedComparison(model: DragModel, wing: TestedWingId, samples: FairedSample[]): { sample: FairedSample; result: ModelResult; error: number }[] {
  const w = bielatWing(wing);
  return samples
    .filter((s) => s.wing === wing)
    .map((s) => {
      const result = model(w, { mach: s.mach, cl: 0 });
      return { sample: s, result, error: result.cd - s.cd0 };
    });
}

/** Least-squares slope dCL/dalpha (per deg) through lift points with |CL| <= limit. */
export function measuredLiftSlope(points: LiftPoint[], limit = LOW_LIFT): { slope: number; n: number } | null {
  const v = points.filter((p) => Math.abs(p.cl) <= limit);
  if (v.length < 3) return null;
  const ma = v.reduce((a, p) => a + p.alpha, 0) / v.length;
  const mc = v.reduce((a, p) => a + p.cl, 0) / v.length;
  let sxy = 0;
  let sxx = 0;
  for (const p of v) {
    sxy += (p.alpha - ma) * (p.cl - mc);
    sxx += (p.alpha - ma) ** 2;
  }
  return { slope: sxy / sxx, n: v.length };
}

/**
 * Drag-rise Mach number of a sampled curve: first Mach number where the slope
 * between consecutive samples reaches 0.1, the slope being assigned to each
 * interval's midpoint and interpolated linearly to the crossing.
 */
export function sampledDragRiseMach(samples: { mach: number; cd: number }[]): number | null {
  const s = [...samples].sort((a, b) => a.mach - b.mach);
  let prev: { m: number; slope: number } | null = null;
  for (let i = 1; i < s.length; i++) {
    const dm = s[i]!.mach - s[i - 1]!.mach;
    if (dm <= 0) continue;
    const cur = { m: (s[i]!.mach + s[i - 1]!.mach) / 2, slope: (s[i]!.cd - s[i - 1]!.cd) / dm };
    if (cur.slope >= 0.1) {
      if (!prev) return cur.m;
      return prev.m + ((0.1 - prev.slope) / (cur.slope - prev.slope)) * (cur.m - prev.m);
    }
    prev = cur;
  }
  return null;
}

/** Symbols closer than this in CL count as one lift level: twice the declared CL reading accuracy (0.01). */
export const DISTINCT_CL = 0.02;

/** Number of distinct lift levels: values sorted, a new level starts when the gap exceeds DISTINCT_CL. */
export function liftLevels(cls: number[], tol = DISTINCT_CL): number {
  const s = [...cls].sort((x, y) => x - y);
  let n = s.length ? 1 : 0;
  for (let i = 1; i < s.length; i++) if (s[i]! - s[i - 1]! > tol) n++;
  return n;
}

/**
 * Parabola CD = a + b CL + c CL^2 through the low-lift symbols, evaluated at CL = 0 (a check only, never data).
 * A parabola needs three distinct lift levels; a repeated point (two symbols at one CL) does not count twice,
 * so with fewer than three levels cd0 is null.
 */
export function parabolaAtZeroLift(points: PolarPoint[], limit = LOW_LIFT): { cd0: number | null; n: number; levels: number } {
  const v = points.filter((p) => Math.abs(p.cl) <= limit);
  const levels = liftLevels(v.map((p) => p.cl));
  if (levels < 3) return { cd0: null, n: v.length, levels };
  // Normal equations for a quadratic.
  const s = [0, 0, 0, 0, 0];
  const t = [0, 0, 0];
  for (const p of v) {
    for (let k = 0; k < 5; k++) s[k]! += p.cl ** k;
    for (let k = 0; k < 3; k++) t[k]! += p.cd * p.cl ** k;
  }
  const m = [
    [s[0]!, s[1]!, s[2]!, t[0]!],
    [s[1]!, s[2]!, s[3]!, t[1]!],
    [s[2]!, s[3]!, s[4]!, t[2]!],
  ];
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(m[r]![i]!) > Math.abs(m[piv]![i]!)) piv = r;
    [m[i], m[piv]] = [m[piv]!, m[i]!];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = m[r]![i]! / m[i]![i]!;
      for (let k = i; k < 4; k++) m[r]![k]! -= f * m[i]![k]!;
    }
  }
  return { cd0: m[0]![3]! / m[0]![0]!, n: v.length, levels };
}

export type Reliability = "validated" | "estimate" | "outside model range";

export interface Segment {
  lo: number;
  hi: number;
  state: Reliability;
  /** Measured symbols in the segment disagree with the model beyond the band */
  disagrees: boolean;
  n: number;
  reason: string;
}

/** Edges of the Mach segments of the reliability strip. */
export const SEGMENT_EDGES = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];

/**
 * Reliability strip for a geometry at a selected lift coefficient.
 *
 * - outside model range: the model is not valid somewhere in the segment
 *   (Mach above Mdd + 0.05, or outside the range of one of its equations);
 * - validated: the geometry is a tested wing, the segment holds measured
 *   symbols within 0.3 of the selected CL, and the model is within 0.0020 of
 *   every one of them (each scored at its own CL and Mach);
 * - estimate: otherwise, with `disagrees` set when there are measured symbols
 *   and the model misses at least one of them by more than 0.0020.
 */
export function reliability(model: DragModel, wing: WingBody, tested: TestedWingId | null, data: Dataset | null, clSelected: number): Segment[] {
  const out: Segment[] = [];
  for (let i = 1; i < SEGMENT_EDGES.length; i++) {
    const lo = SEGMENT_EDGES[i - 1]!;
    const hi = SEGMENT_EDGES[i]!;
    const probe = [lo, (lo + hi) / 2, hi - 1e-6].map((m) => model(wing, { mach: m, cl: clSelected }));
    const bad = probe.find((r) => !r.valid);
    if (bad) {
      out.push({ lo, hi, state: "outside model range", disagrees: false, n: 0, reason: bad.reasons.join("; ") });
      continue;
    }
    const pts = tested && data ? data.polar.filter((p) => p.wing === tested && p.mach >= lo - 1e-9 && p.mach < hi - 1e-9 && Math.abs(p.cl - clSelected) <= LOW_LIFT) : [];
    const scores = pts.map((p) => scorePolarPoint(model, wing, p)).filter((s) => s.result.valid);
    if (!scores.length) {
      out.push({ lo, hi, state: "estimate", disagrees: false, n: 0, reason: "no measured data in this Mach range" });
      continue;
    }
    const worst = Math.max(...scores.map((s) => Math.abs(s.error)));
    if (worst <= VALIDATED_BAND) out.push({ lo, hi, state: "validated", disagrees: false, n: scores.length, reason: `largest error ${worst.toFixed(4)}` });
    else out.push({ lo, hi, state: "estimate", disagrees: true, n: scores.length, reason: `largest error ${worst.toFixed(4)} exceeds ${VALIDATED_BAND}` });
  }
  return out;
}

/** Lowest Mach number at which the model stops being valid at a lift coefficient (for the dashed red curve). */
export function modelLimitMach(model: DragModel, wing: WingBody, cl: number, from = 0.5, to = 1.15, step = 0.001): number | null {
  for (let m = from; m <= to + 1e-9; m += step) if (!model(wing, { mach: m, cl }).valid) return m;
  return null;
}

/** Critical Mach number of the tested wing at CL = 0 (lowest strip), for the lift-slope check. */
export function criticalMachAtZeroLift(wing: WingBody): number {
  return criticalMach(waveDrag(wing, 0.8, 0).mddMin);
}
