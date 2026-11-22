/**
 * Open drag data of the study (PREREGISTRATION.md, A.2 and A.4). This is the
 * only module that opens drag data, and only after the freeze commit:
 * - packages/validation/data/bielat-l52b08.csv: figure 9 samples (rule a,
 *   class naca_faired_crossplot) and the measured polar symbols (rule b);
 * - packages/validation/data/bielat-l51i04a-body.csv: the body alone (question 4).
 * Nothing is smoothed, interpolated or changed; derived values are `computed`.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadBodyDataset, loadDataset, type BodyPoint, type Dataset } from "../../../packages/validation/src/data.ts";
import { DISTINCT_CL, liftLevels } from "../../../packages/validation/src/score.ts";
import type { TestedWingId } from "../../../packages/physics/src/index.ts";

const DATA = fileURLToPath(new URL("../../../packages/validation/data/", import.meta.url));

export interface Sample {
  wing: TestedWingId;
  mach: number;
  /** D: NACA faired value at CL = 0 */
  cd0: number;
  uD: number;
}

export interface OpenData {
  samples: Sample[];
  dataset: Dataset;
  body: BodyPoint[];
}

export function loadOpenData(): OpenData {
  const dataset = loadDataset(readFileSync(`${DATA}bielat-l52b08.csv`, "utf8"));
  const body = loadBodyDataset(readFileSync(`${DATA}bielat-l51i04a-body.csv`, "utf8"));
  const samples = dataset.faired.map((f) => ({ wing: f.wing, mach: f.mach, cd0: f.cd0, uD: f.uCd0 }));
  return { samples, dataset, body };
}

/** Rule (b): parabola CD = a + b CL + c CL^2 through the measured symbols with |CL| <= 0.3, at CL = 0. */
export function parabolaCd0(points: { cl: number; cd: number; uCd: number }[]): { cd0: number; uD: number; levels: number } | null {
  const pts = points.filter((p) => Math.abs(p.cl) <= 0.3);
  const levels = liftLevels(pts.map((p) => p.cl), DISTINCT_CL);
  if (levels < 3) return null;
  // Least squares on (1, CL, CL^2).
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;
  let s4 = 0;
  let t0 = 0;
  let t1 = 0;
  let t2 = 0;
  for (const p of pts) {
    const x = p.cl;
    s0 += 1;
    s1 += x;
    s2 += x * x;
    s3 += x ** 3;
    s4 += x ** 4;
    t0 += p.cd;
    t1 += p.cd * x;
    t2 += p.cd * x * x;
  }
  const m = [
    [s0, s1, s2, t0],
    [s1, s2, s3, t1],
    [s2, s3, s4, t2],
  ];
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(m[r]![i]!) > Math.abs(m[piv]![i]!)) piv = r;
    [m[i], m[piv]] = [m[piv]!, m[i]!];
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = m[r]![i]! / m[i]![i]!;
      for (let c = i; c < 4; c++) m[r]![c] = m[r]![c]! - f * m[i]![c]!;
    }
  }
  const a = m[0]![3]! / m[0]![0]!;
  return { cd0: a, uD: Math.max(...pts.map((p) => p.uCd)), levels };
}

/** Rule (b) values of every polar Mach number of the open wings. */
export function polarValues(d: Dataset): { wing: TestedWingId; mach: number; cd0: number; uD: number }[] {
  const keys = new Map<string, { wing: TestedWingId; mach: number }>();
  for (const p of d.polar) keys.set(`${p.wing}|${p.mach}`, { wing: p.wing, mach: p.mach });
  const out: { wing: TestedWingId; mach: number; cd0: number; uD: number }[] = [];
  for (const k of keys.values()) {
    const r = parabolaCd0(d.polar.filter((p) => p.wing === k.wing && p.mach === k.mach));
    if (r) out.push({ ...k, cd0: r.cd0, uD: r.uD });
  }
  return out.sort((a, b) => (a.wing === b.wing ? a.mach - b.mach : a.wing.localeCompare(b.wing)));
}

/**
 * Class `report text` (docs/PROCESS.md, evidence rule 1): drag-rise Mach numbers
 * stated in the text of NACA RM L52B08, "Drag" discussion, printed page 8
 * (PDF page 10): the drag-rise Mach number increases "from 0.92 to 0.97" as the
 * sweep goes from 10.8 to 47 deg. Used only where the samples do not reach 0.1
 * (PREREGISTRATION.md, A.2 c).
 */
export const REPORT_TEXT_ONSET: Partial<Record<TestedWingId, number>> = { "10.8": 0.92, "47": 0.97 };

export const GAP = { lo: 1.04, hi: 1.08 };

/**
 * Rule (c): onset of a sampled curve. Slopes between consecutive samples at the
 * interval midpoints, linear interpolation to 0.1; no interval that crosses the
 * reflected-shock gap (M 1.04 to 1.08). u_D is half the Mach distance between
 * the two midpoints around the crossing, or 0.005 for the report's text value.
 */
export function dataOnset(samples: { mach: number; cd0: number }[], wing: TestedWingId): { mach: number; uD: number; source: "samples" | "report text" } | null {
  const s = [...samples].sort((a, b) => a.mach - b.mach);
  let prev: { m: number; slope: number } | null = null;
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!;
    const b = s[i]!;
    if (a.mach <= GAP.lo && b.mach >= GAP.hi) {
      prev = null;
      continue;
    }
    const cur = { m: (a.mach + b.mach) / 2, slope: (b.cd0 - a.cd0) / (b.mach - a.mach) };
    if (cur.slope >= 0.1) {
      if (!prev) return { mach: cur.m, uD: 0.005, source: "samples" };
      const m = prev.m + ((0.1 - prev.slope) / (cur.slope - prev.slope)) * (cur.m - prev.m);
      return { mach: m, uD: (cur.m - prev.m) / 2, source: "samples" };
    }
    prev = cur;
  }
  const t = REPORT_TEXT_ONSET[wing];
  return t !== undefined ? { mach: t, uD: 0.005, source: "report text" } : null;
}
