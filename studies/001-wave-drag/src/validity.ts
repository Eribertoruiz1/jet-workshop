/**
 * Where each theory is expected to hold, per wing and Mach number (PLAN.md,
 * section 8, "Otras dos trampas"). Geometry only.
 * - Slender body: beta s / c_r small (s semispan, c_r root chord).
 * - McDevitt, Report 1253, summary: at M = 1 slender-body theory is adequate for
 *   rectangular wings if A (t/c)^(1/3) < 1.
 * - Transonic similarity (Spreiter, TN 2726, eq. 30): xi0 and A~ = [(gamma+1) tau]^(1/3) A.
 * - Linear theory: away from M = 1 (|xi0| large) and with no sonic edge.
 */

import { loadConditionsFile } from "./conditions.ts";
import { FREEZE } from "./freeze.ts";
import { chords, normalMach, sweepAtFractionDeg } from "./planform.ts";

export interface ValidityRow {
  config: string;
  mach: number;
  betaSOverC: number;
  xi0: number;
  aTilde: number;
  aTau13: number;
  mnLE: number;
  mnTE: number;
}

export function validityRows(): ValidityRow[] {
  const f = loadConditionsFile();
  const p = f.planform;
  const ch = chords(p);
  const rows: ValidityRow[] = [];
  for (const w of f.open) {
    const tau = w.thicknessRatio;
    const le = sweepAtFractionDeg(p, w.sweepQuarterChordDeg, 0);
    const te = sweepAtFractionDeg(p, w.sweepQuarterChordDeg, 1);
    for (const m of w.machs.filter((x) => x > 0.9)) {
      rows.push({
        config: w.wing,
        mach: m,
        betaSOverC: (Math.sqrt(Math.abs(m * m - 1)) * ch.semispanIn) / ch.rootChordIn,
        xi0: (m * m - 1) / Math.pow((FREEZE.gamma + 1) * tau, 2 / 3),
        aTilde: Math.cbrt((FREEZE.gamma + 1) * tau) * p.aspectRatio,
        aTau13: p.aspectRatio * Math.cbrt(tau),
        mnLE: normalMach(m, le),
        mnTE: normalMach(m, te),
      });
    }
  }
  return rows;
}
