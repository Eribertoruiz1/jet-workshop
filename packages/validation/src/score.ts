/**
 * The one scoring function. `pnpm validate` and the wing bench both use it,
 * so the reliability strip on screen is computed exactly as the report is.
 *
 * Every model is scored as a band (brief 001, Amendment 3, point 1): the range
 * its eight parasite-drag variants span (four textbook wing form factors, each
 * with a fully turbulent boundary layer and with a laminar run to the standard
 * critical Reynolds number). No variant is chosen and nothing is fitted. The
 * error at a measured point is its distance to the band, 0 inside, signed as
 * model minus measured; the band's spread is reported next to it.
 *
 * A point is scored only where the model claims validity; points outside the
 * model's range are counted and listed, never mixed into the error statistics.
 */

import {
  BOUNDARY_LAYERS,
  WING_FORM_FACTORS,
  bielatWing,
  criticalMach,
  makeBaseline,
  makeKornMasonLock,
  waveDrag,
  type BoundaryLayer,
  type Condition,
  type DragModel,
  type ParasiteOptions,
  type TestedWingId,
  type WingBody,
  type WingFormFactorId,
} from "@jet-workshop/physics";
import type { Dataset, FairedSample, LiftPoint, PolarPoint } from "./data.ts";

/**
 * The parasite-drag variants: every textbook wing form factor with each
 * boundary-layer state. Each is a book method used as published.
 */
export const PARASITE_OPTIONS: { id: string; label: string; options: ParasiteOptions }[] = (
  Object.keys(BOUNDARY_LAYERS) as BoundaryLayer[]
).flatMap((bl) =>
  (Object.keys(WING_FORM_FACTORS) as WingFormFactorId[]).map((ff) => ({
    id: `${ff}/${bl}`,
    label: `${WING_FORM_FACTORS[ff].label}, ${BOUNDARY_LAYERS[bl].label}`,
    options: { wingFormFactor: ff, boundaryLayer: bl },
  })),
);

/** The korn-mason-lock model with each parasite variant (the gate 4 sensitivity). */
export const PARASITE_VARIANTS: { id: string; label: string; options: ParasiteOptions; model: DragModel }[] = PARASITE_OPTIONS.map((v) => ({
  ...v,
  model: makeKornMasonLock(v.options),
}));

export interface Band {
  values: { id: string; cd: number }[];
  min: number;
  max: number;
  /** False if the model is outside its range here (all variants share the validity rules) */
  valid: boolean;
  /** Beyond Lock's own limit: computed, but not drawn even as outside the range */
  beyondLock: boolean;
  /** Above the model's Mach limit (the transonic range) */
  transonic: boolean;
  /** Why the band is outside the model's range, when it is */
  reasons: string[];
}

/** A model scored as a band: `(wing, condition) => Band`. A single model is a band of zero width. */
export type BandModel = (wing: WingBody, c: Condition) => Band;

/** The band spanned by a set of models that share their validity rules. */
export function makeBand(variants: { id: string; model: DragModel }[]): BandModel {
  return (wing, c) => {
    const results = variants.map((v) => ({ id: v.id, r: v.model(wing, c) }));
    const cds = results.map((x) => x.r.cd);
    const computed = cds.every(Number.isFinite);
    const reasons = [...new Set(results.flatMap((x) => x.r.reasons))];
    if (!computed) reasons.push("a variant is not defined here (no finite value)");
    return {
      values: results.map((x) => ({ id: x.id, cd: x.r.cd })),
      min: Math.min(...cds),
      max: Math.max(...cds),
      valid: computed && results.every((x) => x.r.valid),
      beyondLock: results.some((x) => x.r.beyondLock),
      transonic: results.some((x) => x.r.transonic),
      reasons,
    };
  };
}

/** Our model as shown and scored: the band of its eight parasite variants. */
export const kornMasonLockBand: BandModel = makeBand(PARASITE_VARIANTS);

/** The incompressible baseline over the same eight parasite variants, so the two bands differ only in their Mach terms. */
export const baselineBand: BandModel = makeBand(PARASITE_OPTIONS.map((v) => ({ id: v.id, model: makeBaseline(v.options) })));

export const BAND_MODELS: { id: string; band: BandModel }[] = [
  { id: "korn-mason-lock", band: kornMasonLockBand },
  { id: "baseline-incompressible", band: baselineBand },
];

/** Drag of every parasite variant of our model at one condition, and the range they span. */
export function modelRange(wing: WingBody, c: Condition): Band {
  return kornMasonLockBand(wing, c);
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

/**
 * The published precedent (0.0020): the largest band half-width (u_input) at
 * which a strip segment can be validated (decision 0001, point 2), so a wide
 * band cannot pass by its width alone; and the distance outside the band above
 * which the screen says the data disagree with the model.
 */
export const VALIDATED_BAND = 0.002;
/** Symbols used for the CD0 comparison and the lift-curve fit: |CL| within this. */
export const LOW_LIFT = 0.3;
/**
 * Symbols drawn on the drag-against-Mach chart: |CL - CL_sel| within this.
 * Since decision 0001 (point 3) the reliability strip scores exactly these.
 */
export const SYMBOL_WINDOW = 0.06;
/** Symbols the strip scored before decision 0001: |CL - CL_sel| within this. Kept only for the report's side-by-side count. */
export const PREVIOUS_STRIP_WINDOW = LOW_LIFT;

export function bandOf(absError: number): number {
  return CD0_BANDS.findIndex((b) => absError <= b.limit);
}

/** Error of a band at a measured value, as model minus measured: 0 inside, positive when the band lies above the value. */
export function bandError(band: Band, value: number): number {
  if (!Number.isFinite(band.min) || !Number.isFinite(band.max)) return Number.NaN;
  const d = outsideBy(value, band.min, band.max);
  return d === 0 ? 0 : -d;
}

export interface PointScore {
  point: PolarPoint;
  band: Band;
  /** Distance from the measured value to the band, model minus measured, 0 inside */
  error: number;
  /** |error| in multiples of the point's total uncertainty */
  ratio: number;
  /** Width of the band at the point */
  spread: number;
}

/**
 * Model against measurement in the structure of ASME V&V 20, as adapted in
 * decision 0001 (our adaptation of the standard, not the standard itself):
 * S is the centre of the model band, D the measured value,
 * E = S - D the comparison error, u_input the band's half-width, u_D the
 * point's total uncertainty and u_val = sqrt(u_D^2 + u_input^2). u_num is
 * zero: the model is algebraic. Not a pass or fail: |E| <= u_val says the
 * model error cannot be told apart from the noise.
 */
export interface Comparison {
  /** Comparison error E = S - D */
  e: number;
  /** Total uncertainty of the measured value, u_D */
  uD: number;
  /** Half-width of the model band, u_input */
  uInput: number;
  /** Validation uncertainty u_val = sqrt(u_D^2 + u_input^2) */
  uVal: number;
  /** |E| / u_val */
  ratio: number;
}

export function compare(band: Band, value: number, uD: number): Comparison {
  if (!Number.isFinite(band.min) || !Number.isFinite(band.max)) return { e: Number.NaN, uD, uInput: Number.NaN, uVal: Number.NaN, ratio: Number.NaN };
  const s = (band.min + band.max) / 2;
  const uInput = (band.max - band.min) / 2;
  const e = s - value;
  const uVal = Math.sqrt(uD * uD + uInput * uInput);
  return { e, uD, uInput, uVal, ratio: Math.abs(e) / uVal };
}

/** |E| <= u_val: the model's error is not distinguishable from the noise (decision 0001). */
export const withinUval = (c: Comparison): boolean => Math.abs(c.e) <= c.uVal;

export function scorePolarPoint(model: BandModel, wing: WingBody, p: PolarPoint): PointScore {
  const band = model(wing, { mach: p.mach, cl: p.cl });
  const error = bandError(band, p.cd);
  return { point: p, band, error, ratio: Math.abs(error) / p.uCd, spread: band.max - band.min };
}

export interface Stats {
  n: number;
  meanAbs: number;
  maxAbs: number;
  rms: number;
  meanRatio: number;
  meanSigned: number;
  /** Mean width of the band over the scored points */
  meanSpread: number;
  /** Largest half-width of the band over the scored points */
  maxHalfSpread: number;
  /** Scored points inside the band */
  inside: number;
}

export function stats(scores: PointScore[]): Stats | null {
  const v = scores.filter((s) => s.band.valid);
  if (!v.length) return null;
  const abs = v.map((s) => Math.abs(s.error));
  return {
    n: v.length,
    meanAbs: abs.reduce((a, b) => a + b, 0) / v.length,
    maxAbs: Math.max(...abs),
    rms: Math.sqrt(v.reduce((a, s) => a + s.error * s.error, 0) / v.length),
    meanRatio: v.reduce((a, s) => a + s.ratio, 0) / v.length,
    meanSigned: v.reduce((a, s) => a + s.error, 0) / v.length,
    meanSpread: v.reduce((a, s) => a + s.spread, 0) / v.length,
    maxHalfSpread: Math.max(...v.map((s) => s.spread / 2)),
    inside: v.filter((s) => s.error === 0).length,
  };
}

export const ACCEPTANCE_RANGES = [
  { id: "to-0.90", label: "M up to 0.90", lo: 0, hi: 0.9 + 1e-9, target: 0.002 },
  { id: "0.90-1.12", label: "M above 0.90 to 1.13", lo: 0.9 + 1e-9, hi: 1.131, target: 0.003 },
] as const;

export function pointsFor(data: Dataset, wing: TestedWingId): PolarPoint[] {
  return data.polar.filter((p) => p.wing === wing);
}

/** Model band at CL = 0 against the NACA faired curve of figure 9. */
export function fairedComparison(model: BandModel, wing: TestedWingId, samples: FairedSample[]): { sample: FairedSample; band: Band; error: number }[] {
  const w = bielatWing(wing);
  return samples
    .filter((s) => s.wing === wing)
    .map((s) => {
      const band = model(w, { mach: s.mach, cl: 0 });
      return { sample: s, band, error: bandError(band, s.cd0) };
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
  /** Measured symbols in the segment lie farther than the published precedent (0.0020) from the model band */
  disagrees: boolean;
  n: number;
  reason: string;
}

/** Edges of the Mach segments of the reliability strip. */
export const SEGMENT_EDGES = [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15];

/**
 * The rule that makes a strip segment validated.
 *
 * - "decision-0001" (current): every symbol the chart draws in the segment
 *   (within SYMBOL_WINDOW of the selected CL) has |E| <= u_val, and the band's
 *   half-width u_input is within 0.0020 at each of them.
 * - "spike-1" (before decision 0001, kept only for the report's side-by-side
 *   count): every symbol within 0.3 of the selected CL lies inside the band,
 *   and the band's half-spread is within 0.0020 at each of them.
 */
export type StripRule = "decision-0001" | "spike-1";

/**
 * Reliability strip for a geometry at a selected lift coefficient, computed
 * on the model band (Amendment 3, point 1; decision 0001):
 *
 * - outside model range: the model is not valid somewhere in the segment
 *   (above its Mach limit, the transonic range, or an equation outside its
 *   range, such as the attached-flow lift range of the polar);
 * - validated: the geometry is a tested wing, the segment holds measured
 *   symbols drawn on the chart (each scored at its own CL and Mach), every
 *   one of them has |E| <= u_val, and u_input at each of them is within the
 *   published precedent, 0.0020, so a wide band cannot pass by its width alone;
 * - estimate: otherwise. `disagrees` is set when a symbol lies more than
 *   0.0020 outside the band.
 */
export function reliability(model: BandModel, wing: WingBody, tested: TestedWingId | null, data: Dataset | null, clSelected: number, rule: StripRule = "decision-0001"): Segment[] {
  const window = rule === "decision-0001" ? SYMBOL_WINDOW : PREVIOUS_STRIP_WINDOW;
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
    const pts = tested && data ? data.polar.filter((p) => p.wing === tested && p.mach >= lo - 1e-9 && p.mach < hi - 1e-9 && Math.abs(p.cl - clSelected) <= window) : [];
    const scores = pts.map((p) => scorePolarPoint(model, wing, p)).filter((s) => s.band.valid);
    if (!scores.length) {
      out.push({ lo, hi, state: "estimate", disagrees: false, n: 0, reason: "no measured data in this Mach range" });
      continue;
    }
    const worst = Math.max(...scores.map((s) => Math.abs(s.error)));
    const half = Math.max(...scores.map((s) => s.spread / 2));
    const disagrees = worst > VALIDATED_BAND;
    if (rule === "spike-1") {
      const outside = scores.filter((s) => s.error !== 0).length;
      const detail = `${scores.length - outside} of ${scores.length} symbols inside the band, largest distance ${worst.toFixed(4)}; band half-spread up to ${half.toFixed(4)}`;
      const ok = outside === 0 && half <= VALIDATED_BAND;
      out.push({ lo, hi, state: ok ? "validated" : "estimate", disagrees: ok ? false : disagrees, n: scores.length, reason: detail });
      continue;
    }
    const cmp = scores.map((s) => compare(s.band, s.point.cd, s.point.uCd));
    const agree = cmp.filter(withinUval).length;
    const ratio = Math.max(...cmp.map((c) => c.ratio));
    const detail = `${agree} of ${scores.length} drawn symbols with |E| <= u_val, largest |E| / u_val ${ratio.toFixed(2)}; u_input up to ${half.toFixed(4)}`;
    const ok = agree === scores.length && half <= VALIDATED_BAND;
    out.push({ lo, hi, state: ok ? "validated" : "estimate", disagrees: ok ? false : disagrees, n: scores.length, reason: detail });
  }
  return out;
}

/**
 * Lowest Mach number at which the model enters its transonic range at a lift
 * coefficient: where the drag-rise note goes. The band can also leave its range
 * for other reasons (the polar's lift range); those show as hatching and in the
 * strip's reasons, not as this note.
 */
export function transonicLimitMach(model: BandModel, wing: WingBody, cl: number, from = 0.5, to = 1.15, step = 0.001): number | null {
  for (let m = from; m <= to + 1e-9; m += step) if (model(wing, { mach: m, cl }).transonic) return m;
  return null;
}

/** Critical Mach number of the tested wing at CL = 0 (lowest strip), for the lift-slope check. */
export function criticalMachAtZeroLift(wing: WingBody): number {
  return criticalMach(waveDrag(wing, 0.8, 0).mddMin);
}
