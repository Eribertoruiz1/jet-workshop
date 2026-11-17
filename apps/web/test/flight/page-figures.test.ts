/**
 * Every figure the page shows outside the model's own functions has its test
 * here (brief 006, "Honestidad"): the landing-runway distance, the aircraft's
 * drawn length and span, and the fuel the hangar shows against the fuel flown.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bielatWing } from "@jet-workshop/physics";
import { makeAircraft, makePlaceholderEngine } from "@jet-workshop/physics/flight";
import { loadDataset } from "@jet-workshop/validation";
import { FUEL_STEP, defaultDesign, fuelLoad, fuelSliderMax } from "../../src/flight/Hangar.tsx";
import { profile } from "../../src/flight/profile.ts";
import { LANDING_RUNWAY_START_M, toLandingRunway } from "../../src/flight/scenario.ts";
import { allWingTables } from "../../src/flight/tables.ts";

const tables = allWingTables(loadDataset(readFileSync(new URL("../../../../packages/validation/data/bielat-l52b08.csv", import.meta.url), "utf8")));
const make = (area: number) => makeAircraft({ wing: bielatWing("47"), aero: tables["47"], wingArea_m2: area, engine: makePlaceholderEngine({ staticThrust_N: 30000 }) });

describe("figures of the page", () => {
  it("measures the landing runway from its threshold", () => {
    expect(toLandingRunway(0)).toBe(LANDING_RUNWAY_START_M);
    expect(toLandingRunway(LANDING_RUNWAY_START_M - 1500)).toBe(1500);
    expect(toLandingRunway(LANDING_RUNWAY_START_M + 200)).toBe(-200);
  });

  it("draws the aircraft with its real length and span", () => {
    const ac = make(25);
    const p = profile(ac);
    expect(p.length_m).toBe(ac.bodyLength_m);
    expect(p.span_m).toBe(ac.span_m);
    const xs = p.body.map(([x]) => x);
    const zs = p.body.map(([, z]) => Math.abs(z));
    expect(Math.min(...xs)).toBeCloseTo(0, 12);
    expect(Math.max(...xs)).toBeCloseTo(ac.bodyLength_m, 9);
    expect(Math.max(...zs)).toBeCloseTo(ac.bodyDiameter_m / 2, 9);
    // The tip section sits aft of the root section by the sweep of the leading edge.
    expect(Math.min(...p.tip.map(([x]) => x))).toBeGreaterThan(Math.min(...p.root.map(([x]) => x)));
  });

  it("flies the fuel the hangar shows, also when a smaller wing cuts the capacity", () => {
    const small = make(10);
    const chosen = { ...defaultDesign, wing: "47" as const, area_m2: 10, fuel_kg: 700 };
    expect(fuelSliderMax(small) % FUEL_STEP).toBe(0);
    expect(fuelSliderMax(small)).toBeLessThanOrEqual(small.fuelCapacity_kg);
    expect(fuelLoad(chosen, small)).toBe(fuelSliderMax(small));
    expect(fuelLoad({ ...chosen, fuel_kg: 100 }, small)).toBe(100);
  });
});
