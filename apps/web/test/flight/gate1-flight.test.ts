/**
 * The scripted flight of gate 1, with the measured tables: the flight the PM
 * redoes with code of their own (brief 006, Amendment 1, point 1).
 *
 * Aircraft: the 47 deg wing-body of NACA RM L52B08 scaled to 25 m^2 of wing,
 * 1000 kg of fuel, provisional engine of 60 kN static thrust.
 * Script, with t the time at the start of each 1/120 s step:
 *   throttle 1 throughout;
 *   stick +1 (nose up at the pitch-rate limit, 20 deg/s) for 0 <= t < 0.4 s,
 *   so the attitude on the runway is 8 deg; stick 0 after that (attitude held).
 * Five figures to redo: lift-off time and speed, height and Mach number at
 * t = 60 s, and the highest Mach number in 120 s.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { bielatWing } from "@jet-workshop/physics";
import {
  DT,
  initialState,
  levelFlightTopMach,
  makeAircraft,
  makePlaceholderEngine,
  observe,
  step,
  type Controls,
  type FlightState,
} from "@jet-workshop/physics/flight";
import { loadDataset } from "@jet-workshop/validation";
import { SCENARIO } from "../../src/flight/scenario.ts";
import { allWingTables } from "../../src/flight/tables.ts";

const data = loadDataset(readFileSync(new URL("../../../../packages/validation/data/bielat-l52b08.csv", import.meta.url), "utf8"));
const tables = allWingTables(data);
const during = (t: number, a: number, b: number): boolean => t + 1e-9 >= a && t + 1e-9 < b;

function aircraft(thrust: number) {
  return makeAircraft({ wing: bielatWing("47"), aero: tables["47"], wingArea_m2: 25, engine: makePlaceholderEngine({ staticThrust_N: thrust }) });
}

export function gate1Script(t: number): Controls {
  return { throttle: 1, pitch: during(t, 0, 0.4) ? 1 : 0, afterburner: false };
}

describe("the scripted flight of gate 1, with the measured tables", () => {
  it("takes off, climbs and accelerates, and gives the five figures the PM redoes", () => {
    const ac = aircraft(60000);
    let s: FlightState = initialState(ac, 1000, SCENARIO);
    let at60: FlightState | null = null;
    for (let i = 0; i < 120 / DT && !s.outcome; i++) {
      s = step(s, gate1Script(i * DT), ac, DT);
      if (i + 1 === Math.round(60 / DT)) at60 = s;
    }
    expect(s.outcome).toBeNull();
    const lo = s.records.liftoff!;
    const o60 = observe(at60!, ac);
    const figures = {
      liftoffTime_s: lo.t,
      liftoffSpeed_m_s: lo.speed_m_s,
      heightAt60_m: at60!.h,
      machAt60: o60.mach,
      maxMachIn120: s.records.maxMach,
      xAt120_m: s.x,
      fuelAt120_kg: s.fuel_kg,
    };
    console.log("gate 1 scripted flight", JSON.stringify(figures));
    expect(lo.t).toBeGreaterThan(5);
    expect(lo.t).toBeLessThan(40);
    expect(at60!.h).toBeGreaterThan(500);
    for (const v of Object.values(figures)) expect(Number.isFinite(v)).toBe(true);
  });

  it("the 47 deg wing with little engine cannot go supersonic in level flight, and with more it can", () => {
    // Highest level-flight Mach number at any of these heights, with 600 kg of fuel aboard.
    const heights = [0, 2000, 5000, 8000, 11000, 14000];
    const top = (thrust: number): number => {
      const ac = aircraft(thrust);
      return Math.max(...heights.map((h) => levelFlightTopMach(ac, ac.emptyMass_kg + 600, h, ac.engine.initialState()) ?? 0));
    };
    // The static thrust above which it crosses Mach 1 somewhere, by bisection (the engine's mass grows with its thrust).
    let lo = 1000;
    let hi = 60000;
    expect(top(lo)).toBeLessThan(1);
    expect(top(hi)).toBeGreaterThan(1);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (top(mid) > 1) hi = mid;
      else lo = mid;
    }
    const rows = [10000, 15000, 20000, 30000, 60000].map((t) => [t / 1000, top(t)]);
    console.log("47 deg wing, 25 m^2: thrust (kN) and highest level-flight Mach", JSON.stringify(rows), "crosses Mach 1 above", (hi / 1000).toFixed(2), "kN");
    expect(top(0.9 * hi)).toBeLessThan(1);
    expect(top(1.1 * hi)).toBeGreaterThan(1);
  });
});
