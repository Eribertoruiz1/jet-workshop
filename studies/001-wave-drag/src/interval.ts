/**
 * Predicted interval of a curve at one condition (PREREGISTRATION.md, A.9,
 * "Regla del intervalo predicho", and A.7 for the convergence sweep):
 * 1. envelope: every base variant times every parameter set, nominal inputs;
 * 2. widening: each uncertain input of PLAN.md, section 7, moved alone to its
 *    extremes; the outward change of each limit, summed in quadrature;
 *    a geometric variant that does not converge counts with the widest value
 *    over its own sweep;
 * 3. convergence: the plateau rule on N0, 2 N0, 4 N0 and m0, 2 m0, 4 m0; with
 *    a plateau on both axes u_num is the sum of the two last changes,
 *    otherwise the condition is "no converge" and the interval is extended to
 *    cover the whole sweep (u_num = 0).
 * The onset interval uses the same members, each a complete curve.
 */

import {
  baseValues,
  baselineAt,
  baselineOnset,
  curveMembers,
  onsetOf,
  ONSET_GRID,
  waveTerm,
  type CandidateId,
  type Ctx,
  type EvalOptions,
  type Params,
} from "./model.ts";
import { baseValue, variantsAt } from "./base.ts";
import { plateau } from "./wavedrag.ts";
import { I3_MEMBERS, M_SWEEP, N_SWEEP, NOMINAL_MEMBER, variantsFor, type VariantId, type WaveTable } from "./wavetable.ts";

export const REYNOLDS_RANGE = [0.9, 1.1];

export interface Interval {
  min: number;
  max: number;
  center: number;
  /** Nominal envelope before widening */
  env: [number, number];
  converged: boolean;
  uNum: number;
  /** Outward changes per input */
  widening: Record<string, [number, number]>;
  note: string;
}

interface InputExtreme {
  name: string;
  evals: EvalOptions[];
  /** Geometric variant whose own convergence is checked */
  variant?: VariantId;
}

function familyOf(id: CandidateId): string {
  return id.startsWith("A") ? "A" : id.startsWith("C") ? "C" : id.startsWith("B") ? "B" : id.startsWith("D") ? "D" : "E";
}

export function inputsFor(id: CandidateId, ctx: Ctx, base: EvalOptions): InputExtreme[] {
  const fam = familyOf(id);
  const out: InputExtreme[] = [];
  if (fam === "E") return out;
  out.push({ name: "I5", evals: REYNOLDS_RANGE.map((r) => ({ ...base, reynoldsFactor: r })) });
  if (fam === "A" || fam === "C") {
    const vs = variantsFor(ctx.geometry);
    out.push({ name: "I1", evals: [{ ...base, variant: "I1+" }, { ...base, variant: "I1-" }], variant: "I1+" });
    out.push({ name: "I2", evals: [{ ...base, variant: "I2" }], variant: "I2" });
    out.push({ name: "I3", evals: I3_MEMBERS.map((m) => ({ ...base, member: m })) });
    if (vs.includes("I6")) out.push({ name: "I6", evals: [{ ...base, variant: "I6" }], variant: "I6" });
    if (vs.includes("I7")) out.push({ name: "I7", evals: [{ ...base, variant: "I7" }], variant: "I7" });
    out.push({ name: "I8", evals: [{ ...base, variant: "I8" }], variant: "I8" });
  }
  if (fam === "B") {
    const lo = Math.min(ctx.endOfVariation, ctx.bodyLengthIn);
    const hi = Math.max(ctx.endOfVariation, ctx.bodyLengthIn);
    out.push({ name: "I9", evals: [lo, hi].map((l) => ({ ...base, bLength: l })) });
  }
  return out;
}

function envelope(values: (number[] | null)[]): [number, number] | null {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (!v) return null;
    for (const x of v) {
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
    }
  }
  return [lo, hi];
}

/** Interval of CD0 at one condition, or null (NA). */
export function cdInterval(id: CandidateId, ctx: Ctx, table: WaveTable, mach: number, sets: Params[], base: EvalOptions): Interval | null {
  if (id === "E" || id === "E0") {
    const b = baselineAt(id, ctx, mach);
    if (!b) return null;
    return { min: b.min, max: b.max, center: (b.min + b.max) / 2, env: [b.min, b.max], converged: true, uNum: 0, widening: {}, note: "" };
  }
  const env0 = envelope(sets.map((p) => curveMembers(id, ctx, table, mach, p, base)));
  if (!env0) return null;
  const [lo0, hi0] = env0;
  const widening: Record<string, [number, number]> = {};
  let sp = 0;
  let sm = 0;
  const fam = familyOf(id);
  for (const inp of inputsFor(id, ctx, base)) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const e of inp.evals) {
      const members = inp.variant && (fam === "A" || fam === "C") ? [NOMINAL_MEMBER, ...N_SWEEP, ...M_SWEEP] : [e.member];
      // A variant that converges counts at its nominal member; one that does not, over its whole sweep.
      let useMembers = [e.member];
      if (inp.variant) {
        const vals = (ms: string[]): number[] => ms.map((m) => centerOf(id, ctx, table, mach, sets[0]!, { ...e, member: m }));
        const nAx = vals(N_SWEEP) as [number, number, number];
        const mAx = vals(M_SWEEP) as [number, number, number];
        if (!(plateau(nAx).converged && plateau(mAx).converged)) useMembers = members;
      }
      for (const m of useMembers) {
        const r = envelope(sets.map((p) => curveMembers(id, ctx, table, mach, p, { ...e, member: m })));
        if (!r) continue;
        lo = Math.min(lo, r[0]);
        hi = Math.max(hi, r[1]);
      }
    }
    const dp = Math.max(0, hi - hi0);
    const dm = Math.max(0, lo0 - lo);
    widening[inp.name] = [dm, dp];
    sp += dp * dp;
    sm += dm * dm;
  }
  let min = lo0 - Math.sqrt(sm);
  let max = hi0 + Math.sqrt(sp);
  let converged = true;
  let uNum = 0;
  let note = "";
  if (fam === "A" || fam === "C") {
    const nom = centerOf(id, ctx, table, mach, sets[0]!, base);
    const nAx = N_SWEEP.map((m) => centerOf(id, ctx, table, mach, sets[0]!, { ...base, member: m })) as [number, number, number];
    const mAx = M_SWEEP.map((m) => centerOf(id, ctx, table, mach, sets[0]!, { ...base, member: m })) as [number, number, number];
    const pn = plateau(nAx);
    const pm = plateau(mAx);
    if (pn.converged && pm.converged) uNum = pn.lastChange + pm.lastChange;
    else {
      converged = false;
      note = "no converge";
      const devs = [...nAx, ...mAx].map((v) => v - nom);
      min = Math.min(min, lo0 + Math.min(0, ...devs));
      max = Math.max(max, hi0 + Math.max(0, ...devs));
    }
  }
  return { min, max, center: (min + max) / 2, env: [lo0, hi0], converged, uNum, widening, note };
}

function centerOf(id: CandidateId, ctx: Ctx, table: WaveTable, mach: number, prm: Params, o: EvalOptions): number {
  const w = waveTerm(id, ctx, table, mach, prm, o);
  const b = baseValues(ctx, mach, o.reynoldsFactor);
  return (Math.min(...b) + Math.max(...b)) / 2 + (w ?? Number.NaN);
}

// ---------- onset ----------

const baseGridCache = new Map<string, number[][]>();
/** Base variant values on the onset grid: rows = members (thickness x variant), columns = grid points. */
function baseGrid(ctx: Ctx, reynoldsFactor: number): number[][] {
  const key = `${ctx.id}|${reynoldsFactor}`;
  let g = baseGridCache.get(key);
  if (g) return g;
  const { min, max, step } = ONSET_GRID;
  const n = Math.round((max - min) / step);
  // Below M 1 the variant list is the same at every point (eight), which is where onsets fall.
  g = [];
  for (const w of ctx.wbs) {
    for (const v of variantsAt(0.9)) {
      const row: number[] = [];
      for (let i = 0; i <= n; i++) row.push(baseValue(w, min + i * step, v, reynoldsFactor));
      g.push(row);
    }
  }
  baseGridCache.set(key, g);
  return g;
}

function onsetOfMember(baseRow: number[], w: (m: number) => number | null): number | null {
  const { min, step } = ONSET_GRID;
  return onsetOf((m) => {
    const i = Math.round((m - min) / step);
    const ww = w(m);
    return ww === null ? Number.NaN : baseRow[i]! + ww;
  });
}

export interface OnsetInterval {
  min: number | null;
  max: number | null;
  center: number | null;
  /** Onset of the nominal curve (center of the base band); null is NA (A.2 d) */
  nominal: number | null;
  note: string;
}

/** Onset interval of a candidate (A.2 d and A.9): members' crossings, widened like CD0. */
export function onsetInterval(id: CandidateId, ctx: Ctx, table: WaveTable, sets: Params[], base: EvalOptions): OnsetInterval {
  if (id === "E0") return { min: null, max: null, center: null, nominal: null, note: "sin subida" };
  if (id === "E") {
    const b = baselineOnset(ctx);
    if (!b) return { min: null, max: null, center: null, nominal: null, note: "NA" };
    return { min: b.min, max: b.max, center: (b.min + b.max) / 2, nominal: (b.min + b.max) / 2, note: "" };
  }
  const memberOnsets = (o: EvalOptions): (number | null)[] => {
    const g = baseGrid(ctx, o.reynoldsFactor);
    const out: (number | null)[] = [];
    for (const p of sets) {
      const wf = (m: number): number | null => waveTerm(id, ctx, table, m, p, o);
      for (const row of g) out.push(onsetOfMember(row, wf));
    }
    return out;
  };
  const centerOnset = (o: EvalOptions): number | null => {
    const g = baseGrid(ctx, o.reynoldsFactor);
    const n = g[0]!.length;
    const center: number[] = [];
    for (let i = 0; i < n; i++) {
      let lo = Number.POSITIVE_INFINITY;
      let hi = Number.NEGATIVE_INFINITY;
      for (const row of g) {
        lo = Math.min(lo, row[i]!);
        hi = Math.max(hi, row[i]!);
      }
      center.push((lo + hi) / 2);
    }
    return onsetOfMember(center, (m) => waveTerm(id, ctx, table, m, sets[0]!, o));
  };
  const nominal = centerOnset(base);
  if (nominal === null) return { min: null, max: null, center: null, nominal: null, note: "NA: la curva nominal no llega a 0.1" };
  const m0 = memberOnsets(base);
  let note = "";
  const valid0 = m0.filter((x): x is number => x !== null);
  const lo0 = Math.min(...valid0);
  let hi0 = Math.max(...valid0);
  if (valid0.length < m0.length) {
    hi0 = ONSET_GRID.max;
    note = "algún miembro no llega a 0.1: máximo 1.20";
  }
  let sp = 0;
  let sm = 0;
  for (const inp of inputsFor(id, ctx, base)) {
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const e of inp.evals) {
      for (const x of memberOnsets(e)) {
        const v = x ?? ONSET_GRID.max;
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
    const dp = Math.max(0, hi - hi0);
    const dm = Math.max(0, lo0 - lo);
    sp += dp * dp;
    sm += dm * dm;
  }
  let min = lo0 - Math.sqrt(sm);
  let max = Math.min(ONSET_GRID.max, hi0 + Math.sqrt(sp));
  const fam = familyOf(id);
  if (fam === "A" || fam === "C") {
    const sweep = [...N_SWEEP, ...M_SWEEP].map((m) => centerOnset({ ...base, member: m }));
    const nAx = sweep.slice(0, 3).map((x) => x ?? ONSET_GRID.max) as [number, number, number];
    const mAx = sweep.slice(3).map((x) => x ?? ONSET_GRID.max) as [number, number, number];
    if (!(plateau(nAx, 0, 0.01).converged && plateau(mAx, 0, 0.01).converged)) {
      note = note ? `${note}; no converge` : "no converge";
      const devs = [...nAx, ...mAx].map((v) => v - nominal);
      min = Math.min(min, lo0 + Math.min(0, ...devs));
      max = Math.min(ONSET_GRID.max, Math.max(max, hi0 + Math.max(0, ...devs)));
    }
  }
  return { min, max, center: (min + max) / 2, nominal, note };
}
