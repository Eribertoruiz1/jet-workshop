import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bielatWing, kornMasonLock, waveDrag } from "@jet-workshop/physics";
import {
  assemble,
  bandError,
  bandOf,
  baselineBand,
  kornMasonLockBand,
  loadBodyDataset,
  measuredLiftSlope,
  makeBand,
  transonicLimitMach,
  modelRange,
  outsideBy,
  PARASITE_VARIANTS,
  parabolaAtZeroLift,
  parseCsv,
  parseRows,
  reliability,
  sampledDragRiseMach,
  scorePolarPoint,
  type Band,
  type BandModel,
  type Dataset,
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
  it("reads the body-alone file as its own dataset and refuses wing-body rows in it", () => {
    const csv = [
      HEADER.replace("document,", "document,"),
      row("fig16b", "body alone", "0.500", "fig16b-body-M0.500", "p2", "CD", 0.0029).replace("NACA RM L52B08", "NACA RM L51I04a"),
      row("fig16b", "body alone", "0.500", "fig16b-body-M0.500", "p2", "alpha", 0.1).replace("NACA RM L52B08", "NACA RM L51I04a"),
    ].join("\n");
    const b = loadBodyDataset(csv);
    expect(b).toHaveLength(1);
    expect(b[0]!).toMatchObject({ document: "NACA RM L51I04a", mach: 0.5, cd: 0.0029, alpha: 0.1 });
    expect(() => loadBodyDataset(csv.replaceAll("body alone", "35 deg"))).toThrow();
    expect(() => parseRows(csv)).toThrow();
  });
});

describe("the committed datasets", () => {
  it("the body-alone file loads: 52 measured symbols, 4 per Mach number, each with CD and alpha", () => {
    const body = loadBodyDataset(readFileSync(new URL("../data/bielat-l51i04a-body.csv", import.meta.url), "utf8"));
    expect(body).toHaveLength(52);
    const machs = new Set(body.map((p) => p.mach));
    expect(machs.size).toBe(13);
    for (const m of machs) expect(body.filter((p) => p.mach === m)).toHaveLength(4);
    for (const p of body) {
      expect(p.document).toBe("NACA RM L51I04a");
      expect(Number.isFinite(p.cd) && Number.isFinite(p.alpha)).toBe(true);
      expect(p.uCd).toBeGreaterThanOrEqual(0.001);
    }
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
    expect(parabolaAtZeroLift(pts).cd0).toBeCloseTo(0.01, 10);
  });
  it("refuses a parabola when a repeated point leaves only two lift levels", () => {
    // As at 10.8 deg, M 0.95: two symbols at CL 0.147 (CD 0.0165 and 0.0174) and one at CL -0.196.
    const pts = [
      { cl: -0.196, cd: 0.0266 },
      { cl: 0.1467, cd: 0.0165 },
      { cl: 0.1468, cd: 0.0174 },
    ] as PolarPoint[];
    const r = parabolaAtZeroLift(pts);
    expect(r.levels).toBe(2);
    expect(r.cd0).toBeNull();
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
  it("scores a point by its distance to the band, model minus measured, 0 inside", () => {
    const band: Band = { values: [], min: 0.009, max: 0.011, valid: true, beyondLock: false, transonic: false, reasons: [] };
    expect(bandError(band, 0.010)).toBe(0);
    expect(bandError(band, 0.008)).toBeCloseTo(0.001, 12);
    expect(bandError(band, 0.0125)).toBeCloseTo(-0.0015, 12);
    const p = { wing: "35", mach: 0.6, cl: 0.1, uCl: 0.01, cd: 0.008, uCd: 0.001 } as PolarPoint;
    const s = scorePolarPoint(() => band, bielatWing("35"), p);
    expect(s.error).toBeCloseTo(0.001, 12);
    expect(s.ratio).toBeCloseTo(1, 12);
    expect(s.spread).toBeCloseTo(0.002, 12);
  });
});

/** A band of fixed position for the strip rules: centre and half-width in CD. */
const fixedBand = (centre: number, half: number): BandModel => () => ({ values: [], min: centre - half, max: centre + half, valid: true, beyondLock: false, transonic: false, reasons: [] });
const oneSymbol = (cd: number): Dataset => ({ rows: [], lift: [], faired: [], polar: [{ wing: "35", mach: 0.52, cl: 0.1, uCl: 0.01, cd, uCd: 0.001 } as PolarPoint] });

describe("reliability strip", () => {
  it("is computed, never assigned: estimate without data, outside range where the transonic drag rise acts", () => {
    const segs = reliability(kornMasonLockBand, bielatWing("10.8"), null, null, 0);
    expect(segs[0]!.state).toBe("estimate");
    expect(segs.at(-1)!.state).toBe("outside model range");
    const w = bielatWing("35");
    const limit = transonicLimitMach(kornMasonLockBand, w, 0)!;
    expect(limit).toBeCloseTo(waveDrag(w, 0.8, 0).mcritMin, 2);
    for (const s of reliability(kornMasonLockBand, w, null, null, 0)) if (s.hi > limit + 0.001) expect(s.state).toBe("outside model range");
  });
  it("puts the drag-rise note at the transonic limit only, not where the polar's lift range ends", () => {
    const w = bielatWing("35");
    // At CL 0.38 the band leaves the attached-flow lift range near M 0.50, yet the transonic limit is the critical Mach number.
    expect(kornMasonLockBand(w, { mach: 0.5, cl: 0.38 }).valid).toBe(false);
    expect(transonicLimitMach(kornMasonLockBand, w, 0.38)!).toBeGreaterThan(0.75);
    // The 47 deg wing diverges above M 0.90, but the model stops there.
    expect(transonicLimitMach(kornMasonLockBand, bielatWing("47"), 0)!).toBeCloseTo(0.9, 2);
  });
  it("a band with a value that is not finite is outside the model's range and never scores as inside", () => {
    const nan = makeBand([{ id: "x", model: () => ({ cl: 0, cd: Number.NaN, valid: true, reasons: [], beyondLock: false, transonic: false, parts: { parasite: 0, induced: 0, wave: 0, minimumDragCl: 0 } }) }]);
    const b = nan(bielatWing("35"), { mach: 0.6, cl: 0 });
    expect(b.valid).toBe(false);
    expect(Number.isNaN(bandError(b, 0.01))).toBe(true);
  });
  it("validated only when every symbol lies inside the band and the band's half-spread is within 0.0020", () => {
    const w = bielatWing("35");
    const first = (band: BandModel, cd: number) => reliability(band, w, "35", oneSymbol(cd), 0.1)[0]!;
    expect(first(fixedBand(0.010, 0.0015), 0.011)).toMatchObject({ state: "validated", disagrees: false });
    // inside, but the band is too wide to validate anything
    expect(first(fixedBand(0.010, 0.0025), 0.011)).toMatchObject({ state: "estimate", disagrees: false });
    // just outside the band: an estimate, not a disagreement beyond the precedent
    expect(first(fixedBand(0.010, 0.0015), 0.0125)).toMatchObject({ state: "estimate", disagrees: false });
    // more than 0.0020 outside the band: the disagreement text applies
    expect(first(fixedBand(0.010, 0.0015), 0.0140)).toMatchObject({ state: "estimate", disagrees: true });
  });
});

describe("CD0 sensitivity range (gate 4)", () => {
  it("spans the eight variants, contains the default model and shares its validity", () => {
    const w = bielatWing("35");
    for (const c of [{ mach: 0.5, cl: 0 }, { mach: 0.85, cl: 0.2 }, { mach: 1.05, cl: 0 }]) {
      const r = modelRange(w, c);
      const d = kornMasonLock(w, c);
      expect(r.values).toHaveLength(PARASITE_VARIANTS.length);
      expect(PARASITE_VARIANTS).toHaveLength(8);
      expect(r.min).toBeLessThanOrEqual(d.cd);
      expect(r.max).toBeGreaterThanOrEqual(d.cd);
      expect(r.valid).toBe(d.valid);
      expect(r.beyondLock).toBe(d.beyondLock);
    }
  });

  it("the baseline band uses the same parasite variants: at M 0.50 the two bands coincide below the critical Mach number", () => {
    const w = bielatWing("47");
    const a = kornMasonLockBand(w, { mach: 0.5, cl: 0.05 });
    const b = baselineBand(w, { mach: 0.5, cl: 0.05 });
    expect(a.min).toBeCloseTo(b.min, 12);
    expect(a.max).toBeCloseTo(b.max, 12);
    expect(a.max - a.min).toBeGreaterThan(0.001);
  });

  it("signed distance to a range is zero inside and negative below", () => {
    expect(outsideBy(0.01, 0.009, 0.012)).toBe(0);
    expect(outsideBy(0.008, 0.009, 0.012)).toBeCloseTo(-0.001, 12);
    expect(outsideBy(0.013, 0.009, 0.012)).toBeCloseTo(0.001, 12);
  });
});
