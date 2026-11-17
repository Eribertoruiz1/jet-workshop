/**
 * The candidates' complete curves CD0(M) = base(M) + W(M) (PLAN.md, section 5),
 * the bridges P1-P3 and the onset relations O-E, O-1, O-2. Geometry, model
 * and wave table only: the data enter through `evaluate.ts` and `study.ts`.
 */

import { BIELAT_BODY, KORN_FACTOR_NACA6, MCRIT_OFFSET, dragDivergenceMach, dragRiseMach, geometry as physicsGeometry, type WingBody } from "../../../packages/physics/src/index.ts";
import { baselineBand, kornMasonLockBand, PARASITE_VARIANTS } from "../../../packages/validation/src/index.ts";
import { baseValue, variantsAt, wingBody, type BaseVariant } from "./base.ts";
import { aerosandboxShape, kornMasonMcrit, maxNormalArea, searsHaackCD } from "./bshape.ts";
import { buildConfiguration, loadConfigs } from "./config.ts";
import { FREEZE } from "./freeze.ts";
import { sweepAtFractionDeg } from "./planform.ts";
import { machKey, NOMINAL_MEMBER, type Members, type VariantId, type WaveTable } from "./wavetable.ts";

export const ONSET_GRID = { min: 0.6, max: 1.2, step: 0.0005 };
export const SLOPE_STEP = FREEZE.slopeStepAboveOne;

/** One configuration as the curves see it. */
export interface Ctx {
  /** Study id, e.g. "open:47deg-t04" or "RM L51I04a:47deg-t06" */
  id: string;
  geometry: string;
  sweep: number;
  /** Thickness ratios for the single-thickness relations (two for the thickened root: 0.06 and 0.12) */
  thicknesses: number[];
  /** Thickness for D: the exposed-area-weighted mean (equal to the section's for uniform wings) */
  meanThickness: number;
  wbs: WingBody[];
  bodyLengthIn: number;
  refAreaIn2: number;
  /** Exposed area over reference area (the strip weights of the current model) */
  exposedFraction: number;
  aMax: number;
  endOfVariation: number;
}

export function makeCtx(id: string, geometry: string, bodyLengthIn: number): Ctx {
  const cfg = buildConfiguration(geometry);
  const isRoot = geometry === "47deg-root12-t06";
  const thicknesses = isRoot ? [0.06, 0.12] : [Math.round(cfg.maxThicknessRoot * 100) / 100];
  const wbs = thicknesses.map((t) => wingBody(cfg.sweepQuarterChordDeg, t, bodyLengthIn));
  const g = physicsGeometry(wbs[0]!);
  const am = maxNormalArea(cfg);
  return {
    id,
    geometry,
    sweep: cfg.sweepQuarterChordDeg,
    thicknesses,
    meanThickness: Math.round(cfg.meanThickness * 1e4) / 1e4,
    wbs,
    bodyLengthIn,
    refAreaIn2: cfg.refAreaIn2,
    exposedFraction: g.exposedAreaIn2 / wbs[0]!.planform.areaIn2,
    aMax: am.area,
    endOfVariation: am.endOfVariation,
  };
}

export function defaultBodyLength(): number {
  return loadConfigs().body.lengthIn.l52b08 ?? BIELAT_BODY.lengthIn;
}

// ---------- base ----------

/** All base variant values at a Mach number (thicknesses x variants), with a Reynolds factor (I5). */
export function baseValues(ctx: Ctx, mach: number, reynoldsFactor = 1): number[] {
  const out: number[] = [];
  for (const w of ctx.wbs) for (const v of variantsAt(mach)) out.push(baseValue(w, mach, v, reynoldsFactor));
  return out;
}

const baseCenterCache = new Map<string, number>();
export function baseCenter(ctx: Ctx, mach: number, reynoldsFactor = 1): number {
  const k = `${ctx.id}|${mach.toFixed(5)}|${reynoldsFactor}`;
  let v = baseCenterCache.get(k);
  if (v === undefined) {
    const vals = baseValues(ctx, mach, reynoldsFactor);
    v = (Math.min(...vals) + Math.max(...vals)) / 2;
    baseCenterCache.set(k, v);
  }
  return v;
}

export function baseVariantList(ctx: Ctx, mach: number): { w: WingBody; v: BaseVariant }[] {
  return ctx.wbs.flatMap((w) => variantsAt(mach).map((v) => ({ w, v })));
}

// ---------- wave levels (A, C) ----------

export type LevelSource = "A" | "C";

export function levelAt(table: WaveTable, ctx: Ctx, mach: number, source: LevelSource, member = NOMINAL_MEMBER, variant: VariantId = "nominal"): number {
  const byMach = table.levels[ctx.geometry]?.[variant] ?? table.levels[ctx.geometry]!.nominal!;
  const pick = (m: Members): number => {
    const l = m[member] ?? m[NOMINAL_MEMBER]!;
    return source === "A" ? l.total : l.wing + l.body;
  };
  const exact = byMach[machKey(mach)];
  if (exact) return pick(exact);
  // Linear interpolation between computed Mach numbers (figures and onset search only).
  const keys = Object.keys(byMach).map(Number).sort((a, b) => a - b);
  if (mach <= keys[0]!) return pick(byMach[machKey(keys[0]!)]!);
  if (mach >= keys[keys.length - 1]!) return pick(byMach[machKey(keys[keys.length - 1]!)]!);
  let i = 0;
  while (keys[i + 1]! < mach) i++;
  const a = keys[i]!;
  const b = keys[i + 1]!;
  const fa = pick(byMach[machKey(a)]!);
  const fb = pick(byMach[machKey(b)]!);
  return fa + ((fb - fa) * (mach - a)) / (b - a);
}

// ---------- bridges ----------

export type Bridge = "P1" | "P2" | "P3";

export interface BridgeSpec {
  kind: Bridge;
  m0: number;
  /** Exponent of P2 (4 for P1) */
  p: number;
}

/** W below Mach 1 for a bridge from (M0, 0) to (1, W1) (slope S1 above 1 used by P3). */
export function bridgeW(b: BridgeSpec, mach: number, w1: number, s1: number): number {
  if (mach <= b.m0) return 0;
  const h = 1 - b.m0;
  const t = (mach - b.m0) / h;
  if (b.kind === "P3") return w1 * (3 * t * t - 2 * t ** 3) + s1 * h * (t ** 3 - t * t);
  return w1 * t ** b.p;
}

export function bridgeSlope(b: BridgeSpec, mach: number, w1: number, s1: number): number {
  if (mach <= b.m0) return 0;
  const h = 1 - b.m0;
  const t = (mach - b.m0) / h;
  if (b.kind === "P3") return (w1 * (6 * t - 6 * t * t) + s1 * h * (3 * t * t - 2 * t)) / h;
  return (w1 * b.p * t ** (b.p - 1)) / h;
}

/**
 * M0 of P2 or P3 such that the complete curve has slope 0.1 at the onset Mach
 * number `mOn` of the onset relation: the largest M0 below mOn that does it
 * (scan downward in steps of 0.0005, then bisection). If none exists in
 * [0.5, mOn), the bound closest to a crossing is returned and `ok` is false.
 */
export function solveBridgeM0(kind: "P2" | "P3", p: number, mOn: number, w1: number, s1: number, baseSlope: number): { m0: number; ok: boolean } {
  const target = 0.1 - baseSlope;
  const f = (m0: number): number => bridgeSlope({ kind, m0, p }, mOn, w1, s1) - target;
  if (mOn >= 1) return { m0: Math.min(0.999, mOn - 0.001), ok: false };
  let prev = mOn - 1e-6;
  let fPrev = f(prev);
  for (let m0 = mOn - 0.0005; m0 >= 0.5; m0 -= 0.0005) {
    const fv = f(m0);
    if ((fv >= 0) !== (fPrev >= 0)) {
      let lo = m0;
      let hi = prev;
      for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        if ((f(mid) >= 0) === (f(lo) >= 0)) lo = mid;
        else hi = mid;
      }
      return { m0: (lo + hi) / 2, ok: true };
    }
    prev = m0;
    fPrev = fv;
  }
  return { m0: 0.5, ok: false };
}

// ---------- onset relations ----------

export type Relation = "O-E" | "O-1" | "O-2";

export function midChordSweep(ctx: Ctx): number {
  return sweepAtFractionDeg({ aspectRatio: 3.5, taperRatio: 0.2, spanIn: 24 }, ctx.sweep, 0.5);
}

/** Korn-Mason drag-divergence Mach number of a relation (zero lift). */
export function relationMdd(ctx: Ctx, rel: Relation, param: number, thickness: number): number {
  const half = midChordSweep(ctx);
  if (rel === "O-E") return dragDivergenceMach(KORN_FACTOR_NACA6, thickness, 0, half);
  if (rel === "O-2") return dragDivergenceMach(param, thickness, 0, half);
  const cosE = Math.pow(Math.cos((half * Math.PI) / 180), param);
  const sweepE = (Math.acos(Math.min(1, cosE)) * 180) / Math.PI;
  return dragDivergenceMach(KORN_FACTOR_NACA6, thickness, 0, sweepE);
}

/**
 * Onset predicted by a relation: the lowest Mach number where the base center
 * plus the current model's rise with the relation's Mcrit (Lock's law on the
 * exposed strips) reaches a slope of 0.1. For O-E this is the current model.
 */
export function relationOnset(ctx: Ctx, rel: Relation, param: number): number | null {
  const outs: number[] = [];
  for (const t of ctx.thicknesses) {
    const mcrit = relationMdd(ctx, rel, param, t) - MCRIT_OFFSET;
    const curve = (m: number): number => baseCenter(ctx, m) + (m > mcrit ? ctx.exposedFraction * 20 * (m - mcrit) ** 4 : 0);
    const o = onsetOf(curve);
    if (o === null) return null;
    outs.push(o);
  }
  return outs.reduce((a, b) => a + b, 0) / outs.length;
}

/** Lowest Mach number where dCD0/dM reaches 0.1 on the grid of A.2 (d), as dragRiseMach does. */
export function onsetOf(curve: (m: number) => number): number | null {
  const { min, max, step } = ONSET_GRID;
  let prev = curve(min);
  const n = Math.round((max - min) / step);
  for (let i = 1; i <= n; i++) {
    const m = min + i * step;
    const cd = curve(m);
    if ((cd - prev) / step >= 0.1) return m - step / 2;
    prev = cd;
  }
  return null;
}

// ---------- the candidates ----------

export type CandidateId = "A2-P1" | "A2-P2" | "A2-P3" | "Ak-P1" | "Ak-P3" | "C-P1" | "C-P2" | "C-P3" | "B1" | "B2" | "D1" | "D2" | "E" | "E0";

export const CANDIDATES: { id: CandidateId; family: string; params: string[]; description: string }[] = [
  { id: "A2-P1", family: "A", params: ["M0"], description: "Regla de áreas (A1 a Mach 1, A2 por encima) con el puente P1" },
  { id: "A2-P2", family: "A", params: ["p", "rel"], description: "Regla de áreas con el puente P2 (exponente libre, M0 de la relación de inicio)" },
  { id: "A2-P3", family: "A", params: ["rel"], description: "Regla de áreas con el puente P3 (Hermite, M0 de la relación de inicio)" },
  { id: "Ak-P1", family: "A", params: ["k", "M0"], description: "Regla de áreas por un factor k, con P1" },
  { id: "Ak-P3", family: "A", params: ["k", "rel"], description: "Regla de áreas por un factor k, con P3" },
  { id: "C-P1", family: "C", params: ["M0"], description: "Teoría lineal por piezas (ala sola más fuselaje solo) con P1" },
  { id: "C-P2", family: "C", params: ["p", "rel"], description: "Teoría lineal por piezas con P2" },
  { id: "C-P3", family: "C", params: ["rel"], description: "Teoría lineal por piezas con P3" },
  { id: "B1", family: "B", params: [], description: "Sears-Haack por E_WD = 1 con la forma de AeroSandbox" },
  { id: "B2", family: "B", params: ["EWD"], description: "Sears-Haack por E_WD ajustado con la forma de AeroSandbox" },
  { id: "D1", family: "D", params: [], description: "Semejanza transónica: media de las curvas propias de las dos alas de entrenamiento" },
  { id: "D2", family: "D", params: ["L", "xic"], description: "Semejanza transónica: logística ajustada (anchura fijada)" },
  { id: "E", family: "E", params: [], description: "Línea base: el modelo actual, korn-mason-lock" },
  { id: "E0", family: "E", params: [], description: "Línea base: baseline-incompressible, sin subida" },
];

export const PARAM_RANGES: Record<string, [number, number]> = {
  M0: [0.8, 0.99],
  p: [1, 8],
  k: [0.5, 1.5],
  EWD: [1, 4],
  "rel:O-1": [0, 1],
  "rel:O-2": [0.8, 1.0],
  L: [0, 20],
  xic: [-3, 3],
};

/** Parameters of one evaluation; `rel` holds the onset relation and its parameter for P2 and P3. */
export interface Params {
  M0?: number;
  p?: number;
  k?: number;
  EWD?: number;
  rel?: { kind: Relation; value: number };
  L?: number;
  xic?: number;
}

/** D: training curve in the similarity variables, built by fit.ts from data. */
export interface SimilarityCurve {
  /** One sorted (xi, reduced CD) list per training wing */
  wings: { xi: number[]; c: number[] }[];
}

export function similarityXi(mach: number, tau: number): number {
  return (mach * mach - 1) / Math.pow((FREEZE.gamma + 1) * tau, 2 / 3);
}
export function reducedFactor(tau: number): number {
  return Math.pow(FREEZE.gamma + 1, 1 / 3) / Math.pow(tau, 5 / 3);
}

/** Inputs that change a curve without being parameters: numerical member, geometry variant, Reynolds factor, B length. */
export interface EvalOptions {
  member: string;
  variant: VariantId;
  reynoldsFactor: number;
  /** Length for Sears-Haack (I9), inches */
  bLength?: number;
  similarity?: SimilarityCurve;
}

export const NOMINAL_EVAL: EvalOptions = { member: NOMINAL_MEMBER, variant: "nominal", reynoldsFactor: 1 };

/**
 * The wave term W(M) of a candidate (null where it has no prediction).
 * For bridge candidates, M0 of P2 and P3 is solved from the relation onset.
 */
export function waveTerm(id: CandidateId, ctx: Ctx, table: WaveTable, mach: number, prm: Params, o: EvalOptions): number | null {
  if (id === "E" || id === "E0") return null;
  if (id === "B1" || id === "B2") {
    const vals = bPerThickness(id, ctx, mach, prm, o);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  if (id === "D1" || id === "D2") {
    const tau = ctx.meanThickness;
    const xi = similarityXi(mach, tau);
    let c: number | null;
    if (id === "D2") {
      c = (prm.L ?? 0) / (1 + Math.exp(-(xi - (prm.xic ?? 0)) / FREEZE.d2Width));
    } else {
      const sim = o.similarity;
      if (!sim) return null;
      const vals: number[] = [];
      for (const w of sim.wings) {
        if (xi < w.xi[0]! || xi > w.xi[w.xi.length - 1]!) return null;
        let i = 0;
        while (i + 2 < w.xi.length && w.xi[i + 1]! < xi) i++;
        const a = w.xi[i]!;
        const b = w.xi[i + 1]!;
        vals.push(w.c[i]! + ((w.c[i + 1]! - w.c[i]!) * (xi - a)) / (b - a));
      }
      c = vals.reduce((x, y) => x + y, 0) / vals.length;
    }
    return c / reducedFactor(tau);
  }
  // A and C families.
  const source: LevelSource = id.startsWith("C") ? "C" : "A";
  const k = id.startsWith("Ak") ? (prm.k ?? 1) : 1;
  const lvl = (m: number): number => k * levelAt(table, ctx, m, source, o.member, o.variant);
  if (mach >= 1) return lvl(mach);
  const w1 = lvl(1);
  const s1 = (lvl(1 + SLOPE_STEP) - w1) / SLOPE_STEP;
  const kind = id.endsWith("P1") ? "P1" : id.endsWith("P2") ? "P2" : "P3";
  if (kind === "P1") return bridgeW({ kind, m0: prm.M0 ?? 0.9, p: 4 }, mach, w1, s1);
  const m0 = bridgeM0For(id, ctx, table, prm, o);
  return bridgeW({ kind, m0, p: prm.p ?? 4 }, mach, w1, s1);
}

/** B's wave term for each thickness of the configuration (two for the thickened root). */
export function bPerThickness(id: "B1" | "B2", ctx: Ctx, mach: number, prm: Params, o: EvalOptions): number[] {
  const ewd = id === "B1" ? FREEZE.ewdB1 : (prm.EWD ?? 1);
  const l = o.bLength ?? ctx.bodyLengthIn;
  const level = searsHaackCD(ctx.aMax, l, ctx.refAreaIn2) * ewd;
  const half = midChordSweep(ctx);
  return ctx.thicknesses.map((t) => level * aerosandboxShape(mach, kornMasonMcrit(t, half)));
}

const m0Cache = new Map<string, number>();
export function bridgeM0For(id: CandidateId, ctx: Ctx, table: WaveTable, prm: Params, o: EvalOptions): number {
  const key = `${id}|${ctx.id}|${JSON.stringify(prm)}|${o.member}|${o.variant}|${o.reynoldsFactor}`;
  const hit = m0Cache.get(key);
  if (hit !== undefined) return hit;
  const source: LevelSource = id.startsWith("C") ? "C" : "A";
  const k = id.startsWith("Ak") ? (prm.k ?? 1) : 1;
  const lvl = (m: number): number => k * levelAt(table, ctx, m, source, o.member, o.variant);
  const w1 = lvl(1);
  const s1 = (lvl(1 + SLOPE_STEP) - w1) / SLOPE_STEP;
  const rel = prm.rel ?? { kind: "O-E" as Relation, value: 0 };
  const mOn = relationOnset(ctx, rel.kind, rel.value) ?? 0.99;
  const h = 1e-4;
  const baseSlope = (baseCenter(ctx, mOn + h, o.reynoldsFactor) - baseCenter(ctx, mOn - h, o.reynoldsFactor)) / (2 * h);
  const kind = id.endsWith("P2") ? "P2" : "P3";
  const m0 = solveBridgeM0(kind, prm.p ?? 4, mOn, w1, s1, baseSlope).m0;
  m0Cache.set(key, m0);
  return m0;
}

/** E and E0 at a Mach number: the bands of packages/validation (NA beyond Lock or above M 1.13 for E). */
export function baselineAt(id: "E" | "E0", ctx: Ctx, mach: number): { min: number; max: number } | null {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const w of ctx.wbs) {
    const b = id === "E" ? kornMasonLockBand(w, { mach, cl: 0 }) : baselineBand(w, { mach, cl: 0 });
    if (id === "E" && (b.beyondLock || mach > 1.13)) return null;
    lo = Math.min(lo, b.min);
    hi = Math.max(hi, b.max);
  }
  return { min: lo, max: hi };
}

/** E's onset band: dragRiseMach over the eight variants (and both thicknesses for the thickened root). */
export function baselineOnset(ctx: Ctx): { min: number; max: number } | null {
  const vals: number[] = [];
  for (const w of ctx.wbs) {
    for (const v of PARASITE_VARIANTS) {
      const m = dragRiseMach(v.model, w, 0);
      if (m === null) return null;
      vals.push(m);
    }
  }
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

/** Complete curve, center of the base band plus W (null where the candidate has no prediction). */
export function curveCenter(id: CandidateId, ctx: Ctx, table: WaveTable, mach: number, prm: Params, o: EvalOptions = NOMINAL_EVAL): number | null {
  if (id === "E" || id === "E0") {
    const b = baselineAt(id, ctx, mach);
    return b ? (b.min + b.max) / 2 : null;
  }
  const w = waveTerm(id, ctx, table, mach, prm, o);
  if (w === null) return null;
  return baseCenter(ctx, mach, o.reynoldsFactor) + w;
}

/** The envelope members of a curve at one condition: every base variant plus W. */
export function curveMembers(id: CandidateId, ctx: Ctx, table: WaveTable, mach: number, prm: Params, o: EvalOptions = NOMINAL_EVAL): number[] | null {
  if (id === "E" || id === "E0") {
    const b = baselineAt(id, ctx, mach);
    return b ? [b.min, b.max] : null;
  }
  if (id === "B1" || id === "B2") {
    const ws = bPerThickness(id, ctx, mach, prm, o);
    return ctx.wbs.flatMap((w, i) => variantsAt(mach).map((v) => baseValue(w, mach, v, o.reynoldsFactor) + ws[i]!));
  }
  const w = waveTerm(id, ctx, table, mach, prm, o);
  if (w === null) return null;
  return baseValues(ctx, mach, o.reynoldsFactor).map((b) => b + w);
}

/** Onset of a complete curve (center of the base band), or null if it does not reach 0.1 below M 1.2. */
export function curveOnset(id: CandidateId, ctx: Ctx, table: WaveTable, prm: Params, o: EvalOptions = NOMINAL_EVAL): number | null {
  if (id === "E") {
    const b = baselineOnset(ctx);
    return b ? (b.min + b.max) / 2 : null;
  }
  if (id === "E0") return null;
  return onsetOf((m) => curveCenter(id, ctx, table, m, prm, o) ?? Number.NaN);
}
