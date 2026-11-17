/**
 * Trapezoidal planform: chords and the sweep of any constant-chord-fraction line.
 *
 * Pure geometry of a straight-tapered wing with its apex on the centre line:
 *   c(y) = c_r - (c_r - c_t) y / s
 *   x_n(y) = x_LE(y) + n c(y), so tan(L_n) = tan(L_LE) - n (c_r - c_t) / s
 * and, from the quarter-chord sweep, tan(L_n) = tan(L_c/4) - (n - 1/4)(c_r - c_t) / s.
 * With c_r = 2b / (A (1 + lambda)) this is the textbook relation
 * tan(L_n) = tan(L_m) - (4/A)(n - m)(1 - lambda)/(1 + lambda), derived here, not quoted.
 */

const DEG = Math.PI / 180;

export interface TrapezoidPlanform {
  aspectRatio: number;
  taperRatio: number;
  spanIn: number;
}

export interface PlanformChords {
  rootChordIn: number;
  tipChordIn: number;
  semispanIn: number;
}

export function chords(p: TrapezoidPlanform): PlanformChords {
  const rootChordIn = (2 * p.spanIn) / (p.aspectRatio * (1 + p.taperRatio));
  return { rootChordIn, tipChordIn: p.taperRatio * rootChordIn, semispanIn: p.spanIn / 2 };
}

/** Sweep of the line at chord fraction n (0 leading edge, 1 trailing edge), degrees. */
export function sweepAtFractionDeg(p: TrapezoidPlanform, sweepQuarterChordDeg: number, n: number): number {
  const c = chords(p);
  const t = Math.tan(sweepQuarterChordDeg * DEG) - (n - 0.25) * (c.rootChordIn - c.tipChordIn) / c.semispanIn;
  return Math.atan(t) / DEG;
}

/** Mach number component normal to an edge of the given sweep. */
export function normalMach(mach: number, edgeSweepDeg: number): number {
  return mach * Math.cos(edgeSweepDeg * DEG);
}

/** Free-stream Mach number at which an edge of the given sweep becomes sonic. */
export function sonicMach(edgeSweepDeg: number): number {
  return 1 / Math.cos(edgeSweepDeg * DEG);
}
