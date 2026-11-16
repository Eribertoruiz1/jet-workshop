/**
 * Every figure the lesson's text shows, computed from the dataset. Pure
 * functions: the strings carry placeholders, never numbers (brief 002,
 * "Ingeniería"). Each fact states its data class (docs/PROCESS.md, evidence
 * rule 1) and has a test that fixes today's value with a tolerance.
 */

import { bielatWing, type TestedWingId } from "@jet-workshop/physics";
import {
  NACA_TEXT_DRAG_RISE,
  SYMBOL_WINDOW,
  compare,
  kornMasonLockBand,
  sampledDragRiseMach,
  transonicLimitMach,
  withinUval,
  type Dataset,
  type FairedSample,
  type LiftPoint,
  type PolarPoint,
  type ReportTextValue,
} from "@jet-workshop/validation";

/** "NACA report text": a figure the report states in its text, with its page and sentence (`ReportTextValue`). */
export type FactClass = "measured" | "NACA faired" | "NACA report text" | "computed" | "model";

export interface Fact<T> {
  value: T;
  dataClass: FactClass;
  /** Where a "NACA report text" figure is printed */
  source?: ReportTextValue;
}

export const WINGS: TestedWingId[] = ["10.8", "35", "47"];

/**
 * The lift coefficient of the drag-against-Mach pictures: the bench's default.
 * The symbols drawn are those within SYMBOL_WINDOW of it, as on the bench.
 */
export const LESSON_CL = 0.1;

/** Mach numbers of the comparison in steps 3 and 5. */
export const WALL_MACH = 0.95;
export const LOW_MACH = 0.5;

/** The stretch marked as the wall in step 3. */
export const WALL_FROM = 0.9;
export const WALL_TO = 1.0;

/** No data between these Mach numbers (reflected shocks); NACA dashed its curves there. Never interpolate across it. */
export const GAP_FROM = 1.04;
export const GAP_TO = 1.08;

/** The measured symbols a drag-against-Mach picture draws for a wing: within SYMBOL_WINDOW of LESSON_CL. */
export function drawnSymbols(data: Dataset, wing: TestedWingId): PolarPoint[] {
  return data.polar.filter((p) => p.wing === wing && Math.abs(p.cl - LESSON_CL) <= SYMBOL_WINDOW);
}

const mean = (v: number[]): number => v.reduce((a, b) => a + b, 0) / v.length;
const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6;

/** Test Mach numbers of a wing's drawn symbols, ascending. */
export function testMachs(data: Dataset, wing: TestedWingId): number[] {
  return [...new Set(drawnSymbols(data, wing).map((p) => p.mach))].sort((a, b) => a - b);
}

/**
 * Step 3: mean CD of the drawn symbols at M 0.95 over the mean at M 0.50, 10.8 deg wing.
 * Both Mach numbers are test Mach numbers of that wing: no interpolation. Measured.
 */
export function wallRatio(data: Dataset): Fact<{ ratio: number; high: number; low: number }> | null {
  const s = drawnSymbols(data, "10.8");
  const hi = s.filter((p) => near(p.mach, WALL_MACH)).map((p) => p.cd);
  const lo = s.filter((p) => near(p.mach, LOW_MACH)).map((p) => p.cd);
  if (!hi.length || !lo.length) return null;
  return { value: { ratio: mean(hi) / mean(lo), high: WALL_MACH, low: LOW_MACH }, dataClass: "measured" };
}

/** Samples of the NACA faired curve of one wing, ascending in Mach. */
export function fairedCurve(data: Dataset, wing: TestedWingId): FairedSample[] {
  return data.faired.filter((s) => s.wing === wing).sort((a, b) => a.mach - b.mach);
}

/**
 * The NACA faired curve of a wing at a Mach number, interpolated linearly
 * between its samples. Never across the stretch without data (M 1.04 to 1.08)
 * and never outside the sampled range: null there.
 */
export function fairedAt(samples: FairedSample[], mach: number): number | null {
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    if (mach < a.mach - 1e-9 || mach > b.mach + 1e-9) continue;
    if (a.mach < GAP_TO && b.mach > GAP_FROM) return null;
    if (b.mach === a.mach) return a.cd0;
    return a.cd0 + ((mach - a.mach) / (b.mach - a.mach)) * (b.cd0 - a.cd0);
  }
  return null;
}

/** Step 5: how much less the 47 deg wing drags than the 10.8 deg wing at M 0.95, on the NACA faired curves, in percent. */
export function sweepDragCut(data: Dataset): Fact<{ percent: number; mach: number }> | null {
  const straight = fairedAt(fairedCurve(data, "10.8"), WALL_MACH);
  const swept = fairedAt(fairedCurve(data, "47"), WALL_MACH);
  if (straight === null || swept === null) return null;
  return { value: { percent: 100 * (1 - swept / straight), mach: WALL_MACH }, dataClass: "NACA faired" };
}

/**
 * Step 5: Mach number where each wing's drag starts to rise (dCD/dM = 0.1,
 * the report's definition). From the NACA faired curve with
 * `sampledDragRiseMach`, class "NACA faired". A curve that never gets that
 * steep between its samples (today the 47 deg curve, steepest stretch 0.096)
 * takes the figure the report states in its text, class "NACA report text",
 * with its page and sentence (the rule of lane C's pre-registration, PM review
 * of gate 2). Null if neither gives one.
 */
export function dragRise(data: Dataset): Record<TestedWingId, Fact<number> | null> {
  const out = {} as Record<TestedWingId, Fact<number> | null>;
  for (const w of WINGS) {
    const sampled = sampledDragRiseMach(fairedCurve(data, w).map((s) => ({ mach: s.mach, cd: s.cd0 })));
    const text = NACA_TEXT_DRAG_RISE[w];
    out[w] = sampled !== null ? { value: sampled, dataClass: "NACA faired" } : text ? { value: text.value, dataClass: "NACA report text", source: text } : null;
  }
  return out;
}

/**
 * Angle-of-attack windows of the step 6 fits, deg: the measured symbols with
 * |alpha| at most each one. Infinity: every tested angle. With three or four
 * symbols in a window and CL read to about 0.01, one window alone would give
 * a misleading single figure, so the step shows the range (PM review of gate 2).
 */
export const LIFT_WINDOWS_DEG = [2.5, 4.5, 6.5, Infinity] as const;

/** Least-squares slope dCL/dalpha (per deg) of the measured symbols with |alpha| <= limit; at least two symbols. */
export function liftSlopeWithin(points: LiftPoint[], limitDeg: number): { slope: number; n: number } | null {
  const v = points.filter((p) => Math.abs(p.alpha) <= limitDeg);
  if (v.length < 2) return null;
  const ma = mean(v.map((p) => p.alpha));
  const mc = mean(v.map((p) => p.cl));
  let sxy = 0;
  let sxx = 0;
  for (const p of v) {
    sxy += (p.alpha - ma) * (p.cl - mc);
    sxx += (p.alpha - ma) ** 2;
  }
  return sxx > 0 ? { slope: sxy / sxx, n: v.length } : null;
}

export interface LiftLossWindow {
  limitDeg: number;
  percent: number;
  /** Symbols in the fit: 10.8 deg wing, 47 deg wing */
  n: [number, number];
}

/**
 * Step 6: how much less lift per degree the 47 deg wing gives than the
 * 10.8 deg wing at M 0.50, in percent, in each window of LIFT_WINDOWS_DEG,
 * and the smallest and largest of them. Slopes fitted through the measured
 * symbols: computed from measured data. Null if a window has no fit.
 */
export function liftLossRange(data: Dataset): Fact<{ min: number; max: number; mach: number; windows: LiftLossWindow[] }> | null {
  const at = (w: TestedWingId) => data.lift.filter((p) => p.wing === w && near(p.mach, LOW_MACH));
  const windows: LiftLossWindow[] = [];
  for (const limitDeg of LIFT_WINDOWS_DEG) {
    const straight = liftSlopeWithin(at("10.8"), limitDeg);
    const swept = liftSlopeWithin(at("47"), limitDeg);
    if (!straight || !swept) return null;
    windows.push({ limitDeg, percent: 100 * (1 - swept.slope / straight.slope), n: [straight.n, swept.n] });
  }
  const p = windows.map((w) => w.percent);
  return { value: { min: Math.min(...p), max: Math.max(...p), mach: LOW_MACH, windows }, dataClass: "computed" };
}

/**
 * Step 7: of the drawn symbols below the model's transonic limit (the
 * critical Mach number), how many lie within the model's margin: |E| <= u_val
 * (decision 0001). Computed from measured symbols and the model band.
 */
export function formulaAgreement(data: Dataset, wing: TestedWingId): Fact<{ inside: number; total: number; limit: number }> | null {
  const w = bielatWing(wing);
  const limit = transonicLimitMach(kornMasonLockBand, w, LESSON_CL);
  if (limit === null) return null;
  const below = drawnSymbols(data, wing).filter((p) => p.mach < limit);
  let inside = 0;
  let total = 0;
  for (const p of below) {
    const band = kornMasonLockBand(w, { mach: p.mach, cl: p.cl });
    if (!band.valid) continue;
    total++;
    if (withinUval(compare(band, p.cd, p.uCd))) inside++;
  }
  return { value: { inside, total, limit }, dataClass: "computed" };
}

/**
 * Step 4's claim, "the symbols on the right have come down": at each of the
 * 47 deg wing's two highest test Mach numbers below M 1.04, the mean drawn CD
 * is below the 10.8 deg wing's mean at its nearest test Mach number. Measured.
 */
export function rightSymbolsLower(data: Dataset, from: TestedWingId = "10.8", to: TestedWingId = "47"): Fact<boolean> {
  const at = (w: TestedWingId, m: number) => mean(drawnSymbols(data, w).filter((p) => near(p.mach, m)).map((p) => p.cd));
  const right = testMachs(data, to).filter((m) => m >= WALL_FROM && m < GAP_FROM);
  const ref = testMachs(data, from);
  const ok = right.length > 0 && right.every((m) => {
    const r = ref.reduce((b, x) => (Math.abs(x - m) < Math.abs(b - m) ? x : b), ref[0]!);
    return at(to, m) < at(from, r);
  });
  return { value: ok, dataClass: "measured" };
}
