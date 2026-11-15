import { describe, expect, it } from "vitest";
import { bielatWing } from "@jet-workshop/physics";
import { SYMBOL_WINDOW, compare, reliability, withinUval, type Band, type BandModel, type Dataset, type PolarPoint } from "../src/index.ts";

const band = (centre: number, half: number): Band => ({ values: [], min: centre - half, max: centre + half, valid: true, beyondLock: false, transonic: false, reasons: [] });
const fixed = (centre: number, half: number): BandModel => () => band(centre, half);
const symbols = (...pts: { cl: number; cd: number; uCd?: number }[]): Dataset => ({
  rows: [], lift: [], faired: [],
  polar: pts.map((p, i) => ({ wing: "35", mach: 0.52, cl: p.cl, uCl: 0.01, cd: p.cd, uCd: p.uCd ?? 0.001, pointId: `p${i}`, series: "s" }) as PolarPoint),
});
const first = (model: BandModel, data: Dataset, cl = 0.1) => reliability(model, bielatWing("35"), "35", data, cl)[0]!;

describe("decision 0001: ASME V&V 20 structure", () => {
  it("E = S - D with S the band centre, u_val = sqrt(u_D^2 + u_input^2)", () => {
    const c = compare(band(0.010, 0.0015), 0.0125, 0.002);
    expect(c.e).toBeCloseTo(-0.0025, 12);
    expect(c.uInput).toBeCloseTo(0.0015, 12);
    expect(c.uVal).toBeCloseTo(0.0025, 12);
    expect(c.ratio).toBeCloseTo(1, 12);
    expect(withinUval(compare(band(0.010, 0.0015), 0.0124, 0.002))).toBe(true);
    expect(withinUval(compare(band(0.010, 0.0015), 0.0126, 0.002))).toBe(false);
  });

  it("a symbol just outside the band but within u_val validates the segment; the previous rule did not", () => {
    // 0.0002 above the band (0.0085 to 0.0115): |E| = 0.0017, u_val = sqrt(0.001^2 + 0.0015^2) = 0.0018.
    const data = symbols({ cl: 0.1, cd: 0.0117 });
    expect(first(fixed(0.010, 0.0015), data).state).toBe("validated");
    expect(reliability(fixed(0.010, 0.0015), bielatWing("35"), "35", data, 0.1, "spike-1")[0]!.state).toBe("estimate");
  });

  it("a wide band does not pass by its width: u_input above 0.0020 is an estimate even with every symbol inside", () => {
    expect(first(fixed(0.010, 0.0025), symbols({ cl: 0.1, cd: 0.010 })).state).toBe("estimate");
  });

  it("scores exactly the symbols the chart draws: a far symbol outside the window does not change the strip", () => {
    const near = { cl: 0.1, cd: 0.0105 };
    const far = { cl: 0.1 + SYMBOL_WINDOW + 0.05, cd: 0.020 };
    const s = first(fixed(0.010, 0.0015), symbols(near, far));
    expect(s).toMatchObject({ state: "validated", n: 1 });
    // The previous rule (window 0.3) counted it.
    expect(reliability(fixed(0.010, 0.0015), bielatWing("35"), "35", symbols(near, far), 0.1, "spike-1")[0]!).toMatchObject({ state: "estimate", n: 2 });
  });

  it("a symbol beyond u_val is an estimate; beyond 0.0020 outside the band the disagreement flag is set", () => {
    expect(first(fixed(0.010, 0.0015), symbols({ cl: 0.1, cd: 0.0125 }))).toMatchObject({ state: "estimate", disagrees: false });
    expect(first(fixed(0.010, 0.0015), symbols({ cl: 0.1, cd: 0.0140 }))).toMatchObject({ state: "estimate", disagrees: true });
  });
});
