/**
 * Drag models under one contract: (wing, condition) => { cl, cd, valid }.
 *
 * Any function with this shape can be scored by `pnpm validate` against the
 * measured data. Two models ship:
 *
 * - korn-mason-lock: parasite build-up, displaced parabolic polar with Oswald
 *   efficiency, and the Korn-Mason / Lock transonic drag rise by strips. The
 *   drag rise is computed, but every condition where it acts is reported as
 *   outside the model's range (see transonic.ts).
 * - baseline-incompressible: the same parasite and induced terms with every
 *   Mach-dependent term frozen at M 0.50 (the lowest test Mach number) and no
 *   drag rise. It exists to show what the Mach-dependent terms add.
 *
 * Both take the parasite-drag options (wing form factor, boundary layer). The
 * validation package builds each model's band from its eight variants.
 */

import type { WingBody } from "./geometry.ts";
import { inducedDragFactor, oswaldFitValid } from "./induced.ts";
import { liftCurveSlope, minimumDragCl } from "./lift.ts";
import { parasiteDrag, type ParasiteOptions } from "./parasite.ts";
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
  /** Beyond Lock's own limit (Mdd + 0.05): not to be drawn at all, not even as outside the range */
  beyondLock: boolean;
  /** Above the model's Mach limit (the transonic range): the reason the drag-rise note names */
  transonic: boolean;
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

/**
 * Upper end of the model's subsonic range. Above it is the transonic range of
 * the brief (its check 4 runs from M 0.90 to 1.12), which stays outside the
 * model's range (Amendment 3, point 4): the parasite and body terms have no
 * compressibility or wave drag, the lift-curve slope uses Prandtl-Glauert,
 * and the precedent validated the build-up only up to M 0.90. The body tested
 * alone shows its drag rising above it (report section 9).
 */
export const SUBSONIC_LIMIT_MACH = 0.9;

/**
 * Highest Mach number at which korn-mason-lock is in its range at a lift
 * coefficient: the critical Mach number of the first strip to diverge (the
 * drag-rise term is zero below it), and never above M 0.90.
 */
export function modelMachLimit(w: WingBody, cl: number): number {
  return Math.min(SUBSONIC_LIMIT_MACH, waveDrag(w, SUBSONIC_LIMIT_MACH, cl).mcritMin);
}

/**
 * Whether the linear lift curve is in its range at a Mach number and lift
 * coefficient: the slope is defined (M < 1), the Mach number is within the
 * model's limit, and the flow is attached (the polar's lift range).
 */
export function liftInRange(w: WingBody, mach: number, cl: number): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!liftCurveSlope(w, mach).valid) reasons.push("lift-curve slope not defined at M >= 1");
  if (mach > modelMachLimit(w, cl)) reasons.push("Mach number above the model's limit (transonic range)");
  if (Math.abs(cl - minimumDragCl(w, mach)) > POLAR_CL_HALF_RANGE) reasons.push("lift coefficient outside the attached-flow range");
  return { valid: reasons.length === 0, reasons };
}

function polarRange(w: WingBody, cl: number, clMin: number, reasons: string[]): void {
  if (!oswaldFitValid(w.planform)) {
    reasons.push("aspect ratio and sweep outside the range where the Oswald efficiency fits behave physically");
  }
  if (Math.abs(cl - clMin) > POLAR_CL_HALF_RANGE) {
    reasons.push(`lift coefficient more than ${POLAR_CL_HALF_RANGE} from the minimum-drag lift coefficient (attached-flow polar)`);
  }
}

/**
 * The korn-mason-lock model with a choice of wing form factor and boundary
 * layer for the parasite term. The validation package builds the band that
 * is scored and shown from all eight choices; none is picked to match the
 * data. Without options it is Raymer's form factor with turbulent flow.
 */
export function makeKornMasonLock(options: ParasiteOptions = {}): DragModel {
  return (w, c) => kornMasonLockWith(w, c, options);
}

export const kornMasonLock: DragModel = (w, c) => kornMasonLockWith(w, c, {});

function kornMasonLockWith(w: WingBody, c: Condition, options: ParasiteOptions): ModelResult {
  const reasons: string[] = [];
  const parasite = parasiteDrag(w, c.mach, c.mach, options).total;
  const clMin = minimumDragCl(w, c.mach);
  const induced = inducedDragFactor(w.planform) * (c.cl - clMin) ** 2;
  const wave = waveDrag(w, c.mach, c.cl);
  const transonic = c.mach > Math.min(SUBSONIC_LIMIT_MACH, wave.mcritMin);
  if (c.mach > wave.mcritMin) reasons.push(`Mach number above the critical Mach number (${wave.mcritMin.toFixed(3)}): the transonic drag-rise method (Korn-Mason with Lock's law) is outside its demonstrated range on thin, low-aspect-ratio wings`);
  else if (c.mach > SUBSONIC_LIMIT_MACH) reasons.push(`Mach number above ${SUBSONIC_LIMIT_MACH.toFixed(2)}: transonic range, where the body and parasite terms have no compressibility or wave drag`);
  if (wave.beyondLock) reasons.push(`Mach number above the drag-divergence Mach number plus 0.05 (${(wave.mddMin + 0.05).toFixed(3)}): Lock's law not valid`);
  if (c.mach > MAX_MACH) reasons.push("Mach number above the tested range");
  polarRange(w, c.cl, clMin, reasons);
  return {
    cl: c.cl,
    cd: parasite + induced + wave.cd,
    valid: reasons.length === 0,
    reasons,
    beyondLock: wave.beyondLock,
    transonic,
    parts: { parasite, induced, wave: wave.cd, minimumDragCl: clMin },
  };
}

export const BASELINE_REFERENCE_MACH = 0.5;

/** The incompressible baseline with a choice of wing form factor and boundary layer. */
export function makeBaseline(options: ParasiteOptions = {}): DragModel {
  return (w, c) => baselineWith(w, c, options);
}

export const baselineIncompressible: DragModel = (w, c) => baselineWith(w, c, {});

function baselineWith(w: WingBody, c: Condition, options: ParasiteOptions): ModelResult {
  const reasons: string[] = [];
  const parasite = parasiteDrag(w, c.mach, BASELINE_REFERENCE_MACH, options).total;
  const clMin = minimumDragCl(w, BASELINE_REFERENCE_MACH);
  const induced = inducedDragFactor(w.planform) * (c.cl - clMin) ** 2;
  if (c.mach > MAX_MACH) reasons.push("Mach number above the tested range");
  polarRange(w, c.cl, clMin, reasons);
  return {
    cl: c.cl,
    cd: parasite + induced,
    valid: reasons.length === 0,
    reasons,
    beyondLock: false,
    transonic: false,
    parts: { parasite, induced, wave: 0, minimumDragCl: clMin },
  };
}

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
