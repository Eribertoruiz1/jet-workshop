/**
 * Which wave levels the study needs: per geometry, the Mach numbers of the
 * conditions at or above 1 (with every uncertain-input variant), M = 1 and the
 * slope step (for the bridges), and a few more Mach numbers for the figures
 * (nominal only). Reads geometry/conditions.json only.
 */

import { loadConditionsFile } from "./conditions.ts";
import { FREEZE } from "./freeze.ts";
import type { WaveRequest } from "./wavetable.ts";

export const FIGURE_MACHS = [1.05, 1.08, 1.15, 1.2];

/** Wave-drag geometry of a study configuration id (open or held-out). */
export function geometryOf(config: string): string {
  if (config === "10.8deg-t04") return "open-10.8";
  if (config === "35deg-t04") return "open-35";
  if (config === "47deg-t04") return "open-47";
  return config;
}

export function waveRequests(scope: "open" | "all"): WaveRequest[] {
  const f = loadConditionsFile();
  const byGeom = new Map<string, Set<number>>();
  const add = (config: string, machs: number[]): void => {
    const g = geometryOf(config);
    const s = byGeom.get(g) ?? new Set<number>([1, 1 + FREEZE.slopeStepAboveOne]);
    for (const m of machs) if (m >= 1) s.add(m);
    byGeom.set(g, s);
  };
  for (const w of f.open) add(w.wing, w.machs);
  if (scope === "all") for (const h of f.heldout) add(h.config, h.machs);
  return [...byGeom.entries()].map(([geometry, s]) => ({
    geometry,
    machsWithVariants: [...s].sort((a, b) => a - b),
    machsNominalOnly: FIGURE_MACHS,
  }));
}
