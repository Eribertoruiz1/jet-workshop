/**
 * The open-data study (PLAN.md, steps 4 to 6): reads the open drag data, runs
 * every candidate through the three rotations, ranks them with the rule of
 * PREREGISTRATION.md, A.9, and writes the tables, the figures and the snippets
 * of the study text. Runs only after the freeze commit.
 */

import { writeFileSync } from "node:fs";
import { loadOpenData, polarValues } from "./data.ts";
import { ADDED_AFTER_GATE_1, bestRelation, evaluateCandidate, evaluateRelations, openWings, rank, type CandidateResult } from "./evaluate.ts";
import { CANDIDATES, curveCenter, defaultBodyLength, NOMINAL_EVAL, PARAM_RANGES, type CandidateId, type EvalOptions } from "./model.ts";
import { bodyQuestion, timeCurve } from "./q4cost.ts";
import { bodyTableMd, candidatesTable, onsetTable, paramsTable, perWingTable, polarsTable, validityTable, wingFigure } from "./report-study.ts";
import { validityRows } from "./validity.ts";
import { sweepAtFractionDeg } from "./planform.ts";
import type { WaveTable } from "./wavetable.ts";

export interface StudyOutput {
  snippets: Record<string, string>;
  numbers: Record<string, number | string | null>;
  results: CandidateResult[];
}

const ROT_OF = { "10.8": "R1", "35": "R2", "47": "R3" } as const;

/** Fitted parameters within 0.1 % of the width of their range from a bound. */
function boundsList(results: CandidateResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    for (const [rot, fit] of Object.entries(r.fits)) {
      const p = fit.params as Record<string, unknown>;
      for (const [k, val] of Object.entries(p)) {
        const key = k === "rel" ? `rel:${(val as { kind: string }).kind}` : k;
        const x = k === "rel" ? (val as { value: number }).value : (val as number);
        const range = PARAM_RANGES[key];
        if (!range || typeof x !== "number") continue;
        const tol = 1e-3 * (range[1] - range[0]);
        if (x - range[0] <= tol || range[1] - x <= tol) lines.push(`- ${r.id}, ${rot}: ${key} = ${x.toFixed(3)}, rango [${range[0]}, ${range[1]}]`);
      }
    }
  }
  return lines.length ? lines.join("\n") : "- ninguno";
}

export function runStudy(table: WaveTable, OUT: string, log: (s: string) => void): StudyOutput {
  const data = loadOpenData();
  const wings = openWings(data, defaultBodyLength());
  const relations = evaluateRelations(wings);
  const rel = bestRelation(relations);
  log(`relations: ${relations.map((r) => `${r.rel} rms ${r.rms.toFixed(3)}`).join(", ")}; P2/P3 use ${rel}`);
  const results: CandidateResult[] = [];
  for (const c of CANDIDATES) {
    const t0 = performance.now();
    results.push(evaluateCandidate(c.id, wings, table, rel));
    log(`candidate ${c.id}: main ${results[results.length - 1]!.metrics.main.toFixed(4)} (${((performance.now() - t0) / 1000).toFixed(0)} s)`);
  }
  const ranking = rank(results);
  const top = ranking.order.filter((id) => id !== "E" && id !== "E0" && id !== "D1").slice(0, 3) as CandidateId[];
  const topRec = ranking.order.filter((id) => id !== "E" && id !== "E0" && id !== "D1" && !ADDED_AFTER_GATE_1.includes(id)).slice(0, 3) as CandidateId[];

  // Rule (b) values against figure 9 and the curves (each wing with its left-out fit).
  const polars = polarValues(data.dataset);
  const showIds: CandidateId[] = [...top, "E"];
  const polarRows = polars.map((p) => {
    const w = wings.find((x) => x.id === p.wing)!;
    const faired = w.samples.find((s) => Math.abs(s.mach - p.mach) < 1e-9)?.cd0 ?? null;
    const models: Record<string, number | null> = {};
    for (const id of showIds) {
      const r = results.find((x) => x.id === id)!;
      const fit = r.fits[ROT_OF[p.wing]]!;
      const o: EvalOptions = fit.similarity ? { ...NOMINAL_EVAL, similarity: fit.similarity } : NOMINAL_EVAL;
      models[id] = curveCenter(id, w.ctx, table, p.mach, fit.params, o);
    }
    return { ...p, faired, models };
  });

  const body = bodyQuestion(data.body);
  const validity = validityRows();
  const cost: Record<string, { medianMs: number; reps: number }> = {};
  for (const k of ["A", "B", "D", "E"] as const) {
    cost[k] = timeCurve(k);
    log(`cost ${k}: ${cost[k]!.medianMs.toFixed(1)} ms (${cost[k]!.reps} reps)`);
  }

  // Sensitivity (step 5) of the curves that head the table: outward change of each limit per input, largest over the T2 and T3 conditions.
  const sens: string[] = ["| Curva | Entrada | Mayor cambio hacia abajo | Mayor cambio hacia arriba | Condición del mayor cambio |", "| --- | --- | ---: | ---: | --- |"];
  for (const id of top) {
    const r = results.find((x) => x.id === id)!;
    const by: Record<string, { dm: number; dp: number; where: string }> = {};
    for (const p of r.predictions.filter((q) => q.segment !== "T1" && q.interval)) {
      for (const [inp, [dm, dp]] of Object.entries(p.interval!.widening)) {
        const cur = by[inp] ?? { dm: 0, dp: 0, where: "" };
        if (Math.max(dm, dp) > Math.max(cur.dm, cur.dp)) cur.where = `${p.wing}° a Mach ${p.mach.toFixed(3)}`;
        cur.dm = Math.max(cur.dm, dm);
        cur.dp = Math.max(cur.dp, dp);
        by[inp] = cur;
      }
    }
    for (const [inp, v] of Object.entries(by).sort()) sens.push(`| ${id} | ${inp} | ${v.dm.toFixed(5)} | ${v.dp.toFixed(5)} | ${v.where} |`);
  }

  // Width of the predicted interval where the leading edge is supersonic (open data: the 10.8 deg wing in T3).
  const widthIds: CandidateId[] = [...new Set<CandidateId>([...top, "A2-P1", "C-P1", "D2"])];
  const wRows: string[] = [
    "| Curva | Mach | Mn borde de ataque | Banda de base y parámetros | I1 | I2 | I3 | I5 | I7 | I8 | I9 | Converge | Intervalo final | Anchura |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |",
  ];
  const tanLE = Math.tan((sweepAtFractionDeg({ aspectRatio: 3.5, taperRatio: 0.2, spanIn: 24 }, 10.8, 0) * Math.PI) / 180);
  for (const id of widthIds) {
    const r = results.find((x) => x.id === id)!;
    for (const p of r.predictions.filter((q) => q.wing === "10.8" && q.segment === "T3")) {
      const iv = p.interval;
      if (!iv) continue;
      const d = (k: string): string => (iv.widening[k] ? Math.max(...iv.widening[k]!).toFixed(4) : "—");
      wRows.push(`| ${id} | ${p.mach.toFixed(3)} | ${(p.mach * Math.cos(Math.atan(tanLE))).toFixed(3)} | ${(iv.env[1] - iv.env[0]).toFixed(4)} | ${d("I1")} | ${d("I2")} | ${d("I3")} | ${d("I5")} | ${d("I7")} | ${d("I8")} | ${d("I9")} | ${iv.converged ? "sí" : "no"} | [${iv.min.toFixed(4)}, ${iv.max.toFixed(4)}] | ${(iv.max - iv.min).toFixed(4)} |`);
    }
  }

  for (const w of wings) {
    writeFileSync(`${OUT}fig-wing-${w.id}.svg`, wingFigure(w, results, top, table, polars.filter((p) => p.wing === w.id)));
  }
  const snippets: Record<string, string> = {
    candidates: candidatesTable(results, ranking, cost),
    params: paramsTable(results),
    perWing: perWingTable(results, [...top, "E"]),
    onset: onsetTable(results, relations, rel),
    body: bodyTableMd(body),
    validity: validityTable(validity),
    polars: polarsTable(polarRows, showIds),
    sensitivity: sens.join("\n"),
    widths: wRows.join("\n"),
    bounds: boundsList(results),
  };
  const rec = ranking.recommendation;
  const recR = rec.id ? results.find((x) => x.id === rec.id)! : null;
  const numbers: Record<string, number | string | null> = {
    relation: rel,
    recommended: rec.id,
    verdict: rec.verdict,
    reasons: rec.reasons.join("; ") || "ninguna",
    top1: topRec[0] ?? null,
    top2: topRec[1] ?? null,
    top3: topRec[2] ?? null,
    recMain: recR?.metrics.main ?? null,
    recT3: recR?.metrics.t3 ?? null,
    recOnset: recR?.metrics.onsetMaxAbs ?? null,
    eMain: results.find((x) => x.id === "E")!.metrics.main,
    ePredicted: results.find((x) => x.id === "E")!.metrics.nPredicted,
    recOnsetNA: recR ? recR.onsets.filter((o) => o.predicted.center === null).length : null,
    eMissing: results.find((x) => x.id === "E")!.metrics.nMissing,
    e0Main: results.find((x) => x.id === "E0")!.metrics.main,
    costA: cost.A!.medianMs,
    costAReps: cost.A!.reps,
    costB: cost.B!.medianMs,
    costE: cost.E!.medianMs,
  };
  writeFileSync(`${OUT}open-results.json`, JSON.stringify({ numbers, ranking, relations, metrics: results.map((r) => ({ id: r.id, metrics: r.metrics, fits: r.fits })) }, null, 1));
  return { snippets, numbers, results };
}
