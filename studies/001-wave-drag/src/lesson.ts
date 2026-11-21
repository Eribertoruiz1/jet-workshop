/**
 * Geometry-only outputs that go into the freeze commit (no drag data):
 * - the lesson figure (question 6): the normal-area distribution of the 35 deg
 *   wing and its body at M = 1, with the Sears-Haack body of the same length
 *   and volume;
 * - the decomposition body / wing / interference (A2 against C) for the 35 deg wing;
 * - the table of wave levels A1, A2 and C at the open conditions.
 */

import { obliqueArea } from "./body.ts";
import { buildConfiguration } from "./config.ts";
import { plotSvg } from "./svg.ts";
import { ALL_SWEEP_MEMBERS, N_SWEEP, M_SWEEP, NOMINAL_MEMBER, machKey, type WaveTable } from "./wavetable.ts";
import { plateau } from "./wavedrag.ts";

export function areaFigure(geometry = "open-35"): { svg: string; numbers: { length: number; volume: number; aMax: number; aMaxSH: number } } {
  const cfg = buildConfiguration(geometry);
  const w = cfg.wing;
  const end = Math.max(w.xTE(w.g.etaRoot), w.xTE(w.g.semispan));
  const n = 400;
  const pts: { x: number; body: number; wing: number; total: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (end * i) / n;
    const b = obliqueArea(cfg.shape, x, 0);
    const wa = w.area(x, 0);
    pts.push({ x, body: b, wing: wa, total: b + wa });
  }
  let volume = 0;
  for (let i = 1; i <= n; i++) volume += ((pts[i]!.total + pts[i - 1]!.total) / 2) * (pts[i]!.x - pts[i - 1]!.x);
  const aMaxSH = (16 * volume) / (3 * Math.PI * end);
  const sh = pts.map((p) => {
    const xi = (2 * p.x) / end - 1;
    return { x: p.x, y: aMaxSH * Math.pow(Math.max(0, 1 - xi * xi), 1.5) };
  });
  const aMax = Math.max(...pts.map((p) => p.total));
  const svg = plotSvg({
    title: `Distribución de áreas normales a Mach 1: ala de ${cfg.sweepQuarterChordDeg}° y fuselaje (calculado)`,
    xLabel: "Estación desde la nariz, pulgadas",
    yLabel: "Área de la sección normal, pulgadas²",
    x: [0, Math.ceil(end)],
    y: [0, Math.ceil(Math.max(aMax, aMaxSH) + 1)],
    yTicks: [0, 2, 4, 6, 8, 10].filter((t) => t <= Math.ceil(Math.max(aMax, aMaxSH) + 1)),
    series: [
      { label: "Conjunto ala-fuselaje", color: "#1f4e79", kind: "line", points: pts.map((p) => ({ x: p.x, y: p.total })) },
      { label: "Fuselaje", color: "#7f7f7f", kind: "line", dash: "6 4", points: pts.map((p) => ({ x: p.x, y: p.body })) },
      { label: "Ala expuesta", color: "#b45f06", kind: "line", dash: "2 3", points: pts.map((p) => ({ x: p.x, y: p.wing })) },
      { label: "Sears-Haack, misma l y V", color: "#38761d", kind: "line", points: sh },
    ],
  });
  return { svg, numbers: { length: end, volume, aMax, aMaxSH } };
}

export function decompositionFigure(table: WaveTable, geometry = "open-35"): string {
  const byMach = table.levels[geometry]!.nominal!;
  const machs = Object.keys(byMach).map(Number).sort((a, b) => a - b);
  const get = (m: number) => byMach[machKey(m)]![NOMINAL_MEMBER]!;
  const total = machs.map((m) => ({ x: m, y: get(m).total }));
  const wing = machs.map((m) => ({ x: m, y: get(m).wing }));
  const body = machs.map((m) => ({ x: m, y: get(m).body }));
  const interf = machs.map((m) => ({ x: m, y: get(m).total - get(m).wing - get(m).body }));
  const all = [...total, ...wing, ...body, ...interf].map((p) => p.y);
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all);
  return plotSvg({
    title: `Resistencia de onda (A2) y sus partes, ala de 35° (calculado, N₀ y m₀)`,
    xLabel: "Mach",
    yLabel: "CD de onda sobre 1.143 pies²",
    x: [1, Math.max(...machs)],
    y: [Math.floor(lo * 1000) / 1000, Math.ceil(hi * 1000) / 1000],
    series: [
      { label: "A2: conjunto", color: "#1f4e79", kind: "line", points: total },
      { label: "Ala sola", color: "#b45f06", kind: "line", dash: "2 3", points: wing },
      { label: "Fuselaje solo", color: "#7f7f7f", kind: "line", dash: "6 4", points: body },
      { label: "Interferencia (A2 − C)", color: "#990000", kind: "line", points: interf },
    ],
  });
}

const f5 = (v: number): string => v.toFixed(5);

/** Table of wave levels at the requested Mach numbers, nominal variant, with the sweep and plateau. */
export function waveLevelsMarkdown(table: WaveTable): string {
  const L: string[] = [];
  L.push("# Niveles de onda de A y C en las condiciones abiertas");
  L.push("");
  L.push("Generado por `studies/001-wave-drag/run.ts` antes de leer ningún dato de resistencia. Solo geometría. Todos los valores son `computed`: CD de onda sobre 1.143 pies². A1 es la columna de Mach 1 (cortes normales).");
  L.push("");
  L.push(`Columnas: nominal (${NOMINAL_MEMBER}); barrido en N (${N_SWEEP.join(", ")}) y en θ (${M_SWEEP.join(", ")}); meseta por eje con la regla de A.7.`);
  L.push("");
  for (const [g, variants] of Object.entries(table.levels)) {
    L.push(`## ${g}`);
    L.push("");
    L.push(`| Mach | Parte | Nominal | ${N_SWEEP.join(" | ")} | ${M_SWEEP.join(" | ")} | Meseta en N | Meseta en θ |`);
    L.push(`| ---: | --- | ---: | ${N_SWEEP.map(() => "---:").join(" | ")} | ${M_SWEEP.map(() => "---:").join(" | ")} | --- | --- |`);
    for (const [mk, mem] of Object.entries(variants.nominal!).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      for (const part of ["A2", "C"] as const) {
        const v = (id: string): number => (part === "A2" ? mem[id]!.total : mem[id]!.wing + mem[id]!.body);
        const nAx = N_SWEEP.map(v) as [number, number, number];
        const mAx = M_SWEEP.map(v) as [number, number, number];
        L.push(`| ${mk} | ${part} | ${f5(v(NOMINAL_MEMBER))} | ${nAx.map(f5).join(" | ")} | ${mAx.map(f5).join(" | ")} | ${plateau(nAx).converged ? "sí" : "no"} | ${plateau(mAx).converged ? "sí" : "no"} |`);
      }
    }
    L.push("");
  }
  L.push(`Miembros calculados en cada condición: ${ALL_SWEEP_MEMBERS.join(", ")}, y además N₀/2 y 2N₀ con m₀ para la entrada I3.`);
  L.push("");
  return L.join("\n");
}
