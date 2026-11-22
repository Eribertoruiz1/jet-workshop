/**
 * Cases with a known answer for the numerical verification (PLAN.md, section 6).
 * No drag data: only shapes and closed forms.
 *
 * 1. Sears-Haack body, S = A_max (1 - xi^2)^(3/2) on a length l:
 *    D/q = (9 pi / 2)(A_max / l)^2. Jones, Report 1284, eq. (A3), p. 762:
 *    C_D = (9/8) pi^2 (r_max / x_0)^2 on the maximum area, length 2 x_0.
 * 2. Parabolic-arc body, r = R (1 - xi^2): slender-body drag
 *    D/q = (128 / 3 pi)(A_max / l)^2. Derived here (see `parabolicBodyExact`);
 *    UNVERIFIED against a printed source.
 * 3. Ogive-cylinder: no closed form; convergence only.
 * 4. Elliptic wing with biconvex sections, thickness 2 z (z = z_max (1 - x^2/a^2 - y^2/b^2)):
 *    C_D = 4 (z_max/a)^2 / sqrt(M^2 - 1 + a^2/b^2) * [2 - (M^2 - 1)/(M^2 - 1 + a^2/b^2)]
 *    on the plan area pi a b. Jones, Report 1284, eq. (A5), p. 762.
 * 5. Rectangular wing, biconvex section of thickness ratio tau: tends to
 *    16 tau^2 / (3 beta) as the aspect ratio grows (Ackeret, two-dimensional).
 *    UNVERIFIED in a printed source here; confirmed indirectly as the limit
 *    b/a -> infinity of case 4 (PLAN.md, section 6).
 */

import type { RevolutionShape } from "./body.ts";
import type { EquivalentBodyPart } from "./wavedrag.ts";

export function searsHaackShape(length: number, aMax: number): RevolutionShape {
  const x0 = length / 2;
  const S = (x: number): number => {
    const xi = (x - x0) / x0;
    return Math.abs(xi) >= 1 ? 0 : aMax * Math.pow(1 - xi * xi, 1.5);
  };
  return {
    r: (x) => Math.sqrt(S(x) / Math.PI),
    sPrimeNormal: (x) => {
      const xi = (x - x0) / x0;
      return Math.abs(xi) >= 1 ? 0 : (-3 * aMax * xi * Math.sqrt(1 - xi * xi)) / x0;
    },
    xStart: 0,
    xEndVariation: length,
    rMax: Math.sqrt(aMax / Math.PI),
    closed: true,
  };
}

export const searsHaackExact = (length: number, aMax: number): number => ((9 * Math.PI) / 2) * (aMax / length) ** 2;

export function parabolicShape(length: number, radius: number): RevolutionShape {
  const x0 = length / 2;
  const aMax = Math.PI * radius * radius;
  return {
    r: (x) => {
      const xi = (x - x0) / x0;
      return Math.abs(xi) >= 1 ? 0 : radius * (1 - xi * xi);
    },
    sPrimeNormal: (x) => {
      const xi = (x - x0) / x0;
      return Math.abs(xi) >= 1 ? 0 : (aMax * 2 * (1 - xi * xi) * (-2 * xi)) / x0;
    },
    xStart: 0,
    xEndVariation: length,
    rMax: radius,
    closed: true,
  };
}

/**
 * Slender-body drag of the parabolic-arc body, derived two ways (UNVERIFIED in print):
 * (a) S'(x) = -(4 A/x0) cos(phi) sin^2(phi) with x = x0 cos(phi), whose sine coefficients are
 *     A_n = 8 C n / (pi (n^2 - 1)(n^2 - 9)) for even n, C = 4 A / x0, and the series
 *     sum over even n of n^3 / ((n^2 - 1)^2 (n^2 - 9)^2) = 1/24;
 * (b) the log-kernel double integral with S'' = (4A/x0^2)(3 xi^2 - 1).
 * Both give D/q = 32 A^2 / (3 pi x0^2) = (128 / 3 pi)(A / l)^2. `parabolicSeriesCheck` evaluates (a).
 */
export const parabolicBodyExact = (length: number, radius: number): number => {
  const a = Math.PI * radius * radius;
  return (128 / (3 * Math.PI)) * (a / length) ** 2;
};

/** Partial sum of the series in (a): should approach 1/24. */
export function parabolicSeriesCheck(terms = 200000): number {
  let s = 0;
  for (let n = 2; n <= terms; n += 2) s += n ** 3 / ((n * n - 1) ** 2 * (n * n - 9) ** 2);
  return s;
}

/** Elliptic wing (semi-axes a along x, b along y) with paraboloidal thickness 2 z_max (1 - x^2/a^2 - y^2/b^2). */
export function ellipticWing(a: number, b: number, zMax: number): EquivalentBodyPart {
  return {
    support: (k) => {
      const e = Math.sqrt(a * a + k * k * b * b);
      return [-e, e];
    },
    sPrime: (X, k) => {
      const A = (k * k) / (a * a) + 1 / (b * b);
      const B = (2 * X * k) / (a * a);
      const C = (X * X) / (a * a) - 1;
      const disc = B * B - 4 * A * C;
      if (disc <= 0) return 0;
      const sq = Math.sqrt(disc);
      const y1 = (-B - sq) / (2 * A);
      const y2 = (-B + sq) / (2 * A);
      return (-4 * zMax / (a * a)) * (X * (y2 - y1) + (k * (y2 * y2 - y1 * y1)) / 2);
    },
  };
}

export function ellipticWingExact(mach: number, a: number, b: number, zMax: number): number {
  const m = mach * mach - 1 + (a * a) / (b * b);
  return ((4 * (zMax / a) ** 2) / Math.sqrt(m)) * (2 - (mach * mach - 1) / m);
}

/** Rectangular wing of chord c and span b, leading edge at x = 0, biconvex section t = 4 tau c xi (1 - xi). */
export function rectangularWing(chord: number, span: number, tau: number): EquivalentBodyPart {
  const h = span / 2;
  return {
    support: (k) => [-k * h, chord + k * h],
    sPrime: (X, k) => {
      let y0: number;
      let y1: number;
      if (k === 0) {
        if (X <= 0 || X >= chord) return 0;
        y0 = -h;
        y1 = h;
      } else {
        y0 = Math.max(-h, -X / k);
        y1 = Math.min(h, (chord - X) / k);
        if (y1 <= y0) return 0;
      }
      const F = (y: number): number => 4 * tau * (y - (2 / chord) * (X * y + (k * y * y) / 2));
      return F(y1) - F(y0);
    },
  };
}

export const ackeretBiconvex = (mach: number, tau: number): number => (16 * tau * tau) / (3 * Math.sqrt(mach * mach - 1));
