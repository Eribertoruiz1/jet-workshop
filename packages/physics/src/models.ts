/**
 * Drag models under one contract: (wing, condition) => { cl, cd, valid }.
 *
 * Any function with this shape can be scored by `pnpm validate` against the
 * measured data. Two models ship:
 *
 * - korn-mason-lock: parasite build-up, displaced parabolic polar with Oswald
 *   efficiency, and the Korn-Mason / Lock transonic drag rise by strips.
 * - baseline-incompressible: the same parasite and induced terms with every
 *   Mach-dependent term frozen at M 0.50 (the lowest test Mach number) and no
 *   drag rise. It exists to show what the transonic terms add.
 */

import type { WingBody } from "./geometry.ts";
import { inducedDragFactor, oswaldFitValid } from "./induced.ts";
import { minimumDragCl } from "./lift.ts";
import { parasiteDrag } from "./parasite.ts";
import { waveDrag } from "./transonic.ts";

export interface Condition {
  mach: number;
  /** Lift coefficient at which the drag is wanted */
  cl: number;
}

export interface ModelResult {
  cl: number;
  cd: number;
  valid: boolean;
  /** Why the result is outside the model's range, when it is */
  reasons: string[];
  parts: { parasite: number; induced: number; wave: number; minimumDragCl: number };
}

export type DragModel = (wing: WingBody, condition: Condition) => ModelResult;

/**
 * Lift range of the parabolic polar: attached flow with leading-edge suction.
 * Beyond it the drag due to lift of these thin, sharp-nosed wings is governed
 * by leading-edge separation (the report's figure 12), which is not modelled.
 */
export const POLAR_CL_HALF_RANGE = 0.3;

/** Highest Mach number at which any model here is evaluated. */
export const MAX_MACH = 1.13;

function polarRange(w: WingBody, cl: number, clMin: number, reasons: string[]): void {
  if (!oswaldFitValid(w.planform)) {
    reasons.push("aspect ratio and sweep outside the range where the Oswald efficiency fits behave physically");
  }
  if (Math.abs(cl - clMin) > POLAR_CL_HALF_RANGE) {
    reasons.push(`lift coefficient more than ${POLAR_CL_HALF_RANGE} from the minimum-drag lift coefficient (attached-flow polar)`);
  }
}

export const kornMasonLock: DragModel = (w, c) => {
  const reasons: string[] = [];
  const parasite = parasiteDrag(w, c.mach).total;
  const clMin = minimumDragCl(w, c.mach);
  const induced = inducedDragFactor(w.planform) * (c.cl - clMin) ** 2;
  const wave = waveDrag(w, c.mach, c.cl);
  if (wave.beyondLock) reasons.push(`Mach number above the drag-divergence Mach number plus 0.05 (${(wave.mddMin + 0.05).toFixed(3)}): Lock's law not valid`);
  if (c.mach > MAX_MACH) reasons.push("Mach number above the tested range");
  polarRange(w, c.cl, clMin, reasons);
  return {
    cl: c.cl,
    cd: parasite + induced + wave.cd,
    valid: reasons.length === 0,
    reasons,
    parts: { parasite, induced, wave: wave.cd, minimumDragCl: clMin },
  };
};

export const BASELINE_REFERENCE_MACH = 0.5;

export const baselineIncompressible: DragModel = (w, c) => {
  const reasons: string[] = [];
  const parasite = parasiteDrag(w, c.mach, BASELINE_REFERENCE_MACH).total;
  const clMin = minimumDragCl(w, BASELINE_REFERENCE_MACH);
  const induced = inducedDragFactor(w.planform) * (c.cl - clMin) ** 2;
  if (c.mach > MAX_MACH) reasons.push("Mach number above the tested range");
  polarRange(w, c.cl, clMin, reasons);
  return {
    cl: c.cl,
    cd: parasite + induced,
    valid: reasons.length === 0,
    reasons,
    parts: { parasite, induced, wave: 0, minimumDragCl: clMin },
  };
};

export const MODELS: Record<string, DragModel> = {
  "korn-mason-lock": kornMasonLock,
  "baseline-incompressible": baselineIncompressible,
};

/**
 * Drag-rise Mach number of a model at a lift coefficient: the lowest Mach
 * number where dCD/dM reaches 0.1, the definition used by the report.
 * Returns null if it is not reached below `maxMach`.
 */
export function dragRiseMach(model: DragModel, w: WingBody, cl: number, minMach = 0.6, maxMach = 1.2, step = 0.0005): number | null {
  let prev = model(w, { mach: minMach, cl }).cd;
  for (let m = minMach + step; m <= maxMach + 1e-9; m += step) {
    const cd = model(w, { mach: m, cl }).cd;
    if ((cd - prev) / step >= 0.1) return m - step / 2;
    prev = cd;
  }
  return null;
}
