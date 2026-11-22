/**
 * Tables and figures of the open-data study, as Markdown snippets keyed by
 * name for the study template, and SVG figures. Generated; no figure by hand.
 */

import type { TestedWingId } from "../../../packages/physics/src/index.ts";
import type { CandidateResult, OpenWing, Ranking, RelationResult } from "./evaluate.ts";
import { ADDED_AFTER_GATE_1, THRESHOLD_CD, THRESHOLD_ONSET } from "./evaluate.ts";
import { CANDIDATES, baseValues, curveCenter, NOMINAL_EVAL, type CandidateId, type EvalOptions } from "./model.ts";
import type { BodyRow } from "./q4cost.ts";
import { plotSvg, type Series } from "./svg.ts";
import type { ValidityRow } from "./validity.ts";
import type { WaveTable } from "./wavetable.ts";

const f4 = (v: number | null | undefined): string => (v === null || v === undefined || !Number.isFinite(v) ? "NA" : v.toFixed(4));
const f3 = (v: number | null | undefined): string => (v === null || v === undefined || !Number.isFinite(v) ? "NA" : v.toFixed(3));

function paramText(r: CandidateResult): string {
  return Object.entries(r.fits)
    .map(([rot, f]) => {
      const p = f.params;
      const parts: string[] = [];
      if (p.M0 !== undefined) parts.push(`M₀ ${p.M0.toFixed(3)}`);
      if (p.p !== undefined) parts.push(`p ${p.p.toFixed(2)}`);
      if (p.k !== undefined) parts.push(`k ${p.k.toFixed(3)}`);
      if (p.EWD !== undefined) parts.push(`E_WD ${p.EWD.toFixed(3)}`);
      if (p.rel) parts.push(`${p.rel.kind} ${p.rel.value.toFixed(3)}`);
      if (p.L !== undefined) parts.push(`L ${p.L.toFixed(3)}`);
      if (p.xic !== undefined) parts.push(`ξc ${p.xic.toFixed(3)}`);
      return parts.length ? `${rot}: ${parts.join(", ")}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

export function candidatesTable(results: CandidateResult[], ranking: Ranking, cost: Record<string, { medianMs: number; reps: number }>): string {
  const L: string[] = [];
  L.push("| Puesto | Curva | Parámetros libres | Métrica principal (T2 y T3) | T3 | T2 | Mayor error del inicio | Aciertos (|E| ≤ 0.003) | Sesgo | Sin predicción | No converge | Mejora a E | Mejora a E0 | Coste, ms |");
  L.push("| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |");
  ranking.order.forEach((id, i) => {
    const r = results.find((x) => x.id === id)!;
    const fam = id.startsWith("A") || id.startsWith("C") ? "A" : id.startsWith("B") ? "B" : id.startsWith("D") ? "D" : "E";
    const c = cost[fam];
    const np = id === "D1" ? "no paramétrica" : String(r.nParams);
    L.push(
      `| ${i + 1} | ${id}${ADDED_AFTER_GATE_1.includes(id) ? " (añadido después de la compuerta 1)" : ""} | ${np} | ${f4(r.metrics.main)} | ${f4(r.metrics.t3)} | ${f4(r.metrics.t2)} | ${f3(r.metrics.onsetMaxAbs)} | ${(100 * r.metrics.hitRate).toFixed(0)} % | ${f4(r.metrics.bias)} | ${r.metrics.nMissing} | ${r.metrics.noConverge} | ${ranking.improvesE[id] ? "sí" : "no"} | ${ranking.improvesE0[id] ? "sí" : "no"} | ${c ? c.medianMs.toFixed(1) : "—"} |`,
    );
  });
  return L.join("\n");
}

export function paramsTable(results: CandidateResult[]): string {
  const L = ["| Curva | Qué es | Parámetros ajustados en cada rotación |", "| --- | --- | --- |"];
  for (const c of CANDIDATES) {
    const r = results.find((x) => x.id === c.id);
    if (!r) continue;
    L.push(`| ${c.id} | ${c.description} | ${paramText(r) || "ninguno"} |`);
  }
  return L.join("\n");
}

export function perWingTable(results: CandidateResult[], ids: CandidateId[]): string {
  const L: string[] = [];
  const first = results.find((r) => r.id === ids[0])!;
  const rows = first.predictions.filter((p) => p.segment !== "T1");
  L.push(`| Ala fuera | Mach | Tramo | D (figura 9) | u_D | ${ids.map((id) => `${id}: S`).join(" | ")} | ${ids.map((id) => `${id}: E`).join(" | ")} |`);
  L.push(`| --- | ---: | --- | ---: | ---: | ${ids.map(() => "---:").join(" | ")} | ${ids.map(() => "---:").join(" | ")} |`);
  for (const p of rows) {
    const ss = ids.map((id) => results.find((r) => r.id === id)!.predictions.find((q) => q.wing === p.wing && q.mach === p.mach)!);
    L.push(
      `| ${p.wing}° | ${p.mach.toFixed(3)} | ${p.segment} | ${f4(p.D)} | ${f4(p.uD)} | ${ss.map((q) => (q.interval ? `${f4(q.interval.center)} [${f4(q.interval.min)}, ${f4(q.interval.max)}]${q.interval.converged ? "" : "*"}` : "NA")).join(" | ")} | ${ss.map((q) => f4(q.E)).join(" | ")} |`,
    );
  }
  L.push("");
  L.push("S es el centro del intervalo predicho y, entre corchetes, el intervalo. * marca \"no converge\". E = S − D.");
  return L.join("\n");
}

export function onsetTable(results: CandidateResult[], relations: RelationResult[], best: string): string {
  const L: string[] = [];
  L.push("### Relaciones de inicio aisladas");
  L.push("");
  L.push("| Relación | R1 (10.8° fuera) | R2 (35° fuera) | R3 (47° fuera) | Media cuadrática | Mayor |E| |");
  L.push("| --- | --- | --- | --- | ---: | ---: |");
  for (const r of relations) {
    L.push(`| ${r.rel}${r.rel === best ? " (elegida para P2 y P3)" : ""} | ${r.rotations.map((x) => `${f3(x.predicted)} frente a ${f3(x.data)} (parámetro ${x.param.toFixed(3)})`).join(" | ")} | ${f3(r.rms)} | ${f3(r.maxAbs)} |`);
  }
  L.push("");
  L.push("### Inicio implícito de cada curva completa");
  L.push("");
  L.push("| Curva | R1: predicho [intervalo] | R2 | R3 | Dato (regla c) | Mayor |E| |");
  L.push("| --- | --- | --- | --- | --- | ---: |");
  for (const r of results) {
    const cells = r.onsets.map((o) => (o.predicted.center === null ? `NA${o.predicted.note ? ` (${o.predicted.note})` : ""}` : `${f3(o.predicted.center)} [${f3(o.predicted.min)}, ${f3(o.predicted.max)}]`));
    const data = r.onsets.map((o) => (o.data ? `${o.wing}°: ${f3(o.data.mach)} (${o.data.source === "samples" ? "muestras" : "texto del informe"})` : `${o.wing}°: NA`)).join("; ");
    L.push(`| ${r.id} | ${cells.join(" | ")} | ${data} | ${f3(r.metrics.onsetMaxAbs)} |`);
  }
  return L.join("\n");
}

export function bodyTableMd(rows: BodyRow[]): string {
  const L = ["| Mach | α, grados | D (medido) | u_D | Rozamiento (banda) | Onda A1/A2 del fuselaje | Modelo (banda) | E (centro) |", "| ---: | ---: | ---: | ---: | --- | ---: | --- | ---: |"];
  for (const r of rows) L.push(`| ${r.mach.toFixed(3)} | ${r.alpha.toFixed(1)} | ${f4(r.D)} | ${f4(r.uD)} | ${f4(r.friction[0])} a ${f4(r.friction[1])} | ${r.wave === null ? "—" : f4(r.wave)} | ${f4(r.model[0])} a ${f4(r.model[1])} | ${f4(r.E)} |`);
  return L.join("\n");
}

export function validityTable(rows: ValidityRow[]): string {
  const L = ["| Ala | Mach | β s/c_r | ξ₀ | Ã | A τ^(1/3) | Mn borde de ataque | Mn borde de salida |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"];
  for (const r of rows) L.push(`| ${r.config} | ${r.mach.toFixed(3)} | ${r.betaSOverC.toFixed(2)} | ${r.xi0.toFixed(2)} | ${r.aTilde.toFixed(2)} | ${r.aTau13.toFixed(2)} | ${r.mnLE.toFixed(3)} | ${r.mnTE.toFixed(3)} |`);
  return L.join("\n");
}

export function polarsTable(rows: { wing: TestedWingId; mach: number; cd0: number; uD: number; faired: number | null; models: Record<string, number | null> }[], ids: string[]): string {
  const L = [`| Ala | Mach | Valor (b), computed | u_D | Figura 9 en ese Mach | ${ids.join(" | ")} |`, `| --- | ---: | ---: | ---: | ---: | ${ids.map(() => "---:").join(" | ")} |`];
  for (const r of rows) L.push(`| ${r.wing}° | ${r.mach.toFixed(3)} | ${f4(r.cd0)} | ${f4(r.uD)} | ${f4(r.faired)} | ${ids.map((id) => f4(r.models[id])).join(" | ")} |`);
  return L.join("\n");
}

const COLORS = ["#1f4e79", "#990000", "#38761d", "#7030a0", "#b45f06"];

/** CD0 against Mach for one wing: data, rule (b), base band, E, E0 and the best curves with the wing left out. */
export function wingFigure(w: OpenWing, results: CandidateResult[], ids: CandidateId[], table: WaveTable, polar: { mach: number; cd0: number; uD: number }[]): string {
  const machs = Array.from({ length: 141 }, (_, i) => 0.5 + i * 0.005).filter((m) => m <= 1.2);
  const series: Series[] = [];
  series.push({ label: "Base (banda)", color: "#7f7f7f", kind: "band", points: machs.map((m) => { const b = baseValues(w.ctx, m); return { x: m, y: 0, lo: Math.min(...b), hi: Math.max(...b) }; }) });
  const band = (id: "E" | "E0"): Series => {
    const r = results.find((x) => x.id === id)!;
    return { label: id === "E" ? "E: modelo actual (centro)" : "E0: sin subida (centro)", color: id === "E" ? "#000000" : "#999999", kind: "line", dash: id === "E" ? "6 3" : "2 2", points: machs.map((m) => ({ x: m, y: curveCenter(id, w.ctx, table, m, r.fits.R1!.params) ?? Number.NaN })) };
  };
  series.push(band("E"), band("E0"));
  const rot = { "10.8": "R1", "35": "R2", "47": "R3" }[w.id];
  ids.forEach((id, i) => {
    const r = results.find((x) => x.id === id)!;
    const fit = r.fits[rot]!;
    const o: EvalOptions = fit.similarity ? { ...NOMINAL_EVAL, similarity: fit.similarity } : NOMINAL_EVAL;
    series.push({ label: `${id} (ala fuera)`, color: COLORS[i % COLORS.length]!, kind: "line", points: machs.map((m) => ({ x: m, y: curveCenter(id, w.ctx, table, m, fit.params, o) ?? Number.NaN })) });
  });
  series.push({ label: "Figura 9 (NACA faired)", color: "#000000", kind: "points", points: w.samples.map((s) => ({ x: s.mach, y: s.cd0, lo: s.cd0 - s.uD, hi: s.cd0 + s.uD })) });
  if (polar.length) series.push({ label: "Polares, regla (b)", color: "#990000", kind: "hollow", points: polar.map((p) => ({ x: p.mach, y: p.cd0, lo: p.cd0 - p.uD, hi: p.cd0 + p.uD })) });
  const ys = w.samples.map((s) => s.cd0);
  return plotSvg({
    title: `Ala de ${w.id}°: CD a sustentación nula`,
    xLabel: "Mach",
    yLabel: "CD0 sobre 1.143 pies²",
    x: [0.5, 1.2],
    y: [Math.floor((Math.min(...ys) - 0.004) * 500) / 500, Math.ceil((Math.max(...ys) + 0.006) * 500) / 500],
    vSpan: [1.04, 1.08, "sin datos"],
    series,
  });
}

export function thresholdsText(): string {
  return `${THRESHOLD_CD} en CD y ${THRESHOLD_ONSET} en Mach`;
}
