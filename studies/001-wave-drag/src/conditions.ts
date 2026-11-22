/**
 * Conditions of the study (open figure 9 samples and held-out test conditions),
 * their Mach segments and subsets as fixed in PREREGISTRATION.md (A.4, A.5).
 * Reads only studies/001-wave-drag/geometry/conditions.json: no drag data.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { TrapezoidPlanform } from "./planform.ts";

export type Segment = "T1" | "T2" | "T3" | "T4";
export type Subset = "open" | "blind" | "replica";

export interface Condition {
  subset: Subset;
  config: string;
  report: string;
  sweepQuarterChordDeg: number;
  mach: number;
  segment: Segment;
}

interface ConditionsFile {
  planform: TrapezoidPlanform & { source: string };
  open: { wing: string; sweepQuarterChordDeg: number; thicknessRatio: number; machs: number[] }[];
  heldout: { config: string; sweepQuarterChordDeg: number; thickness: string; report: string; machs: number[] }[];
  replica: { config: string; report: string; reason: string };
}

/** Mach segments of PREREGISTRATION.md, A.4. */
export function segmentOf(mach: number): Segment {
  if (mach <= 0.9) return "T1";
  if (mach <= 1.04) return "T2";
  if (mach <= 1.2) return "T3";
  return "T4";
}

const FILE = fileURLToPath(new URL("../geometry/conditions.json", import.meta.url));

export function loadConditionsFile(): ConditionsFile {
  return JSON.parse(readFileSync(FILE, "utf8")) as ConditionsFile;
}

export function allConditions(f: ConditionsFile = loadConditionsFile()): Condition[] {
  const out: Condition[] = [];
  for (const w of f.open) {
    for (const mach of w.machs) {
      out.push({ subset: "open", config: w.wing, report: "RM L52B08", sweepQuarterChordDeg: w.sweepQuarterChordDeg, mach, segment: segmentOf(mach) });
    }
  }
  for (const h of f.heldout) {
    const isReplica = h.config === f.replica.config && h.report === f.replica.report;
    for (const mach of h.machs) {
      out.push({ subset: isReplica ? "replica" : "blind", config: h.config, report: h.report, sweepQuarterChordDeg: h.sweepQuarterChordDeg, mach, segment: segmentOf(mach) });
    }
  }
  return out;
}

/** Configurations with a transonic Mach sweep, each giving one drag-rise Mach number. */
export function onsetConfigs(conds: Condition[]): { subset: Subset; config: string; report: string }[] {
  const seen = new Map<string, { subset: Subset; config: string; report: string }>();
  for (const c of conds) {
    if (c.segment === "T4") continue;
    const key = `${c.subset}|${c.config}|${c.report}`;
    if (!seen.has(key)) seen.set(key, { subset: c.subset, config: c.config, report: c.report });
  }
  return [...seen.values()];
}
