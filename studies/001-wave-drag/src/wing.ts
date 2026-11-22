/**
 * Trapezoidal wing for the area integrals: thickness area cut by a plane and
 * its derivative along the equivalent body.
 *
 * A Mach plane X = x - beta (y cos(theta) + z sin(theta)) meets the wing plane
 * z = 0 along the line x = X + k y, with k = beta cos(theta). The area of the
 * cut projected on a plane normal to the free stream (Jones, Report 1284,
 * pp. 758-759: S = s sin(mu)) is, for a thin wing, the integral of the local
 * thickness along the span:
 *   S_w(X) = sum over both halves of  integral t(X +/- k eta, eta) d eta,
 *   S_w'(X) = sum over both halves of integral dt/dx (X +/- k eta, eta) d eta,
 * with eta = |y|. Only the exposed wing is counted (eta from the body radius
 * to the tip). The local thickness is t = c(eta) T(xi, eta), xi the chord
 * fraction, so dt/dx = dT/dxi.
 *
 * Along the trace xi(eta) is a linear-fractional, monotone function of eta, so
 * the span splits at the eta where xi crosses each tabulated station. With the
 * linear table the slope is constant on each piece and the spanwise weights
 * are linear, so the integral is exact at the piece midpoint; the spline and
 * the rounded nose use Gauss-Legendre (the rounded nose with the substitution
 * eta = eta0 + u^2 about the leading-edge crossing, which removes the 1/sqrt).
 */

import { gl } from "./numerics.ts";
import type { SectionModel } from "./section.ts";

/** A section with a spanwise weight, piecewise linear in eta through the points given. */
export interface SpanTerm {
  section: SectionModel;
  /** (eta, weight) points, eta ascending, covering [0, semispan] */
  weight: readonly (readonly [number, number])[];
}

export interface WingInput {
  /** Station of the apex: leading edge carried to the centre line, inches from the nose */
  xApex: number;
  rootChord: number;
  tipChord: number;
  semispan: number;
  /** tan of the leading-edge sweep */
  tanLE: number;
  /** Inner end of the exposed wing (body radius), or 0 for the gross wing */
  etaRoot: number;
  terms: SpanTerm[];
}

function weightAt(w: readonly (readonly [number, number])[], eta: number): number {
  if (eta <= w[0]![0]) return w[0]![1];
  for (let i = 1; i < w.length; i++) {
    const [e1, v1] = w[i]!;
    if (eta <= e1) {
      const [e0, v0] = w[i - 1]!;
      return v0 + ((v1 - v0) * (eta - e0)) / (e1 - e0);
    }
  }
  return w[w.length - 1]![1];
}

export class TrapezoidWing {
  readonly dc: number;
  readonly stations: readonly number[];
  readonly spanBreaks: number[];
  readonly kinds: readonly string[];
  private readonly segConst: boolean[];
  private readonly termSlopes: Float64Array[];
  private readonly termW: { e: Float64Array; w: Float64Array; cum: Float64Array }[];

  constructor(readonly g: WingInput) {
    this.dc = (g.rootChord - g.tipChord) / g.semispan;
    const first = g.terms[0]!.section;
    this.stations = first.xi;
    this.kinds = first.kinds;
    for (const t of g.terms) {
      if (t.section.xi.length !== first.xi.length || t.section.xi.some((x, i) => x !== first.xi[i]) || t.section.kinds.some((k, i) => k !== first.kinds[i])) {
        throw new Error("all sections of a wing must share stations and interval kinds");
      }
    }
    const breaks = new Set<number>();
    for (const t of g.terms) for (const [e] of t.weight) if (e > g.etaRoot && e < g.semispan) breaks.add(e);
    this.spanBreaks = [...breaks].sort((a, b) => a - b);
    this.segConst = first.kinds.map((k) => k === "constant-slope");
    this.termSlopes = g.terms.map((t) => Float64Array.from(t.section.slopes));
    this.termW = g.terms.map((t) => {
      const e = Float64Array.from(t.weight.map((p) => p[0]));
      const w = Float64Array.from(t.weight.map((p) => p[1]));
      const cum = new Float64Array(e.length);
      for (let k = 1; k < e.length; k++) cum[k] = cum[k - 1]! + ((w[k - 1]! + w[k]!) / 2) * (e[k]! - e[k - 1]!);
      return { e, w, cum };
    });
  }

  /** Integral of a term's spanwise weight from eta = 0 (weights are piecewise linear). */
  private cumWeight(i: number, eta: number): number {
    const { e, w, cum } = this.termW[i]!;
    const n = e.length;
    if (eta <= e[0]!) return w[0]! * (eta - e[0]!);
    for (let k = 0; k + 1 < n; k++) {
      if (eta <= e[k + 1]!) {
        const d = eta - e[k]!;
        const sl = (w[k + 1]! - w[k]!) / (e[k + 1]! - e[k]!);
        return cum[k]! + w[k]! * d + 0.5 * sl * d * d;
      }
    }
    return cum[n - 1]! + w[n - 1]! * (eta - e[n - 1]!);
  }

  chord(eta: number): number {
    return this.g.rootChord - this.dc * eta;
  }

  xLE(eta: number): number {
    return this.g.xApex + this.g.tanLE * eta;
  }

  xTE(eta: number): number {
    return this.xLE(eta) + this.chord(eta);
  }

  /** Thickness slope dT/dxi at (xi, eta), all terms. */
  private slopeAt(xi: number, eta: number): number {
    let s = 0;
    for (const t of this.g.terms) s += weightAt(t.weight, eta) * t.section.slope(xi);
    return s;
  }

  private thicknessAt(xi: number, eta: number): number {
    let s = 0;
    for (const t of this.g.terms) s += weightAt(t.weight, eta) * t.section.thickness(xi);
    return s;
  }

  /** The span pieces of one half for a trace x = X + sk eta (sk signed). */
  private pieces(X: number, sk: number): { xi: (eta: number) => number; breaks: number[]; eta0: number | null } {
    const g = this.g;
    const P = X - g.xApex;
    const q = sk - g.tanLE;
    const cr = g.rootChord;
    const dc = this.dc;
    const xi = (eta: number): number => (P + q * eta) / (cr - dc * eta);
    const xa = xi(g.etaRoot);
    const xb = xi(g.semispan);
    const lo = Math.min(xa, xb);
    const hi = Math.max(xa, xb);
    const inner: number[] = [];
    for (const s of this.stations) {
      if (s > lo && s < hi) {
        const den = q + s * dc;
        if (den !== 0) inner.push((s * cr - P) / den);
      }
    }
    const all = [g.etaRoot, g.semispan, ...inner, ...this.spanBreaks].filter((e) => e >= g.etaRoot && e <= g.semispan);
    all.sort((a, b) => a - b);
    const eta0 = q !== 0 ? -P / q : null;
    return { xi, breaks: all, eta0 };
  }

  /**
   * dS/dX of one half for the trace x = X + sk eta. Walks the chord intervals
   * crossed by the trace; on a constant-slope interval the integral is the
   * slope times the integral of the spanwise weight (exact).
   */
  sPrimeHalf(X: number, sk: number): number {
    const g = this.g;
    const P = X - g.xApex;
    const q = sk - g.tanLE;
    const cr = g.rootChord;
    const dc = this.dc;
    const er = g.etaRoot;
    const es = g.semispan;
    const xa = (P + q * er) / (cr - dc * er);
    const xb = (P + q * es) / (cr - dc * es);
    let lo: number;
    let hi: number;
    let etaLo: number;
    let etaHi: number;
    if (xa <= xb) {
      lo = xa;
      hi = xb;
      etaLo = er;
      etaHi = es;
    } else {
      lo = xb;
      hi = xa;
      etaLo = es;
      etaHi = er;
    }
    if (hi <= 0 || lo >= 1) return 0;
    const st = this.stations;
    const nSeg = st.length - 1;
    const a = lo > 0 ? lo : 0;
    const b = hi < 1 ? hi : 1;
    let j = 0;
    while (j + 1 < nSeg && st[j + 1]! <= a) j++;
    const etaOf = (x: number): number => {
      if (x === lo) return etaLo;
      if (x === hi) return etaHi;
      const e = (x * cr - P) / (q + x * dc);
      return e < er ? er : e > es ? es : e;
    };
    let total = 0;
    for (; j < nSeg; j++) {
      const s0 = st[j]!;
      if (s0 >= b) break;
      const x1 = s0 > a ? s0 : a;
      const s1 = st[j + 1]!;
      const x2 = s1 < b ? s1 : b;
      if (x2 <= x1) continue;
      const e1 = etaOf(x1);
      const e2 = etaOf(x2);
      if (this.segConst[j]) {
        for (let i = 0; i < this.termSlopes.length; i++) total += this.termSlopes[i]![j]! * Math.abs(this.cumWeight(i, e2) - this.cumWeight(i, e1));
      } else {
        const u = Math.min(e1, e2);
        const v = Math.max(e1, e2);
        if (v <= u) continue;
        const xiOf = (eta: number): number => (P + q * eta) / (cr - dc * eta);
        // Split at the spanwise weight breaks, where the integrand has a kink.
        const cuts = [u, ...this.spanBreaks.filter((e) => e > u && e < v), v];
        for (let c = 0; c + 1 < cuts.length; c++) {
          const p0 = cuts[c]!;
          const p1 = cuts[c + 1]!;
          if (this.kinds[j] === "sqrt-nose" && q !== 0) {
            total += this.sqrtIntegral(p0, p1, -P / q, (eta) => this.slopeAt(xiOf(eta), eta));
          } else {
            const { x, w } = gl(8);
            let sum = 0;
            for (let k = 0; k < x.length; k++) {
              const e = (p0 + p1) / 2 + ((p1 - p0) / 2) * x[k]!;
              sum += w[k]! * this.slopeAt(xiOf(e), e);
            }
            total += (sum * (p1 - p0)) / 2;
          }
        }
      }
    }
    return total;
  }

  /** Reference implementation of sPrimeHalf (span pieces and midpoint rule), for the self-check. */
  sPrimeHalfGeneral(X: number, sk: number): number {
    const { xi, breaks, eta0 } = this.pieces(X, sk);
    let total = 0;
    for (let i = 0; i + 1 < breaks.length; i++) {
      const a = breaks[i]!;
      const b = breaks[i + 1]!;
      const d = b - a;
      if (d <= 0) continue;
      const m = (a + b) / 2;
      const xm = xi(m);
      if (xm <= 0 || xm >= 1) continue;
      let j = 0;
      while (j + 2 < this.stations.length && this.stations[j + 1]! <= xm) j++;
      const kind = this.kinds[j]!;
      if (kind === "constant-slope") {
        let s = 0;
        for (const t of this.g.terms) s += weightAt(t.weight, m) * t.section.slopes[j]!;
        total += s * d;
      } else if (kind === "sqrt-nose" && eta0 !== null) {
        total += this.sqrtIntegral(a, b, eta0, (eta) => this.slopeAt(xi(eta), eta));
      } else {
        const { x, w } = gl(8);
        let s = 0;
        for (let k = 0; k < x.length; k++) {
          const e = m + (d / 2) * x[k]!;
          s += w[k]! * this.slopeAt(xi(e), e);
        }
        total += (s * d) / 2;
      }
    }
    return total;
  }

  /** Projected cut area of one half for the trace x = X + sk eta (wake included). */
  areaHalf(X: number, sk: number): number {
    const { xi, breaks, eta0 } = this.pieces(X, sk);
    let total = 0;
    for (let i = 0; i + 1 < breaks.length; i++) {
      const a = breaks[i]!;
      const b = breaks[i + 1]!;
      const d = b - a;
      if (d <= 0) continue;
      const m = (a + b) / 2;
      const xm = xi(m);
      if (xm <= 0) continue;
      const f = (eta: number): number => this.chord(eta) * this.thicknessAt(xi(eta), eta);
      if (xm < this.stations[1]! && this.kinds[0] === "sqrt-nose" && eta0 !== null) {
        total += this.sqrtIntegral(a, b, eta0, f);
      } else {
        const { x, w } = gl(6);
        let s = 0;
        for (let k = 0; k < x.length; k++) s += w[k]! * f(m + (d / 2) * x[k]!);
        total += (s * d) / 2;
      }
    }
    return total;
  }

  /** Integral on [a, b] of f, with eta = eta0 +/- u^2 to remove a 1/sqrt(eta - eta0) behaviour. */
  private sqrtIntegral(a: number, b: number, eta0: number, f: (eta: number) => number): number {
    const sign = a >= eta0 ? 1 : -1;
    const ua = Math.sqrt(Math.abs(a - eta0));
    const ub = Math.sqrt(Math.abs(b - eta0));
    const u0 = Math.min(ua, ub);
    const u1 = Math.max(ua, ub);
    const { x, w } = gl(12);
    let s = 0;
    for (let k = 0; k < x.length; k++) {
      const u = (u0 + u1) / 2 + ((u1 - u0) / 2) * x[k]!;
      s += w[k]! * f(eta0 + sign * u * u) * 2 * u;
    }
    return (s * (u1 - u0)) / 2;
  }

  /** dS/dX of the wing (both halves) for the trace slope k = beta cos(theta). */
  sPrime(X: number, k: number): number {
    return this.sPrimeHalf(X, k) + this.sPrimeHalf(X, -k);
  }

  area(X: number, k: number): number {
    return this.areaHalf(X, k) + this.areaHalf(X, -k);
  }

  /** Range of X over which S_w' can be non-zero, both halves, for |k|. */
  support(k: number): [number, number] {
    const g = this.g;
    const ends = [g.etaRoot, g.semispan];
    let lo = Number.POSITIVE_INFINITY;
    let hi = Number.NEGATIVE_INFINITY;
    for (const sk of [k, -k]) {
      for (const e of ends) {
        lo = Math.min(lo, this.xLE(e) - sk * e);
        hi = Math.max(hi, this.xTE(e) - sk * e);
      }
    }
    return [lo, hi];
  }
}
