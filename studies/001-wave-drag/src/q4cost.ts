/**
 * Question 4 (the body alone against A1 and A2, no parameters) and question 5
 * (cost of a complete curve for a new geometry). The body data come from
 * data.ts (open data, decision 0004).
 */

import { BIELAT_BODY, bodyAloneDrag, type BoundaryLayer } from "../../../packages/physics/src/index.ts";
import { bodyTable, ogiveCylinder } from "./body.ts";
import { buildConfiguration, loadConfigs, waveDragCD } from "./config.ts";
import type { BodyPoint } from "../../../packages/validation/src/data.ts";
import { dragGrid } from "./wavedrag.ts";
import { FREEZE } from "./freeze.ts";
import { aerosandboxShape, kornMasonMcrit, maxNormalArea, searsHaackCD } from "./bshape.ts";
import { baseBand, wingBody } from "./base.ts";
import { baselineBand, kornMasonLockBand } from "../../../packages/validation/src/index.ts";
import { bridgeW } from "./model.ts";

export interface BodyRow {
  mach: number;
  alpha: number;
  D: number;
  uD: number;
  friction: [number, number];
  wave: number | null;
  model: [number, number];
  E: number | null;
}

/** Body alone: friction band (turbulent, mixed) plus the body's own wave drag A1 (M = 1) or A2 (M > 1); below M 1 only friction. */
export function bodyQuestion(points: BodyPoint[]): BodyRow[] {
  const f = loadConfigs();
  const sref = f.planform.areaFt2 * 144;
  const shape = ogiveCylinder(f.body.diameterIn / 2, f.body.noseLengthIn);
  const machs = [...new Set(points.map((p) => p.mach))].sort((a, b) => a - b);
  const rows: BodyRow[] = [];
  for (const m of machs) {
    const atM = points.filter((p) => p.mach === m).sort((a, b) => Math.abs(a.alpha) - Math.abs(b.alpha));
    const p = atM[0]!;
    if (Math.abs(p.alpha) > 0.5) continue;
    const fr = (["turbulent", "mixed"] as BoundaryLayer[]).map((bl) => bodyAloneDrag(BIELAT_BODY, m, sref, bl).cd);
    let wave: number | null = null;
    if (m >= 1) {
      const beta = m > 1 ? Math.sqrt(m * m - 1) : 0;
      const t = bodyTable(shape, beta);
      const g = dragGrid([{ support: () => t.support, sPrime: (X) => t.sPrime(X) }], beta, [FREEZE.n0], [FREEZE.m0]);
      wave = g.dq[0]![0]! / sref;
    }
    const model: [number, number] = [Math.min(...fr) + (wave ?? 0), Math.max(...fr) + (wave ?? 0)];
    rows.push({ mach: m, alpha: p.alpha, D: p.cd, uD: p.uCd, friction: [Math.min(...fr), Math.max(...fr)], wave, model, E: wave === null ? null : (model[0] + model[1]) / 2 - p.cd });
  }
  return rows;
}

export const COST_MACHS = Array.from({ length: 60 }, (_, i) => 0.5 + (i * 0.7) / 59);
export const COST_REPS = 200;
export const COST_BUDGET_S = 20;

/** Median time of a complete 60-Mach curve for a new geometry, area computation included. */
export function timeCurve(kind: "A" | "B" | "D" | "E"): { medianMs: number; reps: number } {
  const geometry = "open-35";
  let sink = 0;
  const once = (): void => {
    if (kind === "A") {
      const cfg = buildConfiguration(geometry);
      const levels = new Map<number, number>();
      for (const m of [1, 1 + FREEZE.slopeStepAboveOne, ...COST_MACHS.filter((x) => x > 1)]) levels.set(m, waveDragCD(cfg, m, [FREEZE.n0], [FREEZE.m0]).total[0]![0]!);
      const w1 = levels.get(1)!;
      const s1 = (levels.get(1 + FREEZE.slopeStepAboveOne)! - w1) / FREEZE.slopeStepAboveOne;
      const w = wingBody(35, 0.04);
      for (const m of COST_MACHS) sink += baseBand([w], m).center + (m >= 1 ? levels.get(m) ?? w1 : bridgeW({ kind: "P1", m0: 0.9, p: 4 }, m, w1, s1));
    } else if (kind === "B") {
      const cfg = buildConfiguration(geometry);
      const am = maxNormalArea(cfg);
      const lvl = searsHaackCD(am.area, 25.15, cfg.refAreaIn2);
      const w = wingBody(35, 0.04);
      const mc = kornMasonMcrit(0.04, 20);
      for (const m of COST_MACHS) sink += baseBand([w], m).center + lvl * aerosandboxShape(m, mc);
    } else if (kind === "D") {
      const w = wingBody(35, 0.04);
      for (const m of COST_MACHS) sink += baseBand([w], m).center + 1 / (1 + Math.exp(-(m - 1)));
    } else {
      const w = wingBody(35, 0.04);
      for (const m of COST_MACHS) {
        sink += kornMasonLockBand(w, { mach: m, cl: 0 }).min + baselineBand(w, { mach: m, cl: 0 }).min;
      }
    }
  };
  const times: number[] = [];
  const t0 = performance.now();
  while (times.length < COST_REPS && (performance.now() - t0) / 1000 < COST_BUDGET_S) {
    const a = performance.now();
    once();
    times.push(performance.now() - a);
  }
  times.sort((a, b) => a - b);
  if (!Number.isFinite(sink)) throw new Error("cost loop produced a non-finite value");
  return { medianMs: times[Math.floor(times.length / 2)]!, reps: times.length };
}
