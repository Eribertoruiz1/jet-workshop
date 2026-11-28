import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bielatWing } from "@jet-workshop/physics";
import { lift, lookup, makeAircraft, makePlaceholderEngine } from "@jet-workshop/physics/flight";
import { loadDataset, measuredLiftSlope } from "@jet-workshop/validation";
import { REPORT_GAP, TESTED_WINGS, allWingTables, slopeByWindow, wingTables, zeroLiftAngleDeg } from "../../src/flight/tables.ts";

const DEG = Math.PI / 180;
const data = loadDataset(readFileSync(new URL("../../../../packages/validation/data/bielat-l52b08.csv", import.meta.url), "utf8"));

describe("the three wings' tables, built from the measured data", () => {
  const tables = allWingTables(data);

  for (const id of TESTED_WINGS) {
    it(`builds the tables of the ${id} deg wing, and an aircraft flies with them`, () => {
      const t = tables[id];
      const machs = new Set(data.lift.filter((p) => p.wing === id).map((p) => p.mach));
      // One test Mach number per wing has only two symbols with |CL| <= 0.3: no slope there.
      expect(t.liftSlope.points.length).toBe(machs.size - 1);
      expect(t.clMax.points.length).toBe(machs.size);
      // Slopes of the order of 0.06 per degree, up to 0.113 at the transonic peak of the
      // 10.8 deg wing (M 0.95); zero-lift angles negative (positive camber).
      for (const p of t.liftSlope.points) expect(p.value * DEG).toBeGreaterThan(0.04);
      for (const p of t.liftSlope.points) expect(p.value * DEG).toBeLessThan(0.12);
      for (const p of t.zeroLiftAlpha.points) expect(p.value).toBeLessThan(0);
      expect(t.dragRise.points[0]).toEqual({ mach: 0.5, value: 0 });
      expect(t.gaps).toEqual([REPORT_GAP]);
      const ac = makeAircraft({ wing: bielatWing(id), aero: t, wingArea_m2: 25, engine: makePlaceholderEngine({ staticThrust_N: 50000 }) });
      expect(ac.wingId).toBe(id);
    });
  }

  it("takes each slope from measuredLiftSlope and the highest lift from the measured symbols, unchanged", () => {
    const at = data.lift.filter((p) => p.wing === "47" && p.mach === 0.5);
    const t = tables["47"];
    expect(t.liftSlope.points[0]!.value * DEG).toBe(measuredLiftSlope(at)!.slope);
    expect(t.clMax.points[0]!.value).toBe(Math.max(...at.map((p) => p.cl)));
    expect(t.zeroLiftAlpha.points[0]!.value / DEG).toBeCloseTo(zeroLiftAngleDeg(at)!, 12);
    // The fitted line passes through the mean of the fitted symbols.
    const v = at.filter((p) => Math.abs(p.cl) <= 0.3);
    const ma = v.reduce((a, p) => a + p.alpha, 0) / v.length;
    const mc = v.reduce((a, p) => a + p.cl, 0) / v.length;
    expect(measuredLiftSlope(at)!.slope * (ma - zeroLiftAngleDeg(at)!)).toBeCloseTo(mc, 12);
  });

  it("takes the drag rise from the faired curve, CD0(M) - CD0(0.50), with the last sample last", () => {
    const f = data.faired.filter((s) => s.wing === "10.8").sort((a, b) => a.mach - b.mach);
    const t = tables["10.8"];
    expect(t.dragRise.points.length).toBe(f.length);
    expect(t.dragRise.points.at(-1)!.value).toBeCloseTo(f.at(-1)!.cd0 - f[0]!.cd0, 15);
    // Above the last sample the increment is held and there are no data.
    expect(lookup(t.dragRise, 1.3, t.gaps)).toEqual({ value: t.dragRise.points.at(-1)!.value, placement: "above" });
  });

  it("puts the straight join across the report's gap at no data, for every wing", () => {
    for (const id of TESTED_WINGS) {
      const t = tables[id];
      expect(lookup(t.dragRise, 1.06, t.gaps).placement).toBe("gap");
      expect(lift(t, bielatWing(id), 1.06, 2 * DEG).evidence).toBe("no-data");
    }
  });

  it("records how much the window of angles changes the slope, as an uncertainty", () => {
    for (const id of TESTED_WINGS) {
      for (const p of tables[id].liftSlopeSpread.points) {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThan(0.25);
      }
    }
  });

  it("gives lane A's 4 to 13 percent: the 47 deg wing's slope below the 10.8 deg wing's at M 0.50, by window", () => {
    const at = (w: "10.8" | "47") => data.lift.filter((p) => p.wing === w && p.mach === 0.5);
    const a = slopeByWindow(at("10.8"));
    const b = slopeByWindow(at("47"));
    const loss = a.map((s, i) => (s !== null && b[i] !== null ? (1 - b[i]! / s) * 100 : null)).filter((x): x is number => x !== null);
    // measuredLiftSlope needs three symbols: the 2.5 deg window (two symbols on the 10.8 deg wing) drops out.
    expect(loss.length).toBe(3);
    expect(Math.min(...loss)).toBeCloseTo(4.13, 2);
    expect(Math.max(...loss)).toBeCloseTo(12.92, 2);
  });

  it("never lifts more than the highest measured CL, for any wing, Mach number or angle", () => {
    for (const id of TESTED_WINGS) {
      const t = tables[id];
      for (const { mach, value } of t.clMax.points) {
        for (let deg = -60; deg <= 90; deg += 0.25) {
          expect(lift(t, bielatWing(id), mach, deg * DEG).cl, `${id} deg wing, M ${mach}, ${deg} deg`).toBeLessThanOrEqual(value + 1e-12);
        }
      }
    }
  });

  it("refuses a dataset without the faired curve", () => {
    expect(() => wingTables({ ...data, faired: [] }, "35")).toThrow(/faired/);
  });
});
