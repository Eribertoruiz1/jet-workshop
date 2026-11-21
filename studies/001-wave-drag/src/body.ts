/**
 * Bodies of revolution for the area integrals.
 *
 * Normal cuts (M = 1): S(x) = pi r(x)^2.
 * Mach planes (M > 1): the projected area of the cut on a plane normal to the
 * free stream (Jones, Report 1284, p. 758: S = s sin(mu)). For a body of
 * revolution it does not depend on the roll angle theta; in the plane's own
 * coordinate eta (across) it is
 *   S(X) = integral of 2 sqrt(r(X + beta eta)^2 - eta^2) d eta
 * over the eta where the root is real. It is computed by quadrature (the
 * square-root ends removed by a cosine map), tabulated on a fine grid, and
 * differentiated by central differences; the table is interpolated linearly.
 * It is the exact cut of the analytic shape, not the slender-body
 * approximation pi r(X)^2, which it tends to as beta r'/1 -> 0.
 */

import { bisect, gl } from "./numerics.ts";

export interface RevolutionShape {
  /** Radius r(x); zero ahead of the nose; constant (cylinder) beyond `xEndVariation` */
  r(x: number): number;
  /** dS/dx of the normal area, 2 pi r r', exact */
  sPrimeNormal(x: number): number;
  xStart: number;
  xEndVariation: number;
  rMax: number;
  /** True for a closed body (r = 0 behind xEndVariation); false for a body that continues as a cylinder */
  closed: boolean;
}

/** Tangent ogive of length L on a cylinder of radius R; the ogive radius is (R^2 + L^2) / 2R. */
export function ogiveCylinder(radius: number, noseLength: number): RevolutionShape & { ogiveRadius: number } {
  const R = radius;
  const L = noseLength;
  const rho = (R * R + L * L) / (2 * R);
  const r = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= L) return R;
    return Math.sqrt(rho * rho - (L - x) * (L - x)) - (rho - R);
  };
  const rp = (x: number): number => {
    if (x <= 0 || x >= L) return 0;
    return (L - x) / Math.sqrt(rho * rho - (L - x) * (L - x));
  };
  return { r, sPrimeNormal: (x) => 2 * Math.PI * r(x) * rp(x), xStart: 0, xEndVariation: L, rMax: R, closed: false, ogiveRadius: rho };
}

/** Projected area of a Mach-plane cut of a body of revolution, at axial station X of the plane. */
export function obliqueArea(shape: RevolutionShape, X: number, beta: number): number {
  if (beta === 0) {
    const r = shape.r(X);
    return Math.PI * r * r;
  }
  const R = shape.rMax;
  if (X >= shape.xEndVariation + beta * R) return shape.closed ? 0 : Math.PI * R * R;
  if (X <= shape.xStart - beta * R) return 0;
  const fPlus = (e: number): number => shape.r(X + beta * e) - e;
  const fMinus = (e: number): number => shape.r(X + beta * e) + e;
  const ePlus = fPlus(0) <= 0 ? 0 : bisect(fPlus, 0, R);
  const eMinus = fMinus(0) <= 0 ? 0 : bisect(fMinus, -R, 0);
  if (ePlus - eMinus <= 0) return 0;
  const mid = (ePlus + eMinus) / 2;
  const half = (ePlus - eMinus) / 2;
  const { x, w } = gl(24);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    // eta = mid + half cos(psi), psi in [0, pi]
    const psi = (Math.PI / 2) * (x[i]! + 1);
    const e = mid + half * Math.cos(psi);
    const rr = shape.r(X + beta * e);
    const g = rr * rr - e * e;
    if (g > 0) s += w[i]! * 2 * Math.sqrt(g) * half * Math.sin(psi);
  }
  return s * (Math.PI / 2);
}

export interface BodyTable {
  support: [number, number];
  sPrime(X: number): number;
  area(X: number): number;
}

/** dS/dX of the body along the equivalent body at a given beta (independent of theta). */
export function bodyTable(shape: RevolutionShape, beta: number, n = 3000): BodyTable {
  if (beta === 0) {
    return {
      support: [shape.xStart, shape.xEndVariation],
      sPrime: (X) => (X <= shape.xStart || X >= shape.xEndVariation ? 0 : shape.sPrimeNormal(X)),
      area: (X) => obliqueArea(shape, X, 0),
    };
  }
  const a = shape.xStart - beta * shape.rMax;
  const b = shape.xEndVariation + beta * shape.rMax;
  const h = (b - a) / n;
  const d = Math.min(1e-5, h / 10);
  const xs: number[] = [];
  const sp: number[] = [];
  for (let i = 0; i <= n; i++) {
    const X = a + i * h;
    xs.push(X);
    sp.push((obliqueArea(shape, X + d, beta) - obliqueArea(shape, X - d, beta)) / (2 * d));
  }
  sp[0] = 0;
  sp[n] = 0;
  return {
    support: [a, b],
    sPrime: (X) => {
      if (X <= a || X >= b) return 0;
      const t = (X - a) / h;
      const i = Math.min(n - 1, Math.floor(t));
      const f = t - i;
      return sp[i]! * (1 - f) + sp[i + 1]! * f;
    },
    area: (X) => obliqueArea(shape, X, beta),
  };
}
