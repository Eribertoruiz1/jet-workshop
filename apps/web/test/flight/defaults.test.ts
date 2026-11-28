/**
 * The hangar's starting values (PM, gate 1): the first flight takes off
 * inside the runway, and it cannot go supersonic until the thrust is raised.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bielatWing } from "@jet-workshop/physics";
import {
  DT,
  PITCH_RATE_LIMIT,
  hangarFigures,
  initialState,
  levelFlightTopMach,
  makeAircraft,
  makePlaceholderEngine,
  step,
  type Controls,
  type FlightState,
} from "@jet-workshop/physics/flight";
import { loadDataset } from "@jet-workshop/validation";
import { THRUST_RANGE, defaultDesign, fuelLoad } from "../../src/flight/Hangar.tsx";
import { RUNWAY_LENGTH_M, SCENARIO } from "../../src/flight/scenario.ts";
import { allWingTables } from "../../src/flight/tables.ts";

const tables = allWingTables(loadDataset(readFileSync(new URL("../../../../packages/validation/data/bielat-l52b08.csv", import.meta.url), "utf8")));
const DEG = Math.PI / 180;
const log = (...a: unknown[]): void => console.log(...a);

function defaultAircraft(thrust_N = defaultDesign.thrust_N) {
  return makeAircraft({
    wing: bielatWing(defaultDesign.wing),
    aero: tables[defaultDesign.wing],
    wingArea_m2: defaultDesign.area_m2,
    engine: makePlaceholderEngine({ staticThrust_N: thrust_N }),
  });
}

/** Full throttle; rotate to `attitudeDeg` once the speed reaches `rotateAt_m_s`; run until lift-off or the end. */
function takeoff(attitudeDeg: number, rotateAt_m_s: number): FlightState {
  const ac = defaultAircraft();
  let s = initialState(ac, fuelLoad(defaultDesign, ac), SCENARIO);
  for (let i = 0; i < 120 / DT && !s.outcome && !s.records.liftoff; i++) {
    const rotate = s.vx >= rotateAt_m_s && s.theta < attitudeDeg * DEG - PITCH_RATE_LIMIT * DT / 2;
    const c: Controls = { throttle: 1, pitch: rotate ? 1 : 0, afterburner: false };
    s = step(s, c, ac, DT);
  }
  return s;
}

describe("the hangar's starting values", () => {
  it("start at 15 kN, inside the thrust range", () => {
    expect(defaultDesign.thrust_N).toBe(15000);
    expect(defaultDesign.thrust_N).toBeGreaterThanOrEqual(THRUST_RANGE.min);
    expect(defaultDesign.thrust_N).toBeLessThanOrEqual(THRUST_RANGE.max);
  });

  it("take off inside the runway, rotating at the start or at the estimated take-off speed", () => {
    const ac = defaultAircraft();
    const f = hangarFigures(ac, fuelLoad(defaultDesign, ac));
    for (const [attitude, rotateAt] of [
      [10, 0],
      [8, 0],
      [10, f.takeoffSpeed_m_s],
    ] as const) {
      const s = takeoff(attitude, rotateAt);
      log(`defaults: rotate to ${attitude} deg at ${rotateAt.toFixed(1)} m/s: lift-off at x =`, s.x, "m, t =", s.records.liftoff?.t, "s, outcome", s.outcome?.kind ?? "none");
      expect(s.outcome).toBeNull();
      expect(s.records.liftoff).not.toBeNull();
      expect(s.x).toBeLessThan(RUNWAY_LENGTH_M);
    }
  });

  it("cannot go supersonic in level flight at any height, until the thrust is raised", () => {
    const heights = [0, 2000, 4000, 6000, 8000, 10000, 11000, 12000, 14000];
    const top = (thrust: number): number => {
      const ac = defaultAircraft(thrust);
      const mass = ac.emptyMass_kg + fuelLoad(defaultDesign, ac);
      return Math.max(...heights.map((h) => levelFlightTopMach(ac, mass, h, ac.engine.initialState()) ?? 0));
    };
    const atDefault = top(defaultDesign.thrust_N);
    const at30 = top(30000);
    log("defaults: highest level-flight Mach at 15 kN", atDefault, "and at 30 kN", at30);
    expect(atDefault).toBeLessThan(1);
    expect(at30).toBeGreaterThan(1);
  });
});
