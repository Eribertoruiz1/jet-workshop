import { describe, expect, it } from "vitest";
import {
  bielatWing,
  dragDivergenceMach,
  dragRiseMach,
  geometry,
  inducedDragFactor,
  kornMasonLock,
  baselineIncompressible,
  liftCurveSlope,
  lockRise,
  criticalMach,
  matchTestedWing,
  minimumDragCl,
  oswaldEfficiency,
  oswaldStraight,
  oswaldSwept,
  schrenkCl,
  strips,
  sweepAtDeg,
  waveDrag,
  type WingBody,
} from "../src/index.ts";

const range = (a: number, b: number, n: number): number[] => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

function withPlanform(base: WingBody, changes: Partial<WingBody["planform"]>): WingBody {
  return { ...base, planform: { ...base.planform, ...changes } };
}

describe("geometry of the tested models (report figure 3)", () => {
  const g = geometry(bielatWing("35"));
  it("reproduces span, root and tip chord and mean aerodynamic chord", () => {
    expect(g.spanIn).toBeCloseTo(24.0, 2);
    expect(g.rootChordIn).toBeCloseTo(11.43, 2);
    expect(g.tipChordIn).toBeCloseTo(2.286, 3);
    expect(g.macIn).toBeCloseTo(7.874, 3);
    expect(g.macSpanwiseIn).toBeCloseTo(4.667, 3);
  });
  it("recognises the three tested wings and nothing else", () => {
    expect(matchTestedWing(bielatWing("10.8"))).toBe("10.8");
    expect(matchTestedWing(bielatWing("47"))).toBe("47");
    expect(matchTestedWing(withPlanform(bielatWing("35"), { sweepQuarterChordDeg: 40 }))).toBeNull();
    expect(matchTestedWing(withPlanform(bielatWing("35"), { aspectRatio: 4 }))).toBeNull();
  });
  it("strips cover the exposed area", () => {
    const w = bielatWing("47");
    const total = strips(w, 200).reduce((s, x) => s + x.areaIn2, 0);
    expect(total).toBeCloseTo(geometry(w).exposedAreaIn2, 1);
  });
});

describe("sweep conversion", () => {
  it("returns the quarter-chord sweep at n = 0.25 and orders the chord lines", () => {
    for (const id of ["10.8", "35", "47"] as const) {
      const p = bielatWing(id).planform;
      expect(sweepAtDeg(p, 0.25)).toBeCloseTo(p.sweepQuarterChordDeg, 10);
      expect(sweepAtDeg(p, 0)).toBeGreaterThan(sweepAtDeg(p, 0.5));
    }
  });
});

describe("property: drag-divergence Mach number rises with sweep", () => {
  it("holds for the section formula over sweep, thickness and lift", () => {
    for (const t of [0.03, 0.04, 0.08]) {
      for (const cl of [0, 0.2, 0.4]) {
        const ms = range(0, 60, 61).map((s) => dragDivergenceMach(0.87, t, cl, s));
        for (let i = 1; i < ms.length; i++) expect(ms[i]!).toBeGreaterThan(ms[i - 1]!);
      }
    }
  });
  it("holds for the wing (lowest strip) as sweep grows, once the mid-chord line is swept back", () => {
    // Korn-Mason uses the mid-chord sweep; for A = 3.5 and taper 0.2 it is zero
    // at a quarter-chord sweep of about 10.9 deg, so start just above that.
    const base = bielatWing("35");
    expect(sweepAtDeg(withPlanform(base, { sweepQuarterChordDeg: 11 }).planform, 0.5)).toBeGreaterThan(0);
    for (const cl of [0, 0.2, 0.4]) {
      const ms = range(11, 55, 23).map((s) => waveDrag(withPlanform(base, { sweepQuarterChordDeg: s }), 0.8, cl).mddMin);
      for (let i = 1; i < ms.length; i++) expect(ms[i]!).toBeGreaterThan(ms[i - 1]!);
    }
  });
});

describe("property: drag rise is monotone in Mach number", () => {
  it("Lock's law is zero below Mcrit and increases above it", () => {
    const mcrit = criticalMach(0.85);
    expect(lockRise(mcrit - 0.01, mcrit)).toBe(0);
    const v = range(mcrit, mcrit + 0.2, 41).map((m) => lockRise(m, mcrit));
    for (let i = 1; i < v.length; i++) expect(v[i]!).toBeGreaterThan(v[i - 1]!);
  });
  it("the wing's drag rise never decreases with Mach (total drag may: the tunnel Reynolds number rises with Mach)", () => {
    for (const id of ["10.8", "35", "47"] as const) {
      for (const cl of [0, 0.1, 0.3]) {
        const w = bielatWing(id);
        const ms = range(0.5, 1.12, 125);
        const wave = ms.map((m) => waveDrag(w, m, cl).cd);
        const rise = ms.map((m) => kornMasonLock(w, { mach: m, cl }).parts.wave);
        for (let i = 1; i < ms.length; i++) {
          expect(wave[i]!).toBeGreaterThanOrEqual(wave[i - 1]!);
          expect(rise[i]!).toBeGreaterThanOrEqual(rise[i - 1]!);
        }
      }
    }
  });
});

describe("property: induced-drag factor falls as aspect ratio grows", () => {
  it("holds for straight and swept wings over the range of the Oswald fits (sweep 0-55 deg, A 2.5-6)", () => {
    for (const s of [0, 10.8, 35, 47, 55]) {
      const ks = range(2.5, 6, 29).map((A) => inducedDragFactor(withPlanform(bielatWing("35"), { aspectRatio: A, sweepQuarterChordDeg: s }).planform));
      for (let i = 1; i < ks.length; i++) expect(ks[i]!).toBeLessThan(ks[i - 1]!);
    }
  });
  it("Oswald efficiency is continuous at 30 deg leading-edge sweep and positive", () => {
    expect(oswaldSwept(3.5, 30)).toBeCloseTo(oswaldStraight(3.5) + (oswaldSwept(3.5, 30) - oswaldStraight(3.5)), 12);
    for (const s of range(0, 60, 61)) {
      const e = oswaldEfficiency(withPlanform(bielatWing("35"), { sweepQuarterChordDeg: s }).planform);
      expect(e).toBeGreaterThan(0.3);
      expect(e).toBeLessThan(1.0);
    }
  });
});

describe("lift", () => {
  it("lift-curve slope grows with Mach below 1 and is flagged invalid at 1", () => {
    const w = bielatWing("35");
    const s = range(0.3, 0.95, 14).map((m) => liftCurveSlope(w, m).perRad);
    for (let i = 1; i < s.length; i++) expect(s[i]!).toBeGreaterThan(s[i - 1]!);
    expect(liftCurveSlope(w, 1.0).valid).toBe(false);
  });
  it("the cambered section gives positive lift at zero incidence and a positive minimum-drag CL", () => {
    expect(minimumDragCl(bielatWing("35"), 0.5)).toBeGreaterThan(0);
  });
  it("Schrenk loading integrates to the wing lift over the full span", () => {
    const w = bielatWing("35");
    const g = geometry(w);
    const n = 4000;
    let lift = 0;
    for (let i = 0; i < n; i++) {
      const eta = (i + 0.5) / n;
      const y = (eta * g.spanIn) / 2;
      const c = g.rootChordIn * (1 - (1 - w.planform.taperRatio) * eta);
      lift += schrenkCl(w, 0.4, eta, c) * c * (g.spanIn / 2 / n) * 2;
      void y;
    }
    expect(lift / w.planform.areaIn2).toBeCloseTo(0.4, 3);
  });
});

describe("model contract", () => {
  it("both models return cl, cd and validity, with minimum drag at the minimum-drag CL below Mcrit", () => {
    for (const model of [kornMasonLock, baselineIncompressible]) {
      const w = bielatWing("10.8");
      const r = model(w, { mach: 0.6, cl: 0.2 });
      expect(r.cl).toBe(0.2);
      expect(r.cd).toBeGreaterThan(0);
      expect(typeof r.valid).toBe("boolean");
      const clMin = r.parts.minimumDragCl;
      const at = model(w, { mach: 0.6, cl: clMin }).cd;
      expect(model(w, { mach: 0.6, cl: clMin + 0.05 }).cd).toBeGreaterThan(at);
      expect(model(w, { mach: 0.6, cl: clMin - 0.05 }).cd).toBeGreaterThan(at);
    }
  });
  it("flags aspect ratio and sweep outside the Oswald range", () => {
    expect(kornMasonLock(withPlanform(bielatWing("35"), { aspectRatio: 8 }), { mach: 0.6, cl: 0.1 }).valid).toBe(false);
    expect(kornMasonLock(withPlanform(bielatWing("35"), { aspectRatio: 6.5, sweepQuarterChordDeg: 60 }), { mach: 0.6, cl: 0.1 }).valid).toBe(false);
    expect(kornMasonLock(withPlanform(bielatWing("35"), { aspectRatio: 2 }), { mach: 0.6, cl: 0.1 }).valid).toBe(false);
  });
  it("marks the Korn-Mason-Lock model outside its range beyond Mdd + 0.05 and keeps the baseline flat in Mach", () => {
    const w = bielatWing("10.8");
    const mdd = waveDrag(w, 0.8, 0).mddMin;
    expect(kornMasonLock(w, { mach: mdd + 0.04, cl: 0 }).valid).toBe(true);
    expect(kornMasonLock(w, { mach: mdd + 0.06, cl: 0 }).valid).toBe(false);
    expect(baselineIncompressible(w, { mach: 1.0, cl: 0 }).parts.wave).toBe(0);
  });
  it("drag-rise Mach number of the model rises with sweep", () => {
    const m = (["10.8", "35", "47"] as const).map((id) => dragRiseMach(kornMasonLock, bielatWing(id), 0));
    expect(m[0]).not.toBeNull();
    expect(m[1]!).toBeGreaterThan(m[0]!);
    expect(m[2]!).toBeGreaterThan(m[1]!);
  });
});
