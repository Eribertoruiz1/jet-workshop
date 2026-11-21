/**
 * Phase B: the blind predictions (PREREGISTRATION.md, A.9, "Formato de las
 * predicciones" and "Parámetros de las predicciones finales").
 * - Parameters: the three rotation values, never a fit with the three wings;
 *   the nominal curve uses their median (A.2 d).
 * - Interval: the registered rule of A.9 over the three parameter sets (and
 *   their median), widened by the uncertain inputs and extended where the
 *   sweep does not converge (A.7). For D1, which has no parameters, the union
 *   of the three rotations' curves; NA if any rotation has no prediction.
 * - predictions.csv: the recommended method and the baseline;
 *   predictions-all.csv: every complete curve except E0, the same format.
 * Uses only geometry, the test conditions of the held-out sheet and the
 * fits made on open data. No held-out value is read.
 */

import { reynoldsPerInch } from "../../../packages/physics/src/index.ts";
import { loadConditionsFile, segmentOf } from "./conditions.ts";
import type { CandidateResult } from "./evaluate.ts";
import { cdInterval, onsetInterval, REYNOLDS_RANGE } from "./interval.ts";
import { CANDIDATES, makeCtx, NOMINAL_EVAL, type CandidateId, type EvalOptions, type Params } from "./model.ts";
import { loadConfigs } from "./config.ts";
import { geometryOf } from "./requests.ts";
import type { WaveTable } from "./wavetable.ts";

export const RECOMMENDED: CandidateId = "B1";
export const BASELINE_METHOD = "baseline-korn-mason-lock";

/** Curves in predictions-all.csv: every complete curve except E0 (PLAN.md, section 5). */
export const ALL_METHODS: CandidateId[] = CANDIDATES.map((c) => c.id).filter((id) => id !== "E0");

/**
 * Reynolds number of the held-out reports against the tunnel line of
 * tunnel.ts (input I5 must cover it; PLAN.md, section 4). From
 * docs/studies/heldout-geometry.md, "Test conditions": RM L51K16a 2.7 million;
 * RM L51I04a 2.0 million at M 0.50 to 2.5 million at M 1.12, the same line.
 */
export function reynoldsCoverage(): { report: string; mach: number; factor: number; covered: boolean }[] {
  const mac = 7.874;
  const k16a = 2.7e6 / (reynoldsPerInch(1.6) * mac);
  return [
    { report: "RM L51K16a", mach: 1.6, factor: k16a, covered: k16a >= REYNOLDS_RANGE[0]! && k16a <= REYNOLDS_RANGE[1]! },
    { report: "RM L51I04a", mach: 0.5, factor: 2.0e6 / (reynoldsPerInch(0.5) * mac), covered: true },
    { report: "RM L51I04a", mach: 1.12, factor: 2.5e6 / (reynoldsPerInch(1.12) * mac), covered: true },
  ];
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** The three rotation parameter sets of a curve, with their median first (the nominal curve). */
export function parameterSets(r: CandidateResult): Params[] {
  const sets = ["R1", "R2", "R3"].map((k) => r.fits[k]!.params);
  const med: Params = {};
  const num = (k: "M0" | "p" | "k" | "EWD" | "L" | "xic"): void => {
    const v = sets.map((s) => s[k]).filter((x): x is number => x !== undefined);
    if (v.length === 3) med[k] = median(v);
  };
  for (const k of ["M0", "p", "k", "EWD", "L", "xic"] as const) num(k);
  if (sets[0]!.rel) med.rel = { kind: sets[0]!.rel.kind, value: median(sets.map((s) => s.rel!.value)) };
  return [med, ...sets];
}

export interface PredictionRow {
  config: string;
  report: string;
  mach: number | null;
  quantity: "cd0" | "drag_rise_mach";
  method: string;
  min: number | null;
  max: number | null;
  note: string;
}

export function heldoutPredictions(results: CandidateResult[], table: WaveTable): PredictionRow[] {
  const f = loadConditionsFile();
  const lengths = loadConfigs().body.lengthIn;
  const rows: PredictionRow[] = [];
  for (const id of ALL_METHODS) {
    const r = results.find((x) => x.id === id)!;
    const method = id === "E" ? BASELINE_METHOD : id;
    const sets = parameterSets(r);
    const sims = ["R1", "R2", "R3"].map((k) => r.fits[k]!.similarity);
    for (const h of f.heldout) {
      const bodyLength = h.report === "RM L51K16a" ? lengths.l51k16a! : lengths.l51i04a!;
      const ctx = makeCtx(`${h.report}:${h.config}`, geometryOf(h.config), bodyLength);
      const evalFor = (i: number): EvalOptions => (sims[i] ? { ...NOMINAL_EVAL, similarity: sims[i]! } : NOMINAL_EVAL);
      for (const mach of h.machs) {
        let min: number | null = null;
        let max: number | null = null;
        let note = "";
        if (id === "D1") {
          const ivs = [0, 1, 2].map((i) => cdInterval(id, ctx, table, mach, [{}], evalFor(i)));
          if (ivs.every((iv) => iv !== null)) {
            min = Math.min(...ivs.map((iv) => iv!.min));
            max = Math.max(...ivs.map((iv) => iv!.max));
          }
        } else {
          const iv = cdInterval(id, ctx, table, mach, sets, NOMINAL_EVAL);
          if (iv) {
            min = iv.min;
            max = iv.max;
            note = iv.note;
          }
        }
        rows.push({ config: h.config, report: h.report, mach, quantity: "cd0", method, min, max, note: `${segmentOf(mach)}${note ? `; ${note}` : ""}` });
      }
      if (h.machs.some((m) => segmentOf(m) !== "T4")) {
        let min: number | null = null;
        let max: number | null = null;
        let note = "";
        if (id === "D1") {
          const ons = [0, 1, 2].map((i) => onsetInterval(id, ctx, table, [{}], evalFor(i)));
          if (ons.every((o) => o.center !== null)) {
            min = Math.min(...ons.map((o) => o.min!));
            max = Math.max(...ons.map((o) => o.max!));
          } else note = "NA: alguna rotación no llega a 0.1";
        } else {
          const on = onsetInterval(id, ctx, table, sets, NOMINAL_EVAL);
          min = on.min;
          max = on.max;
          note = on.note;
        }
        rows.push({ config: h.config, report: h.report, mach: null, quantity: "drag_rise_mach", method, min, max, note });
      }
    }
  }
  return rows;
}

function fmt(v: number | null, q: PredictionRow["quantity"]): string {
  if (v === null || !Number.isFinite(v)) return "NA";
  return q === "cd0" ? v.toFixed(4) : v.toFixed(3);
}

export function predictionsCsv(rows: PredictionRow[], methods: string[]): string {
  const out = ["config,mach,quantity,method,predicted_min,predicted_max"];
  for (const r of rows.filter((x) => methods.includes(x.method))) {
    out.push([r.config, r.mach === null ? "" : r.mach.toFixed(3), r.quantity, r.method, fmt(r.min, r.quantity), fmt(r.max, r.quantity)].join(","));
  }
  return out.join("\n") + "\n";
}

/** Check 4 of the brief: every condition of the sheet has a row per quantity for every method listed. */
export function coverage(rows: PredictionRow[], methods: string[]): { expected: number; found: number; missing: string[]; na: number } {
  const f = loadConditionsFile();
  const missing: string[] = [];
  let expected = 0;
  let found = 0;
  let na = 0;
  for (const m of methods) {
    for (const h of f.heldout) {
      const keys: { mach: number | null; q: PredictionRow["quantity"] }[] = h.machs.map((mach) => ({ mach, q: "cd0" as const }));
      if (h.machs.some((x) => segmentOf(x) !== "T4")) keys.push({ mach: null, q: "drag_rise_mach" });
      for (const k of keys) {
        expected++;
        const r = rows.find((x) => x.method === m && x.config === h.config && x.report === h.report && x.quantity === k.q && x.mach === k.mach);
        if (!r) missing.push(`${m} ${h.config} ${h.report} ${k.q} ${k.mach ?? ""}`);
        else {
          found++;
          if (r.min === null || r.max === null) na++;
        }
      }
    }
  }
  return { expected, found, missing, na };
}
