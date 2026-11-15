import { describe, expect, it } from "vitest";
import { bielatWing, kornMasonLock } from "@jet-workshop/physics";
import {
  assemble,
  bandOf,
  measuredLiftSlope,
  parabolaAtZeroLift,
  parseCsv,
  parseRows,
  reliability,
  sampledDragRiseMach,
  scorePolarPoint,
  type LiftPoint,
  type PolarPoint,
} from "../src/index.ts";

const HEADER = "document,figure_id,figure,pdf_page,printed_page,wing,mach,series,point_id,variable,value_pass_a,value_pass_b,value_adopted,pass_difference,u_pixel_floor,u_digitization,u_declared,u_total,data_class,method,flags,note";
const row = (fig: string, wing: string, mach: string, series: string, pid: string, v: string, val: number, cls = "measured", note = ""): string =>
  ["NACA RM L52B08", fig, "x", "1", "1", wing, mach, series, pid, v, val, val, val, 0, 0.0002, 0.0002, 0.001, 0.00102, cls, "m", "", note].join(",");

describe("dataset parsing", () => {
  it("parses quoted fields with commas and doubled quotes", () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3\n')).toEqual([["a", "b, c", 'd "e"'], ["1", "2", "3"]]);
  });
  it("assembles polar, lift and faired points and keeps the classes apart", () => {
    const csv = [
      HEADER,
      row("fig06b", "35 deg", "0.900", "fig06b-35deg-M0.900", "p1", "CL", 0.1),
      row("fig06b", "35 deg", "0.900", "fig06b-35deg-M0.900", "p1", "CD", 0.0096, "measured", '"note, with comma"'),
      row("fig06a", "35 deg", "0.900", "fig06a-35deg-M0.900", "p1", "CL", 0.1),
      row("fig06a", "35 deg", "0.900", "fig06a-35deg-M0.900", "p1", "alpha", 0.3),
      row("fig09", "35 deg", "0.900", "fig09-35deg", "M0.900", "CD0", 0.011, "naca_faired_crossplot"),
    ].join("\n");
    const d = assemble(parseRows(csv));
    expect(d.polar).toHaveLength(1);
    expect(d.polar[0]!.note).toBe("note, with comma");
    expect(d.lift).toHaveLength(1);
    expect(d.faired).toHaveLength(1);
    expect(d.faired[0]!.cd0).toBe(0.011);
  });
});

describe("scoring helpers", () => {
  it("classifies CD0 errors into the four bands", () => {
    expect(bandOf(0.0008)).toBe(0);
    expect(bandOf(0.0012)).toBe(1);
    expect(bandOf(0.0019)).toBe(2);
    expect(bandOf(0.0031)).toBe(3);
  });
  it("recovers an exact parabola at CL = 0", () => {
    const pts = [-0.1, 0.05, 0.2, 0.28].map((cl) => ({ cl, cd: 0.01 + 0.002 * cl + 0.1 * cl * cl }) as PolarPoint);
    expect(parabolaAtZeroLift(pts)!.cd0).toBeCloseTo(0.01, 10);
  });
  it("recovers an exact lift slope and ignores high-lift points", () => {
    const pts = [-2, 0, 2, 4, 8].map((alpha) => ({ alpha, cl: alpha === 8 ? 0.9 : 0.06 * alpha + 0.05 }) as LiftPoint);
    expect(measuredLiftSlope(pts)!.slope).toBeCloseTo(0.06, 10);
  });
  it("finds the drag-rise Mach number where the slope reaches 0.1", () => {
    const s = [0.8, 0.85, 0.9, 0.95, 1.0].map((mach) => ({ mach, cd: 0.01 + Math.max(0, mach - 0.85) ** 2 }));
    // slope 2 (M - 0.85) reaches 0.1 at M = 0.90; sampled midpoints straddle it.
    const m = sampledDragRiseMach(s)!;
    expect(m).toBeGreaterThan(0.875);
    expect(m).toBeLessThan(0.925);
  });
  it("scores a point as model minus measured with its uncertainty ratio", () => {
    const p = { wing: "35", mach: 0.6, cl: 0.1, uCl: 0.01, cd: 0.01, uCd: 0.001 } as PolarPoint;
    const s = scorePolarPoint(kornMasonLock, bielatWing("35"), p);
    expect(s.error).toBeCloseTo(s.result.cd - 0.01, 12);
    expect(s.ratio).toBeCloseTo(Math.abs(s.error) / 0.001, 12);
  });
});

describe("reliability strip", () => {
  it("is computed, never assigned: estimate without data, outside range beyond the model's limit", () => {
    const segs = reliability(kornMasonLock, bielatWing("10.8"), null, null, 0);
    expect(segs[0]!.state).toBe("estimate");
    expect(segs.at(-1)!.state).toBe("outside model range");
  });
  it("calls a segment validated only when every symbol in it is within 0.0020", () => {
    const w = bielatWing("35");
    const exact = kornMasonLock(w, { mach: 0.52, cl: 0.1 }).cd;
    const data = { rows: [], lift: [], faired: [], polar: [{ wing: "35", mach: 0.52, cl: 0.1, uCl: 0.01, cd: exact + 0.001, uCd: 0.001 } as PolarPoint] };
    expect(reliability(kornMasonLock, w, "35", data, 0.1)[0]!.state).toBe("validated");
    data.polar[0]!.cd = exact + 0.003;
    const s = reliability(kornMasonLock, w, "35", data, 0.1)[0]!;
    expect(s.state).toBe("estimate");
    expect(s.disagrees).toBe(true);
  });
});
