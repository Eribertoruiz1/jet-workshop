/**
 * Far-field wave drag of an equivalent-body area distribution.
 *
 * Jones, NACA Report 1284 (1956):
 * - p. 757, at M = 1 (normal cuts): D = -(rho V^2 / 4 pi) iint S''(x) S''(x1) log|x - x1| dx dx1.
 * - pp. 758-759, M > 1: for each roll angle theta the Mach planes
 *   X = x - y' cos(theta) - z' sin(theta), y' = beta y, z' = beta z, cut an
 *   area whose projection is S(X, theta); with X = X_c - X_0 cos(phi) and
 *   S'(X) = sum A_n sin(n phi), D'(theta) = (pi rho V^2 / 8) sum n A_n^2,
 *   and D = (1 / 2 pi) integral of D'(theta) over theta.
 * With q = rho V^2 / 2: D'/q = (pi / 4) sum n A_n^2.
 *
 * Numerics (PLAN.md, section 6):
 * - A_n by the midpoint rule on M_phi points of phi in [0, pi]; M_phi is a
 *   quadrature parameter (a fixed multiple of the largest N), not a smoothing.
 * - The smoothing is the truncation of the series at N terms.
 * - The average over theta is taken on [0, pi/2]: for a configuration
 *   symmetric in y and z, D'(theta) depends only on |cos(theta)|. The rule is
 *   a composite Gauss-Legendre split at the singular angles (`thetaRule`).
 */

import { gl } from "./numerics.ts";

export interface SingularAngle {
  theta: number;
  /** Strong: an edge or the nose junction, where D'(theta) peaks; weak: an interior ridge of the table */
  strong: boolean;
}


export interface EquivalentBodyPart {
  /** X range where this part's S' can be non-zero, for a trace slope k = beta cos(theta) >= 0 */
  support(k: number): [number, number];
  /** dS/dX of this part at X for trace slope k */
  sPrime(X: number, k: number): number;
}

const SIN_CACHE = new Map<string, Float64Array>();

function sineTable(mPhi: number, nMax: number): Float64Array {
  const key = `${mPhi}|${nMax}`;
  let t = SIN_CACHE.get(key);
  if (!t) {
    t = new Float64Array(mPhi * nMax);
    for (let j = 0; j < mPhi; j++) {
      const phi = ((j + 0.5) * Math.PI) / mPhi;
      for (let n = 1; n <= nMax; n++) t[(n - 1) * mPhi + j] = Math.sin(n * phi);
    }
    SIN_CACHE.set(key, t);
  }
  return t;
}

/** In-place iterative radix-2 complex FFT (length a power of two). */
function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]!;
      re[i] = re[j]!;
      re[j] = t;
      t = im[i]!;
      im[i] = im[j]!;
      im[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2]! * cr - im[i + k + len / 2]! * ci;
        const ai = re[i + k + len / 2]! * ci + im[i + k + len / 2]! * cr;
        re[i + k + len / 2] = re[i + k]! - ar;
        im[i + k + len / 2] = im[i + k]! - ai;
        re[i + k] = re[i + k]! + ar;
        im[i + k] = im[i + k]! + ai;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
}

/**
 * Sine coefficients A_n = (2/M) sum_j f_j sin(n phi_j), phi_j = (j + 1/2) pi / M,
 * n = 1..nMax: directly, or through an FFT of length 2M (DST-II) when M is a
 * power of two and nMax is large.
 */
function sineCoefficients(f: Float64Array, nMax: number): Float64Array {
  const m = f.length;
  const out = new Float64Array(nMax);
  const pow2 = (m & (m - 1)) === 0;
  if (pow2 && nMax > 256) {
    const re = new Float64Array(2 * m);
    const im = new Float64Array(2 * m);
    for (let j = 0; j < m; j++) {
      re[j] = f[j]!;
      re[2 * m - 1 - j] = -f[j]!;
    }
    fft(re, im);
    for (let n = 1; n <= nMax; n++) {
      const a = (-Math.PI * n) / (2 * m);
      const zi = re[n]! * Math.sin(a) + im[n]! * Math.cos(a);
      out[n - 1] = (2 / m) * (-zi / 2);
    }
    return out;
  }
  const tab = sineTable(m, nMax);
  for (let n = 1; n <= nMax; n++) {
    let a = 0;
    const off = (n - 1) * m;
    for (let j = 0; j < m; j++) a += f[j]! * tab[off + j]!;
    out[n - 1] = (a * 2) / m;
  }
  return out;
}

export interface ThetaResult {
  /** Partial sums per group: dq[g][N - 1] = D'/q with N terms, square inches */
  dq: Float64Array[];
  support: [number, number];
  coefficients: Float64Array[];
}

/**
 * D'(theta)/q for every truncation 1..nMax at one roll angle (trace slope k),
 * for each group of parts (default: one group with all parts). All groups use
 * the same equivalent-body interval (the union of the parts' supports), so the
 * truncation means the same smoothing for each of them.
 */
export function dragAtTrace(parts: EquivalentBodyPart[], k: number, nMax: number, mPhi: number, groups: number[][] = [parts.map((_, i) => i)]): ThetaResult {
  let lo = Number.POSITIVE_INFINITY;
  let hi = Number.NEGATIVE_INFINITY;
  for (const p of parts) {
    const [a, b] = p.support(k);
    if (b > a) {
      lo = Math.min(lo, a);
      hi = Math.max(hi, b);
    }
  }
  const dq = groups.map(() => new Float64Array(nMax));
  if (!(hi > lo)) return { dq, support: [0, 0], coefficients: groups.map(() => new Float64Array(nMax)) };
  const xc = (lo + hi) / 2;
  const x0 = (hi - lo) / 2;
  const sp = parts.map(() => new Float64Array(mPhi));
  for (let j = 0; j < mPhi; j++) {
    const phi = ((j + 0.5) * Math.PI) / mPhi;
    const X = xc - x0 * Math.cos(phi);
    for (let p = 0; p < parts.length; p++) sp[p]![j] = parts[p]!.sPrime(X, k);
  }
  const coefficients = groups.map((g, gi) => {
    const f = new Float64Array(mPhi);
    for (const p of g) for (let j = 0; j < mPhi; j++) f[j] = f[j]! + sp[p]![j]!;
    const a = sineCoefficients(f, nMax);
    let acc = 0;
    for (let n = 1; n <= nMax; n++) {
      acc += (Math.PI / 4) * n * a[n - 1]! * a[n - 1]!;
      dq[gi]![n - 1] = acc;
    }
    return a;
  });
  return { dq, support: [lo, hi], coefficients };
}

export interface DragGrid {
  ns: number[];
  /** Theta level: Gauss-Legendre nodes per sub-interval (composite rule) */
  nThetas: number[];
  /** Total number of roll angles at each theta level */
  angles: number[];
  /** dq[iN][iTheta]: D/q of the first group, square inches */
  dq: number[][];
  /** groups[g][iN][iTheta]: D/q of each group */
  groups: number[][][];
}

/**
 * Roll angles where D'(theta) is singular: the trace of the Mach plane on the
 * wing plane, x = X +/- k eta with k = beta cos(theta), is parallel to a line
 * along which S' jumps (an edge or a ridge of the section, a line of constant
 * chord fraction with sweep L): beta cos(theta*) = |tan L|. There D'(theta)
 * has a logarithmic singularity (jump in S'), or worse for a rounded nose.
 */
export function singularThetas(beta: number, lines: { tan: number; strong: boolean }[]): SingularAngle[] {
  const out: SingularAngle[] = [];
  for (const l of lines) {
    const c = Math.abs(l.tan) / beta;
    if (c < 1) out.push({ theta: Math.acos(c), strong: l.strong });
  }
  return out;
}

/**
 * Composite Gauss-Legendre rule for the average over theta in [0, pi/2]:
 * the interval is split at the singular angles, and each piece is graded
 * toward both ends with theta = a + (b - a)(3 t^2 - 2 t^3), whose zero slope
 * at the ends removes a logarithmic singularity. Weights sum to 1.
 * (Harris, TM X-947, integrates theta with Boole's rule on equal steps; the
 * equal-step rule converges only as 1/n next to a singular angle, see the
 * verification with the rectangular wing.)
 */
/** Geometric grading toward strong singular angles: ratio and smallest piece, radians. */
export const THETA_GRADING = { ratio: 0.25, smallest: 1e-3, weakCuts: true };

export function thetaRule(m: number, singular: SingularAngle[]): { theta: number[]; weight: number[] } {
  const cuts: SingularAngle[] = [
    { theta: 0, strong: false },
    { theta: Math.PI / 2, strong: false },
    ...singular.filter((s) => s.theta >= 0 && s.theta <= Math.PI / 2 && (s.strong || THETA_GRADING.weakCuts)),
  ].sort((a, b) => a.theta - b.theta);
  const ends: SingularAngle[] = [];
  for (const c of cuts) {
    const last = ends[ends.length - 1];
    if (!last || c.theta - last.theta > 1e-9) ends.push({ ...c });
    else last.strong = last.strong || c.strong;
  }
  // Pieces: each interval between cuts, subdivided geometrically toward a strong end.
  const pieces: [number, number][] = [];
  for (let i = 0; i + 1 < ends.length; i++) {
    const a = ends[i]!.theta;
    const b = ends[i + 1]!.theta;
    const d = b - a;
    const left: number[] = [];
    const right: number[] = [];
    if (ends[i]!.strong) for (let s = d * THETA_GRADING.ratio; s > THETA_GRADING.smallest; s *= THETA_GRADING.ratio) left.push(a + s);
    if (ends[i + 1]!.strong) for (let s = d * THETA_GRADING.ratio; s > THETA_GRADING.smallest; s *= THETA_GRADING.ratio) right.push(b - s);
    const pts = [a, ...left.reverse(), ...right, b].filter((p, k, arr) => k === 0 || p > arr[k - 1]! + 1e-12);
    // When both ends are graded the two families may cross in the middle: keep them ordered.
    pts.sort((p, q) => p - q);
    for (let k = 0; k + 1 < pts.length; k++) if (pts[k + 1]! - pts[k]! > 1e-12) pieces.push([pts[k]!, pts[k + 1]!]);
  }
  const { x, w } = gl(m);
  const theta: number[] = [];
  const weight: number[] = [];
  for (const [a, b] of pieces) {
    const d = b - a;
    for (let k = 0; k < m; k++) {
      const t = (x[k]! + 1) / 2;
      theta.push(a + d * t * t * (3 - 2 * t));
      weight.push((w[k]! / 2) * d * 6 * t * (1 - t) * (2 / Math.PI));
    }
  }
  return { theta, weight };
}

/**
 * D/q on a grid of truncations and theta levels. At beta = 0 the cut is
 * normal and theta does not enter.
 */
export function dragGrid(
  parts: EquivalentBodyPart[],
  beta: number,
  ns: number[],
  nThetas: number[],
  singular: SingularAngle[] = [],
  groups: number[][] = [parts.map((_, i) => i)],
  mPhiFactor = 8,
): DragGrid {
  const nMax = Math.max(...ns);
  const mPhi = Math.max(512, mPhiFactor * nMax);
  const out: number[][][] = groups.map(() => ns.map(() => nThetas.map(() => 0)));
  if (beta === 0) {
    const r = dragAtTrace(parts, 0, nMax, mPhi, groups);
    groups.forEach((_, g) => ns.forEach((n, i) => nThetas.forEach((__, j) => (out[g]![i]![j] = r.dq[g]![n - 1]!))));
    return { ns, nThetas, angles: nThetas.map(() => 1), dq: out[0]!, groups: out };
  }
  const angles: number[] = [];
  nThetas.forEach((m, j) => {
    const rule = thetaRule(m, singular);
    angles.push(rule.theta.length);
    rule.theta.forEach((th, q) => {
      const r = dragAtTrace(parts, beta * Math.cos(th), nMax, mPhi, groups);
      const w = rule.weight[q]!;
      groups.forEach((_, g) => ns.forEach((n, i) => (out[g]![i]![j] = out[g]![i]![j]! + w * r.dq[g]![n - 1]!)));
    });
  });
  return { ns, nThetas, angles, dq: out[0]!, groups: out };
}

/** Plateau rule of PREREGISTRATION.md, A.7, on a three-level sweep (values in CD). */
export function plateau(values: [number, number, number], absFloor = 0.00005, relFloor = 0.01, noise = 1e-6): { converged: boolean; lastChange: number; previousChange: number } {
  const prev = Math.abs(values[1] - values[0]);
  const last = Math.abs(values[2] - values[1]);
  // Changes at numerical-noise level (below `noise`, 1/50 of the 0.00005 floor) count as zero.
  const p = prev < noise ? 0 : prev;
  const l = last < noise ? 0 : last;
  const converged = l <= p / 2 && l <= Math.max(relFloor * Math.abs(values[2]), absFloor);
  return { converged, lastChange: last, previousChange: prev };
}
