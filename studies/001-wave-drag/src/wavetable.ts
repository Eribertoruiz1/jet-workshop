/**
 * Wave-drag levels of candidates A and C for every geometry, uncertain-input
 * variant and Mach number the study needs, each on the full numerical grid:
 * N in N0/2, N0, 2 N0, 4 N0 and theta levels m0, 2 m0, 4 m0. From the grid:
 * - the nominal value (N0, m0);
 * - the input I3 (smoothing): N0/2 and 2 N0 at m0;
 * - the convergence sweep of PREREGISTRATION.md, A.7: N0, 2 N0, 4 N0 at 4 m0
 *   and m0, 2 m0, 4 m0 at 4 N0.
 * Geometry only; no drag data.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildConfiguration, NOMINAL_GEOMETRY, waveDragCD, type GeometryOptions } from "./config.ts";
import { FREEZE } from "./freeze.ts";

export const N_LEVELS = [FREEZE.n0 / 2, FREEZE.n0, 2 * FREEZE.n0, 4 * FREEZE.n0];
export const M_LEVELS = [FREEZE.m0, 2 * FREEZE.m0, 4 * FREEZE.m0];

export interface Level {
  total: number;
  wing: number;
  body: number;
}

/** Members of the numerical grid, by id `N<n>m<m>`. */
export type Members = Record<string, Level>;

export const NOMINAL_MEMBER = `N${FREEZE.n0}m${FREEZE.m0}`;
export const N_SWEEP = [FREEZE.n0, 2 * FREEZE.n0, 4 * FREEZE.n0].map((n) => `N${n}m${4 * FREEZE.m0}`);
export const M_SWEEP = M_LEVELS.map((m) => `N${4 * FREEZE.n0}m${m}`);
export const I3_MEMBERS = [`N${FREEZE.n0 / 2}m${FREEZE.m0}`, `N${2 * FREEZE.n0}m${FREEZE.m0}`];
export const ALL_SWEEP_MEMBERS = [...new Set([NOMINAL_MEMBER, ...N_SWEEP, ...M_SWEEP])];

export type VariantId = "nominal" | "I1+" | "I1-" | "I2" | "I6" | "I7" | "I8";

export function variantOptions(id: VariantId, shiftIn: number): GeometryOptions {
  switch (id) {
    case "nominal":
      return NOMINAL_GEOMETRY;
    case "I1+":
      return { ...NOMINAL_GEOMETRY, wingShiftIn: shiftIn };
    case "I1-":
      return { ...NOMINAL_GEOMETRY, wingShiftIn: -shiftIn };
    case "I2":
      return { ...NOMINAL_GEOMETRY, interpolation: "spline" };
    case "I6":
      return { ...NOMINAL_GEOMETRY, rootRule: "scaled" };
    case "I7":
      return { ...NOMINAL_GEOMETRY, trailingEdge: "closed" };
    case "I8":
      return { ...NOMINAL_GEOMETRY, nose: "rounded" };
  }
}

/** Uncertain-input variants that apply to a geometry. */
export function variantsFor(geometry: string): VariantId[] {
  const v: VariantId[] = ["nominal", "I1+", "I1-", "I2", "I8"];
  if (geometry.startsWith("open-")) v.push("I7");
  if (geometry === "47deg-root12-t06") v.push("I6");
  return v;
}

export interface WaveTable {
  /** levels[geometry][variant][mach.toFixed(3)] */
  levels: Record<string, Record<string, Record<string, Members>>>;
  seconds: Record<string, number>;
}

export function machKey(m: number): string {
  return m.toFixed(3);
}

export function computeMembers(geometry: string, variant: VariantId, mach: number, shiftIn: number): Members {
  const cfg = buildConfiguration(geometry, variantOptions(variant, shiftIn));
  const r = waveDragCD(cfg, mach, N_LEVELS, M_LEVELS);
  const out: Members = {};
  N_LEVELS.forEach((n, i) =>
    M_LEVELS.forEach((m, j) => {
      out[`N${n}m${m}`] = { total: r.total[i]![j]!, wing: r.wing[i]![j]!, body: r.body[i]![j]! };
    }),
  );
  return out;
}

export interface WaveRequest {
  geometry: string;
  /** Mach numbers at which every variant is needed (data conditions, M = 1 and the slope step) */
  machsWithVariants: number[];
  /** Mach numbers for figures only (nominal variant) */
  machsNominalOnly: number[];
}

/**
 * Compute (or reuse from `cachePath` when `reuse` is set) every requested level.
 * The cache key includes the frozen levels, so a change of N0 or m0 recomputes.
 */
export function buildWaveTable(requests: WaveRequest[], shiftIn: number, cachePath: string | null, reuse: boolean, log: (s: string) => void): WaveTable {
  let cached: WaveTable | null = null;
  const key = `${N_LEVELS.join(",")}|${M_LEVELS.join(",")}|${shiftIn}`;
  if (reuse && cachePath && existsSync(cachePath)) {
    const c = JSON.parse(readFileSync(cachePath, "utf8")) as WaveTable & { key: string };
    if (c.key === key) cached = c;
  }
  const table: WaveTable = { levels: {}, seconds: {} };
  for (const rq of requests) {
    const t0 = performance.now();
    const g = (table.levels[rq.geometry] = {} as Record<string, Record<string, Members>>);
    for (const v of variantsFor(rq.geometry)) {
      const machs = v === "nominal" ? [...rq.machsWithVariants, ...rq.machsNominalOnly] : rq.machsWithVariants;
      const vv = (g[v] = {} as Record<string, Members>);
      for (const m of [...new Set(machs.map(machKey))].map(Number).sort((a, b) => a - b)) {
        const hit = cached?.levels[rq.geometry]?.[v]?.[machKey(m)];
        vv[machKey(m)] = hit ?? computeMembers(rq.geometry, v, m, shiftIn);
      }
    }
    table.seconds[rq.geometry] = (performance.now() - t0) / 1000;
    log(`wave table: ${rq.geometry} ${table.seconds[rq.geometry]!.toFixed(0)} s`);
  }
  if (cachePath) writeFileSync(cachePath, JSON.stringify({ ...table, key }));
  return table;
}
