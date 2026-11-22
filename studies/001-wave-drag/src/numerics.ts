/**
 * Small numerical tools: Gauss-Legendre nodes, bisection, natural cubic spline.
 * Standard algorithms, written out here; nothing in them is a modelling choice.
 */

/** Gauss-Legendre nodes and weights on [-1, 1] (Newton iteration on P_n). */
export function gaussLegendre(n: number): { x: number[]; w: number[] } {
  const x: number[] = Array.from({ length: n }, () => 0);
  const w: number[] = Array.from({ length: n }, () => 0);
  const m = Math.floor((n + 1) / 2);
  for (let i = 0; i < m; i++) {
    let z = Math.cos((Math.PI * (i + 0.75)) / (n + 0.5));
    let pp = 0;
    for (let iter = 0; iter < 100; iter++) {
      let p1 = 1;
      let p2 = 0;
      for (let j = 1; j <= n; j++) {
        const p3 = p2;
        p2 = p1;
        p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j;
      }
      pp = (n * (z * p1 - p2)) / (z * z - 1);
      const z1 = z;
      z = z1 - p1 / pp;
      if (Math.abs(z - z1) < 1e-15) break;
    }
    x[i] = -z;
    x[n - 1 - i] = z;
    w[i] = 2 / ((1 - z * z) * pp * pp);
    w[n - 1 - i] = w[i]!;
  }
  return { x, w };
}

const GL_CACHE = new Map<number, { x: number[]; w: number[] }>();
export function gl(n: number): { x: number[]; w: number[] } {
  let r = GL_CACHE.get(n);
  if (!r) {
    r = gaussLegendre(n);
    GL_CACHE.set(n, r);
  }
  return r;
}

/** Integral of f on [a, b] by n-point Gauss-Legendre. */
export function integrateGL(f: (x: number) => number, a: number, b: number, n = 8): number {
  const { x, w } = gl(n);
  const h = (b - a) / 2;
  const c = (a + b) / 2;
  let s = 0;
  for (let i = 0; i < n; i++) s += w[i]! * f(c + h * x[i]!);
  return s * h;
}

/** Root of f on [a, b] by bisection; f(a) and f(b) must not have the same strict sign. */
export function bisect(f: (x: number) => number, a: number, b: number, iterations = 80): number {
  let fa = f(a);
  if (fa === 0) return a;
  const fb = f(b);
  if (fb === 0) return b;
  let lo = a;
  let hi = b;
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (fm === 0) return mid;
    if (fm > 0 === fa > 0) {
      lo = mid;
      fa = fm;
    } else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Natural cubic spline through (x_i, y_i): value and first derivative. */
export interface Spline {
  value(x: number): number;
  slope(x: number): number;
}

export function naturalSpline(xs: number[], ys: number[]): Spline {
  const n = xs.length;
  const m: number[] = Array.from({ length: n }, () => 0); // second derivatives
  const a: number[] = Array.from({ length: n }, () => 0);
  const b: number[] = Array.from({ length: n }, () => 0);
  const c: number[] = Array.from({ length: n }, () => 0);
  const d: number[] = Array.from({ length: n }, () => 0);
  b[0] = 1;
  b[n - 1] = 1;
  for (let i = 1; i < n - 1; i++) {
    const h0 = xs[i]! - xs[i - 1]!;
    const h1 = xs[i + 1]! - xs[i]!;
    a[i] = h0;
    b[i] = 2 * (h0 + h1);
    c[i] = h1;
    d[i] = 6 * ((ys[i + 1]! - ys[i]!) / h1 - (ys[i]! - ys[i - 1]!) / h0);
  }
  // Thomas algorithm.
  for (let i = 1; i < n; i++) {
    const k = a[i]! / b[i - 1]!;
    b[i] = b[i]! - k * c[i - 1]!;
    d[i] = d[i]! - k * d[i - 1]!;
  }
  m[n - 1] = d[n - 1]! / b[n - 1]!;
  for (let i = n - 2; i >= 0; i--) m[i] = (d[i]! - c[i]! * m[i + 1]!) / b[i]!;
  const seg = (x: number): number => {
    let lo = 0;
    let hi = n - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (xs[mid]! <= x) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
  return {
    value(x) {
      const i = seg(x);
      const h = xs[i + 1]! - xs[i]!;
      const t1 = xs[i + 1]! - x;
      const t0 = x - xs[i]!;
      return (m[i]! * t1 ** 3 + m[i + 1]! * t0 ** 3) / (6 * h) + (ys[i]! / h - (m[i]! * h) / 6) * t1 + (ys[i + 1]! / h - (m[i + 1]! * h) / 6) * t0;
    },
    slope(x) {
      const i = seg(x);
      const h = xs[i + 1]! - xs[i]!;
      const t1 = xs[i + 1]! - x;
      const t0 = x - xs[i]!;
      return (-m[i]! * t1 * t1 + m[i + 1]! * t0 * t0) / (2 * h) - (ys[i]! / h - (m[i]! * h) / 6) + (ys[i + 1]! / h - (m[i + 1]! * h) / 6);
    },
  };
}

/** Index of the segment [xs[i], xs[i+1]) that holds x (xs ascending), clamped to the ends. */
export function segmentIndex(xs: readonly number[], x: number): number {
  let lo = 0;
  let hi = xs.length - 2;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (xs[mid]! <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Bounded 1-D minimisation: dense grid, then golden-section refinement around the best node. */
export function minimise1D(f: (x: number) => number, lo: number, hi: number, gridN = 41, tol = 1e-7): { x: number; f: number } {
  let bestI = 0;
  let bestF = Number.POSITIVE_INFINITY;
  const xs: number[] = [];
  for (let i = 0; i < gridN; i++) {
    const x = lo + ((hi - lo) * i) / (gridN - 1);
    xs.push(x);
    const v = f(x);
    if (v < bestF) {
      bestF = v;
      bestI = i;
    }
  }
  let a = xs[Math.max(0, bestI - 1)]!;
  let b = xs[Math.min(gridN - 1, bestI + 1)]!;
  const g = (Math.sqrt(5) - 1) / 2;
  let c = b - g * (b - a);
  let d = a + g * (b - a);
  let fc = f(c);
  let fd = f(d);
  while (b - a > tol * Math.max(1, Math.abs(a) + Math.abs(b))) {
    if (fc < fd) {
      b = d;
      d = c;
      fd = fc;
      c = b - g * (b - a);
      fc = f(c);
    } else {
      a = c;
      c = d;
      fc = fd;
      d = a + g * (b - a);
      fd = f(d);
    }
  }
  const x = (a + b) / 2;
  const fx = f(x);
  return fx <= bestF ? { x, f: fx } : { x: xs[bestI]!, f: bestF };
}
