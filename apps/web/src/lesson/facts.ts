/**
 * Every figure the lesson's text shows, computed from the dataset. Pure
 * functions: the strings carry placeholders, never numbers (brief 002,
 * "Ingeniería"). Each fact states its data class (docs/PROCESS.md, evidence
 * rule 1) and has a test that fixes today's value with a tolerance.
 */

import { bielatWing, type TestedWingId } from "@jet-workshop/physics";
import {
  SYMBOL_WINDOW,
  compare,
  kornMasonLockBand,
  measuredLiftSlope,
  sampledDragRiseMach,
  transonicLimitMach,
  withinUval,
  type Dataset,
  type FairedSample,
  type PolarPoint,
} from "@jet-workshop/validation";

export type FactClass = "measured" | "NACA faired" | "computed" | "model";

export interface Fact<T> {
  value: T;
  dataClass: FactClass;
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
 * Step 5: Mach number where each NACA faired curve starts to rise
 * (dCD/dM = 0.1, the report's definition), with `sampledDragRiseMach`. Null
 * for a wing whose curve never gets that steep between its samples: today the
 * 47 deg curve (steepest stretch 0.096). The report's text gives 0.97 for that
 * wing; that figure is not computed from the curve, so it is not shown.
 */
export function dragRise(data: Dataset): Fact<Record<TestedWingId, number | null>> {
  const out = {} as Record<TestedWingId, number | null>;
  for (const w of WINGS) out[w] = sampledDragRiseMach(fairedCurve(data, w).map((s) => ({ mach: s.mach, cd: s.cd0 })));
  return { value: out, dataClass: "NACA faired" };
}

/** Step 6: how much less lift per degree the 47 deg wing gives than the 10.8 deg wing at M 0.50, in percent (slopes fitted through the measured symbols). */
export function liftLoss(data: Dataset): Fact<{ percent: number; mach: number }> | null {
  const slope = (w: TestedWingId) => measuredLiftSlope(data.lift.filter((p) => p.wing === w && near(p.mach, LOW_MACH)));
  const straight = slope("10.8");
  const swept = slope("47");
  if (!straight || !swept) return null;
  return { value: { percent: 100 * (1 - swept.slope / straight.slope), mach: LOW_MACH }, dataClass: "measured" };
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
