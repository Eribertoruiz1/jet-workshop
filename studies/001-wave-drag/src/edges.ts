/**
 * Sonic and supersonic edges (PM review of gate 1, point 1): for every condition,
 * the Mach number normal to the leading and trailing edges, and the counts of
 * conditions per subset and segment. Geometry only; no drag data.
 */

import { allConditions, loadConditionsFile, onsetConfigs, type Condition, type Segment, type Subset } from "./conditions.ts";
import { chords, normalMach, sonicMach, sweepAtFractionDeg, type TrapezoidPlanform } from "./planform.ts";

/** Descriptive flag only (no effect on any verdict): |Mn - 1| at or below this is called near-sonic. */
export const NEAR_SONIC_BAND = 0.05;

export interface EdgeRow extends Condition {
  leSweepDeg: number;
  teSweepDeg: number;
  mnLe: number;
  mnTe: number;
}

export function edgeClass(mn: number): string {
  const kind = mn > 1 ? "supersonic" : "subsonic";
  return Math.abs(mn - 1) <= NEAR_SONIC_BAND ? `${kind}, near-sonic` : kind;
}

export function edgeRows(p: TrapezoidPlanform, conds: Condition[]): EdgeRow[] {
  return conds.map((c) => {
    const le = sweepAtFractionDeg(p, c.sweepQuarterChordDeg, 0);
    const te = sweepAtFractionDeg(p, c.sweepQuarterChordDeg, 1);
    return { ...c, leSweepDeg: le, teSweepDeg: te, mnLe: normalMach(c.mach, le), mnTe: normalMach(c.mach, te) };
  });
}

const f2 = (v: number) => v.toFixed(2);
const f3 = (v: number) => v.toFixed(3);

export function edgesReport(): { markdown: string; csv: string; summary: string } {
  const file = loadConditionsFile();
  const p = file.planform;
  const conds = allConditions(file);
  const rows = edgeRows(p, conds);
  const ch = chords(p);
  const L: string[] = [];
  L.push("# Bordes sónicos y recuento de condiciones");
  L.push("");
  L.push("Generado por `studies/001-wave-drag/run.ts` desde `geometry/conditions.json`. No editar a mano. Solo geometría: ningún dato de resistencia.");
  L.push("");
  L.push(`Planta: alargamiento ${p.aspectRatio}, estrechamiento ${p.taperRatio}, envergadura ${f2(p.spanIn)} in; cuerda en el eje ${f3(ch.rootChordIn)} in y en la punta ${f3(ch.tipChordIn)} in (calculadas). Mach normal a un borde: M cos Λ. Borde sónico cuando M cos Λ = 1. "Casi sónico" es solo descriptivo: |Mn − 1| ≤ ${NEAR_SONIC_BAND}.`);
  L.push("");
  L.push("## Flechas de los bordes");
  L.push("");
  L.push("| Flecha en el 25 % | Borde de ataque | Sónico a Mach | Borde de salida | Sónico a Mach |");
  L.push("| ---: | ---: | ---: | ---: | ---: |");
  for (const s of [...new Set(conds.map((c) => c.sweepQuarterChordDeg))].sort((a, b) => a - b)) {
    const le = sweepAtFractionDeg(p, s, 0);
    const te = sweepAtFractionDeg(p, s, 1);
    L.push(`| ${s}° | ${f2(le)}° | ${f3(sonicMach(le))} | ${f2(te)}° | ${f3(sonicMach(te))} |`);
  }
  L.push("");
  L.push("## Recuento de condiciones");
  L.push("");
  const subsets: Subset[] = ["open", "blind", "replica"];
  const segs: Segment[] = ["T1", "T2", "T3", "T4"];
  const onsets = onsetConfigs(conds);
  L.push("| Subconjunto | T1 | T2 | T3 | T4 | Inicio de la subida |");
  L.push("| --- | ---: | ---: | ---: | ---: | ---: |");
  const counts: Record<string, Record<string, number>> = {};
  for (const sub of subsets) {
    counts[sub] = {};
    const cells = segs.map((s) => {
      const n = conds.filter((c) => c.subset === sub && c.segment === s).length;
      counts[sub]![s] = n;
      return String(n);
    });
    const nOnset = onsets.filter((o) => o.subset === sub).length;
    counts[sub]!.onset = nOnset;
    L.push(`| ${sub} | ${cells.join(" | ")} | ${nOnset} |`);
  }
  L.push("");
  L.push("`open`: muestras de la figura 9 de RM L52B08 (entrenamiento). `blind`: el subconjunto ciego de A.5. `replica`: `47deg-t04` en RM L51I04a.");
  L.push("");
  L.push("## Mach normal a cada borde, por condición");
  L.push("");
  L.push("| Subconjunto | Configuración | Informe | Mach | Tramo | Mn borde de ataque | Borde de ataque | Mn borde de salida | Borde de salida |");
  L.push("| --- | --- | --- | ---: | --- | ---: | --- | ---: | --- |");
  for (const r of rows) {
    L.push(`| ${r.subset} | ${r.config} | ${r.report} | ${f3(r.mach)} | ${r.segment} | ${f3(r.mnLe)} | ${edgeClass(r.mnLe)} | ${f3(r.mnTe)} | ${edgeClass(r.mnTe)} |`);
  }
  L.push("");
  const csv = ["subset,config,report,mach,segment,le_sweep_deg,te_sweep_deg,mn_le,mn_te"]
    .concat(rows.map((r) => [r.subset, r.config, r.report, f3(r.mach), r.segment, f2(r.leSweepDeg), f2(r.teSweepDeg), f3(r.mnLe), f3(r.mnTe)].join(",")))
    .join("\n");
  const blind = counts.blind!;
  const summary = `blind: T1 ${blind.T1}, T2 ${blind.T2}, T3 ${blind.T3}, T4 ${blind.T4}, onset ${blind.onset}; replica: T1 ${counts.replica!.T1}, T2 ${counts.replica!.T2}, T3 ${counts.replica!.T3}, onset ${counts.replica!.onset}; open: T1 ${counts.open!.T1}, T2 ${counts.open!.T2}, T3 ${counts.open!.T3}`;
  return { markdown: L.join("\n") + "\n", csv: csv + "\n", summary };
}
