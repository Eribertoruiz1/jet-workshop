/**
 * Open-data evaluation (PREREGISTRATION.md, A.4 and A.9): three leave-one-wing-out
 * rotations, bounded least-squares fits on the two training wings (T2 and T3
 * samples, centre of the band), predictions of the wing left out, the metrics
 * and the selection rule. Reads drag data through data.ts.
 */

import type { TestedWingId } from "../../../packages/physics/src/index.ts";
import { segmentOf, type Segment } from "./conditions.ts";
import { dataOnset, type OpenData, type Sample } from "./data.ts";
import { cdInterval, onsetInterval, type Interval, type OnsetInterval } from "./interval.ts";
import {
  baseCenter,
  CANDIDATES,
  curveCenter,
  makeCtx,
  NOMINAL_EVAL,
  PARAM_RANGES,
  reducedFactor,
  relationOnset,
  similarityXi,
  type CandidateId,
  type Ctx,
  type EvalOptions,
  type Params,
  type Relation,
  type SimilarityCurve,
} from "./model.ts";
import { minimise1D } from "./numerics.ts";
import type { WaveTable } from "./wavetable.ts";

export const THRESHOLD_CD = 0.003;
export const THRESHOLD_ONSET = 0.03;
export const TIE = 0.0005;

/** Candidates added after gate 1 (A.9): evaluated on open data, reported with their mark, never recommended. */
export const ADDED_AFTER_GATE_1: CandidateId[] = ["B1-P1"];

export interface OpenWing {
  id: TestedWingId;
  config: string;
  ctx: Ctx;
  samples: (Sample & { segment: Segment })[];
  onset: { mach: number; uD: number; source: string } | null;
}

export const OPEN_WINGS: { id: TestedWingId; config: string; geometry: string }[] = [
  { id: "10.8", config: "10.8deg-t04", geometry: "open-10.8" },
  { id: "35", config: "35deg-t04", geometry: "open-35" },
  { id: "47", config: "47deg-t04", geometry: "open-47" },
];

export const ROTATIONS: { id: string; out: TestedWingId; train: TestedWingId[] }[] = [
  { id: "R1", out: "10.8", train: ["35", "47"] },
  { id: "R2", out: "35", train: ["10.8", "47"] },
  { id: "R3", out: "47", train: ["10.8", "35"] },
];

export function openWings(data: OpenData, bodyLengthIn: number): OpenWing[] {
  return OPEN_WINGS.map((w) => {
    const samples = data.samples.filter((s) => s.wing === w.id).map((s) => ({ ...s, segment: segmentOf(s.mach) }));
    return { id: w.id, config: w.config, ctx: makeCtx(`open:${w.config}`, w.geometry, bodyLengthIn), samples, onset: dataOnset(samples, w.id) };
  });
}

// ---------- onset relations ----------

export function fitRelation(rel: Relation, train: OpenWing[]): number {
  if (rel === "O-E") return 0;
  const [lo, hi] = PARAM_RANGES[`rel:${rel}`]!;
  const f = (p: number): number => {
    let s = 0;
    for (const w of train) {
      const o = relationOnset(w.ctx, rel, p);
      if (!w.onset) continue;
      s += o === null ? 1 : (o - w.onset.mach) ** 2;
    }
    return s;
  };
  return minimise1D(f, lo, hi, 41).x;
}

export interface RelationResult {
  rel: Relation;
  rotations: { id: string; param: number; predicted: number | null; data: number | null; error: number | null }[];
  rms: number;
  maxAbs: number;
}

export function evaluateRelations(wings: OpenWing[]): RelationResult[] {
  return (["O-E", "O-1", "O-2"] as Relation[]).map((rel) => {
    const rotations = ROTATIONS.map((r) => {
      const train = wings.filter((w) => r.train.includes(w.id));
      const out = wings.find((w) => w.id === r.out)!;
      const param = fitRelation(rel, train);
      const predicted = relationOnset(out.ctx, rel, param);
      const data = out.onset?.mach ?? null;
      return { id: r.id, param, predicted, data, error: predicted !== null && data !== null ? predicted - data : null };
    });
    const errs = rotations.map((x) => (x.error === null ? Number.POSITIVE_INFINITY : x.error));
    return { rel, rotations, rms: Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / errs.length), maxAbs: Math.max(...errs.map(Math.abs)) };
  });
}

/** The onset relation for P2 and P3: O-1 or O-2, the smaller RMS of the left-out error (then the smaller maximum). */
export function bestRelation(rs: RelationResult[]): Relation {
  const c = rs.filter((r) => r.rel !== "O-E").sort((a, b) => a.rms - b.rms || a.maxAbs - b.maxAbs);
  return c[0]!.rel;
}

// ---------- fits ----------

export function similarityCurve(train: OpenWing[]): SimilarityCurve {
  return {
    wings: train.map((w) => {
      const tau = w.ctx.meanThickness;
      const pts = w.samples
        .map((s) => ({ xi: similarityXi(s.mach, tau), c: reducedFactor(tau) * (s.cd0 - baseCenter(w.ctx, s.mach)) }))
        .sort((a, b) => a.xi - b.xi);
      return { xi: pts.map((p) => p.xi), c: pts.map((p) => p.c) };
    }),
  };
}

function trainingSamples(train: OpenWing[]): { w: OpenWing; s: Sample }[] {
  return train.flatMap((w) => w.samples.filter((s) => s.mach > 0.9).map((s) => ({ w, s })));
}

function sse(id: CandidateId, train: OpenWing[], table: WaveTable, prm: Params, o: EvalOptions): number {
  let s = 0;
  for (const { w, s: smp } of trainingSamples(train)) {
    const c = curveCenter(id, w.ctx, table, smp.mach, prm, o);
    s += c === null ? 1 : (c - smp.cd0) ** 2;
  }
  return s;
}

function minimise2D(f: (a: number, b: number) => number, ra: [number, number], rb: [number, number]): [number, number] {
  let best: [number, number] = [ra[0], rb[0]];
  let bestF = Number.POSITIVE_INFINITY;
  const n = 21;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const a = ra[0] + ((ra[1] - ra[0]) * i) / (n - 1);
      const b = rb[0] + ((rb[1] - rb[0]) * j) / (n - 1);
      const v = f(a, b);
      if (v < bestF) {
        bestF = v;
        best = [a, b];
      }
    }
  }
  let [a, b] = best;
  for (let round = 0; round < 6; round++) {
    a = minimise1D((x) => f(x, b), ra[0], ra[1], 21).x;
    b = minimise1D((y) => f(a, y), rb[0], rb[1], 21).x;
  }
  return f(a, b) <= bestF ? [a, b] : best;
}

export interface Fit {
  params: Params;
  similarity?: SimilarityCurve;
}

export function fitCandidate(id: CandidateId, train: OpenWing[], table: WaveTable, rel: Relation): Fit {
  const o = NOMINAL_EVAL;
  const relFit = (): { kind: Relation; value: number } => ({ kind: rel, value: fitRelation(rel, train) });
  switch (id) {
    case "A2-P1":
    case "C-P1":
    case "B1-P1": {
      const [lo, hi] = PARAM_RANGES.M0!;
      return { params: { M0: minimise1D((m) => sse(id, train, table, { M0: m }, o), lo, hi).x } };
    }
    case "A2-P2":
    case "C-P2": {
      const r = relFit();
      const [lo, hi] = PARAM_RANGES.p!;
      return { params: { rel: r, p: minimise1D((p) => sse(id, train, table, { rel: r, p }, o), lo, hi, 29).x } };
    }
    case "A2-P3":
    case "C-P3":
      return { params: { rel: relFit() } };
    case "Ak-P1": {
      const [k, m0] = minimise2D((a, b) => sse(id, train, table, { k: a, M0: b }, o), PARAM_RANGES.k!, PARAM_RANGES.M0!);
      return { params: { k, M0: m0 } };
    }
    case "Ak-P3": {
      const r = relFit();
      const [lo, hi] = PARAM_RANGES.k!;
      return { params: { rel: r, k: minimise1D((k) => sse(id, train, table, { rel: r, k }, o), lo, hi).x } };
    }
    case "B2": {
      const [lo, hi] = PARAM_RANGES.EWD!;
      return { params: { EWD: minimise1D((e) => sse(id, train, table, { EWD: e }, o), lo, hi).x } };
    }
    case "D1":
      return { params: {}, similarity: similarityCurve(train) };
    case "D2": {
      const [L, xic] = minimise2D((a, b) => sse(id, train, table, { L: a, xic: b }, o), PARAM_RANGES.L!, PARAM_RANGES.xic!);
      return { params: { L, xic } };
    }
    default:
      return { params: {} };
  }
}

// ---------- leave-one-out evaluation ----------

export interface Prediction {
  rotation: string;
  wing: TestedWingId;
  mach: number;
  segment: Segment;
  D: number;
  uD: number;
  interval: Interval | null;
  /** E = S - D with S the centre of the predicted interval (A.7) */
  E: number | null;
  r: number | null;
}

export interface OnsetPrediction {
  rotation: string;
  wing: TestedWingId;
  predicted: OnsetInterval;
  data: { mach: number; uD: number; source: string } | null;
  E: number | null;
}

export interface CandidateResult {
  id: CandidateId;
  nParams: number;
  fits: Record<string, Fit>;
  predictions: Prediction[];
  onsets: OnsetPrediction[];
  metrics: Metrics;
}

export interface Metrics {
  main: number;
  t3: number;
  t2: number;
  onsetMaxAbs: number;
  nPredicted: number;
  nMissing: number;
  bias: number;
  maxAbs: number;
  hitRate: number;
  noConverge: number;
}

function rms(xs: number[]): number {
  return xs.length ? Math.sqrt(xs.reduce((a, x) => a + x * x, 0) / xs.length) : Number.NaN;
}

export function metricsOf(preds: Prediction[], onsets: OnsetPrediction[]): Metrics {
  const sel = preds.filter((p) => p.segment === "T2" || p.segment === "T3");
  const got = sel.filter((p) => p.E !== null);
  const es = got.map((p) => p.E!);
  const onsetErr = onsets.map((o) => (o.E === null ? Number.POSITIVE_INFINITY : Math.abs(o.E)));
  return {
    main: rms(es),
    t3: rms(got.filter((p) => p.segment === "T3").map((p) => p.E!)),
    t2: rms(got.filter((p) => p.segment === "T2").map((p) => p.E!)),
    onsetMaxAbs: Math.max(...onsetErr),
    nPredicted: got.length,
    nMissing: sel.length - got.length,
    bias: es.reduce((a, b) => a + b, 0) / (es.length || 1),
    maxAbs: Math.max(0, ...es.map(Math.abs)),
    hitRate: sel.length ? got.filter((p) => Math.abs(p.E!) <= THRESHOLD_CD).length / sel.length : Number.NaN,
    noConverge: sel.filter((p) => p.interval && !p.interval.converged).length,
  };
}

export function evaluateCandidate(id: CandidateId, wings: OpenWing[], table: WaveTable, rel: Relation): CandidateResult {
  const fits: Record<string, Fit> = {};
  const predictions: Prediction[] = [];
  const onsets: OnsetPrediction[] = [];
  for (const r of ROTATIONS) {
    const train = wings.filter((w) => r.train.includes(w.id));
    const out = wings.find((w) => w.id === r.out)!;
    const fit = fitCandidate(id, train, table, rel);
    fits[r.id] = fit;
    const o: EvalOptions = fit.similarity ? { ...NOMINAL_EVAL, similarity: fit.similarity } : NOMINAL_EVAL;
    for (const s of out.samples) {
      const iv = cdInterval(id, out.ctx, table, s.mach, [fit.params], o);
      const E = iv ? iv.center - s.cd0 : null;
      const uVal = iv ? Math.sqrt(s.uD ** 2 + iv.uNum ** 2 + ((iv.max - iv.min) / 2) ** 2) : null;
      predictions.push({ rotation: r.id, wing: out.id, mach: s.mach, segment: s.segment, D: s.cd0, uD: s.uD, interval: iv, E, r: E !== null && uVal ? Math.abs(E) / uVal : null });
    }
    const on = onsetInterval(id, out.ctx, table, [fit.params], o);
    onsets.push({ rotation: r.id, wing: out.id, predicted: on, data: out.onset, E: on.center !== null && out.onset ? on.center - out.onset.mach : null });
  }
  const spec = CANDIDATES.find((c) => c.id === id)!;
  return { id, nParams: spec.params.length, fits, predictions, onsets, metrics: metricsOf(predictions, onsets) };
}

// ---------- selection (A.9) ----------

export interface Ranking {
  order: CandidateId[];
  improvesE: Record<string, boolean>;
  improvesE0: Record<string, boolean>;
  recommendation: { id: CandidateId | null; verdict: "construir" | "construir con reservas" | "no construir"; reasons: string[] };
}

/**
 * A.9: a candidate improves on a baseline when it predicts every T2 and T3
 * sample and its RMS of E is smaller on the samples the baseline predicts.
 */
export function improvesOn(c: CandidateResult, base: CandidateResult): boolean {
  const key = (p: Prediction): string => `${p.wing}|${p.mach}`;
  const bmap = new Map(base.predictions.map((p) => [key(p), p]));
  const cs = c.predictions.filter((p) => p.segment === "T2" || p.segment === "T3");
  if (cs.some((p) => p.E === null)) return false;
  const shared = cs.filter((p) => bmap.get(key(p))?.E != null);
  if (!shared.length) return true;
  return rms(shared.map((p) => p.E!)) < rms(shared.map((p) => bmap.get(key(p))!.E!));
}

export function rank(results: CandidateResult[]): Ranking {
  const E = results.find((r) => r.id === "E")!;
  const E0 = results.find((r) => r.id === "E0")!;
  const improvesE: Record<string, boolean> = {};
  const improvesE0: Record<string, boolean> = {};
  for (const r of results) {
    improvesE[r.id] = r.id !== "E" && improvesOn(r, E);
    improvesE0[r.id] = r.id !== "E0" && improvesOn(r, E0);
  }
  const eligible = results.filter((r) => r.id !== "E" && r.id !== "E0" && r.id !== "D1");
  const cmp = (a: CandidateResult, b: CandidateResult): number => {
    const ma = a.metrics.nMissing > 0 ? Number.POSITIVE_INFINITY : a.metrics.main;
    const mb = b.metrics.nMissing > 0 ? Number.POSITIVE_INFINITY : b.metrics.main;
    if (Number.isFinite(ma) && Number.isFinite(mb) && Math.abs(ma - mb) < TIE) {
      if (a.nParams !== b.nParams) return a.nParams - b.nParams;
      if (a.metrics.onsetMaxAbs !== b.metrics.onsetMaxAbs) return a.metrics.onsetMaxAbs - b.metrics.onsetMaxAbs;
      return 0;
    }
    return ma - mb;
  };
  const sorted = [...eligible].sort(cmp);
  const order = [...sorted.map((r) => r.id), "D1", "E", "E0"] as CandidateId[];
  // Candidates added after gate 1 are ranked but cannot be recommended (PREREGISTRATION.md, A.9).
  const top = sorted.find((r) => !ADDED_AFTER_GATE_1.includes(r.id)) ?? null;
  const reasons: string[] = [];
  let verdict: Ranking["recommendation"]["verdict"] = "no construir";
  if (top) {
    const better = improvesE[top.id] && improvesE0[top.id];
    if (!improvesE[top.id]) reasons.push("no mejora la línea base E");
    if (!improvesE0[top.id]) reasons.push("no mejora E0");
    if (better) {
      const c1 = top.metrics.main <= THRESHOLD_CD;
      const c2 = top.metrics.t3 <= THRESHOLD_CD;
      const c3 = top.metrics.onsetMaxAbs <= THRESHOLD_ONSET;
      if (!c1) reasons.push(`métrica principal ${top.metrics.main.toFixed(4)} > ${THRESHOLD_CD}`);
      if (!c2) reasons.push(`media cuadrática de T3 ${top.metrics.t3.toFixed(4)} > ${THRESHOLD_CD}`);
      if (!c3) reasons.push(`mayor error del inicio ${Number.isFinite(top.metrics.onsetMaxAbs) ? top.metrics.onsetMaxAbs.toFixed(3) : "NA"} > ${THRESHOLD_ONSET}`);
      verdict = c1 && c2 && c3 ? "construir" : "construir con reservas";
    }
  }
  return { order, improvesE, improvesE0, recommendation: { id: top?.id ?? null, verdict, reasons } };
}
