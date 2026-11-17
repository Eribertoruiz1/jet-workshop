/**
 * Thickness of an airfoil section as a function of the chord fraction xi:
 * T(xi) = (upper + lower) / 100, both ordinates positive on each side of the
 * chord (geometry/airfoils.json). The nose, trailing-edge and interpolation
 * treatments are the ones PLAN.md section 3 fixes before any computation:
 *
 * - nose "polygonal" (nominal): T(0) = 0 and a straight line to the first
 *   tabulated station, x/c = 0.5 %. The non-zero upper ordinate tabulated at
 *   x/c = 0 by the cambered sections is not used (inside input I8).
 * - nose "rounded" (input I8): on [0, 0.005] the half-thickness is
 *   a sqrt(xi) + b xi with a = sqrt(2 r) from the tabulated leading-edge radius
 *   and b such that it meets the table at 0.5 %; the slope is infinite at 0.
 * - trailing edge "open" (nominal): the 4 % section ends with 0.105 % on each
 *   side; that thickness continues downstream as a wake of constant thickness.
 *   "closed" (input I7): the last tabulated interval closes to zero.
 * - interpolation "linear" (nominal) between stations, or "spline" (input I2):
 *   natural cubic spline through the stations from 0.5 % to 100 %; the nose
 *   interval keeps its own treatment.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { naturalSpline, segmentIndex, type Spline } from "./numerics.ts";

export type NoseTreatment = "polygonal" | "rounded";
export type TrailingEdgeTreatment = "open" | "closed";
export type Interpolation = "linear" | "spline";

export interface SectionOptions {
  nose: NoseTreatment;
  trailingEdge: TrailingEdgeTreatment;
  interpolation: Interpolation;
}

export const NOMINAL_SECTION_OPTIONS: SectionOptions = { nose: "polygonal", trailingEdge: "open", interpolation: "linear" };

interface AirfoilsFile {
  stationsPercent: number[];
  sections: Record<string, { nominalThickness: number; leadingEdgeRadiusChord: number; upper: number[]; lower: number[] }>;
  l52b08TableI: { upper: number[]; lower: number[]; leadingEdgeRadiusChord: number };
}

const AIRFOILS = fileURLToPath(new URL("../geometry/airfoils.json", import.meta.url));
let airfoilsCache: AirfoilsFile | null = null;
export function loadAirfoils(): AirfoilsFile {
  if (!airfoilsCache) airfoilsCache = JSON.parse(readFileSync(AIRFOILS, "utf8")) as AirfoilsFile;
  return airfoilsCache;
}

/** Kind of an interval between stations, for the spanwise integration. */
export type IntervalKind = "constant-slope" | "smooth" | "sqrt-nose";

/**
 * A section as used by the area integrals. Stations `xi` run from 0 to 1;
 * outside [0, 1] the slope is zero (ahead of the leading edge, or in the wake
 * or behind a closed trailing edge).
 */
export interface SectionModel {
  name: string;
  xi: readonly number[];
  /** Thickness at each station (fraction of chord), after the nose and trailing-edge treatment */
  t: readonly number[];
  kinds: readonly IntervalKind[];
  /** Slope on each interval when its kind is constant-slope */
  slopes: readonly number[];
  /** Thickness behind the trailing edge (wake), fraction of the local chord */
  wakeThickness: number;
  thickness(xi: number): number;
  slope(xi: number): number;
  maxThickness: number;
}

export function sectionModel(name: string, opts: SectionOptions = NOMINAL_SECTION_OPTIONS): SectionModel {
  const f = loadAirfoils();
  const s = f.sections[name];
  if (!s) throw new Error(`unknown section ${name}`);
  const xi = f.stationsPercent.map((p) => p / 100);
  const t = s.upper.map((u, i) => (u + s.lower[i]!) / 100);
  t[0] = 0; // polygonal or rounded nose: zero thickness at the leading edge
  if (opts.trailingEdge === "closed") t[t.length - 1] = 0;
  const wakeThickness = opts.trailingEdge === "open" ? t[t.length - 1]! : 0;
  const n = xi.length;
  const kinds: IntervalKind[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const nose = i === 0;
    kinds.push(nose ? (opts.nose === "rounded" ? "sqrt-nose" : "constant-slope") : opts.interpolation === "spline" ? "smooth" : "constant-slope");
    slopes.push((t[i + 1]! - t[i]!) / (xi[i + 1]! - xi[i]!));
  }
  // Rounded nose: half-thickness a sqrt(xi) + b xi on [0, xi1].
  const xi1 = xi[1]!;
  const a = Math.sqrt(2 * s.leadingEdgeRadiusChord);
  const b = (t[1]! / 2 - a * Math.sqrt(xi1)) / xi1;
  let spline: Spline | null = null;
  if (opts.interpolation === "spline") spline = naturalSpline(xi.slice(1), t.slice(1));
  const thickness = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= 1) return wakeThickness;
    if (x < xi1) return opts.nose === "rounded" ? 2 * (a * Math.sqrt(x) + b * x) : (t[1]! * x) / xi1;
    if (spline) return spline.value(x);
    const i = segmentIndex(xi, x);
    return t[i]! + slopes[i]! * (x - xi[i]!);
  };
  const slope = (x: number): number => {
    if (x <= 0 || x >= 1) return 0;
    if (x < xi1) return opts.nose === "rounded" ? a / Math.sqrt(x) + 2 * b : slopes[0]!;
    if (spline) return spline.slope(x);
    return slopes[segmentIndex(xi, x)]!;
  };
  let maxThickness = 0;
  for (let i = 0; i <= 4000; i++) maxThickness = Math.max(maxThickness, thickness(i / 4000));
  return { name, xi, t, kinds, slopes, wakeThickness, thickness, slope, maxThickness };
}
