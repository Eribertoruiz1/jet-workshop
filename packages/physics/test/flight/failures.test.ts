import { describe, expect, it } from "vitest";
import {
  GEAR_SINK_LIMIT,
  MAX_LOAD_FACTOR,
  MIN_LOAD_FACTOR,
  PITCH_RATE_LIMIT,
  ROTATION_LIMIT,
  TAKEOFF_SCREEN_HEIGHT,
  flightReport,
  initialState,
  liftoffSpeed,
  stallSpeed,
  type Outcome,
} from "../../src/flight/index.ts";
import type { EngineModel, EngineOutput } from "../../src/propulsion/contract.ts";
import { RUNWAY, aircraft, airborne, fly, type Script } from "./fixtures.ts";

const during = (t: number, a: number, b: number): boolean => t + 1e-9 >= a && t + 1e-9 < b;
const steady = (throttle: number): Script => () => ({ throttle, pitch: 0, afterburner: false });

function outcomeOf(run: { outcome: Outcome | null }[]): Outcome {
  const o = run.at(-1)!.outcome;
  if (!o) throw new Error("the scripted flight did not end");
  return o;
}

function finite(o: Outcome): boolean {
  return Object.values(o).every((v) => typeof v === "string" || Number.isFinite(v));
}

/** An engine that runs like the placeholder but fails after one second above 90 percent throttle. */
function fragileEngine(): EngineModel {
  const ok = (thrust: number): EngineOutput => ({ thrust_N: thrust, fuelFlow_kg_s: 1, afterburnerLit: false, limits: [], failure: null, evidence: "estimated" });
  return {
    id: "test-fragile",
    mass_kg: 1500,
    massEvidence: "estimated",
    initialState: () => ({ hot: 0, failed: 0 }),
    step(s, cmd, _c, dt) {
      if (s.failed) return { state: s, output: { thrust_N: 0, fuelFlow_kg_s: 0, afterburnerLit: false, limits: [], failure: { limitId: "test-overspeed" }, evidence: "estimated" } };
      const hot = cmd.throttle > 0.9 ? (s.hot ?? 0) + dt : 0;
      if (hot > 1) return { state: { hot, failed: 1 }, output: { thrust_N: 0, fuelFlow_kg_s: 0, afterburnerLit: false, limits: [], failure: { limitId: "test-overspeed" }, evidence: "estimated" } };
      return { state: { hot, failed: 0 }, output: ok(40000 * cmd.throttle) };
    },
  };
}

describe("check 7: every failure of the table, provoked by a scripted flight", () => {
  it("no take-off: the runway ends before lift equals weight", () => {
    const ac = aircraft({ thrust: 15000 });
    const scenario = { runways: [{ start_m: 0, length_m: 800 }] };
    const run = fly(ac, initialState(ac, 600, scenario), steady(1), 120);
    const o = outcomeOf(run);
    expect(o.kind).toBe("no-takeoff");
    if (o.kind !== "no-takeoff") return;
    expect(run.at(-1)!.x).toBeCloseTo(800, 6);
    expect(o.speed_m_s).toBeLessThan(o.required_m_s);
    expect(o.required_m_s).toBeCloseTo(liftoffSpeed(ac, ac.emptyMass_kg + run.at(-1)!.fuel_kg, 0), 6);
    expect(finite(o)).toBe(true);
  });

  it("stall: past the angle of maximum lift, it comes down without recovering", () => {
    const ac = aircraft();
    // Raise the nose by 40 degrees, cut the throttle and hold the attitude.
    const pull = (40 * Math.PI) / 180 / PITCH_RATE_LIMIT;
    const script: Script = (t) => ({ throttle: 0, pitch: during(t, 0, pull) ? 1 : 0, afterburner: false });
    const run = fly(ac, airborne(ac, { h: 1500, speed: 140, theta: 0.05 }), script, 300);
    const o = outcomeOf(run);
    expect(o.kind).toBe("stall");
    if (o.kind !== "stall") return;
    expect(o.speed_m_s).toBeGreaterThan(0);
    expect(o.height_m).toBeGreaterThan(0);
    expect(o.stallSpeed_m_s).toBeCloseTo(stallSpeed(ac, o.mass_kg, o.height_m), 9);
    expect(finite(o)).toBe(true);
  });

  it("wing break: pulling past the positive limit load factor", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { h: 3000, speed: 280, theta: 0.02 }), () => ({ throttle: 1, pitch: 1, afterburner: false }), 30);
    const o = outcomeOf(run);
    expect(o.kind).toBe("wing-break");
    if (o.kind !== "wing-break") return;
    expect(o.limit).toBe(MAX_LOAD_FACTOR);
    expect(o.loadFactor).toBeGreaterThan(MAX_LOAD_FACTOR);
    expect(o.loadFactor).toBeLessThan(MAX_LOAD_FACTOR + 0.5);
    expect(o.speed_m_s).toBeGreaterThan(200);
  });

  it("wing break: pushing past the negative limit load factor", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { h: 3000, speed: 280, theta: 0.02 }), () => ({ throttle: 1, pitch: -1, afterburner: false }), 30);
    const o = outcomeOf(run);
    expect(o.kind).toBe("wing-break");
    if (o.kind !== "wing-break") return;
    expect(o.limit).toBe(MIN_LOAD_FACTOR);
    expect(o.loadFactor).toBeLessThan(MIN_LOAD_FACTOR);
  });

  it("out of fuel: the fuel mass reaches zero", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 20000, h: 3000, speed: 200, theta: 0.03, fuel: 3 }), steady(1), 60);
    const o = outcomeOf(run);
    expect(o.kind).toBe("out-of-fuel");
    if (o.kind !== "out-of-fuel") return;
    expect(run.at(-1)!.fuel_kg).toBe(0);
    expect(o.distance_m).toBeGreaterThan(17000);
    expect(o.distance_m).toBeCloseTo(run.at(-1)!.x - 3000, 6);
  });

  it("engine failure: the engine returns a failure", () => {
    const ac = aircraft({ engine: fragileEngine() });
    const run = fly(ac, initialState(ac, 600, RUNWAY), steady(1), 10);
    const o = outcomeOf(run);
    expect(o.kind).toBe("engine-failure");
    if (o.kind !== "engine-failure") return;
    expect(o.limitId).toBe("test-overspeed");
    expect(o.t).toBeGreaterThan(1);
    expect(o.t).toBeLessThan(1.1);
  });

  it("hard landing: touching the runway sinking faster than the gear takes", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 500, h: 15, speed: 100, gamma: -0.06, theta: 0.056 }), steady(0.3), 30);
    const o = outcomeOf(run);
    expect(o.kind).toBe("hard-landing");
    if (o.kind !== "hard-landing") return;
    expect(o.sink_m_s).toBeGreaterThan(GEAR_SINK_LIMIT);
    expect(o.limit_m_s).toBe(GEAR_SINK_LIMIT);
    expect(run.at(-1)!.h).toBe(0);
  });

  it("crash: touching the ground off the runway", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 10000, h: 200, speed: 150, gamma: -0.2, theta: -0.1 }), steady(0.5), 30);
    const o = outcomeOf(run);
    expect(o).toMatchObject({ kind: "crash", reason: "off-runway" });
    if (o.kind === "crash") expect(o.speed_m_s).toBeGreaterThan(100);
  });

  it("crash: touching the runway with the nose low", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 300, h: 5, speed: 100, gamma: -0.02, theta: -0.05 }), steady(0.3), 30);
    expect(outcomeOf(run)).toMatchObject({ kind: "crash", reason: "nose-low" });
  });

  it("a gentle touchdown on the runway is a landing, with its report", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 300, h: 8, speed: 90, gamma: -0.0167, theta: 0.13 }), steady(0), 30);
    const end = run.at(-1)!;
    const o = outcomeOf(run);
    expect(o.kind).toBe("landed");
    if (o.kind !== "landed") return;
    expect(o.sink_m_s).toBeLessThanOrEqual(GEAR_SINK_LIMIT);
    const r = flightReport(end, ac)!;
    expect(r.supersonic).toBe(false);
    expect(r.fuelLeftFraction).toBe(end.fuel_kg / end.initialFuel_kg);
    expect(r.provisionalEngine).toBe(true);
    // It never went supersonic, so the report gives where drag equals full thrust in level flight.
    expect(r.dragEqualsThrustMach).not.toBeNull();
  });

  it("crash: touching the runway moving backwards", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 1800, h: 3, speed: 60, gamma: Math.PI + 0.05, theta: Math.PI - 0.1 }), steady(0), 10);
    expect(outcomeOf(run)).toMatchObject({ kind: "crash", reason: "backwards", distance_m: 0 });
  });

  it("a touchdown before the take-off screen height (35 ft) is not a landing: the ground roll goes on", () => {
    const ac = aircraft();
    const rotate = (10 * Math.PI) / 180 / PITCH_RATE_LIMIT;
    // Rotate to 10 deg, lift off, then push the nose down hard just after lift-off.
    let pushedAt: number | null = null;
    const script: Script = (t, s) => {
      if (s.records.liftoff && pushedAt === null) pushedAt = t;
      const push = pushedAt !== null && t < pushedAt + 0.5;
      return { throttle: 1, pitch: during(t, 0, rotate) ? 1 : push ? -1 : 0, afterburner: false };
    };
    const run = fly(ac, initialState(ac, 600, RUNWAY), script, 25);
    const hop = run.findIndex((s, i) => i > 0 && run[i - 1]!.phase === "air" && s.phase === "ground");
    expect(hop).toBeGreaterThan(0);
    expect(Math.max(...run.slice(0, hop + 1).map((s) => s.h))).toBeLessThan(TAKEOFF_SCREEN_HEIGHT);
    expect(run[hop]!.outcome).toBeNull();
    expect(run[hop]!.vx).toBeGreaterThan(50);
  });

  it("keeps the attitude on the runway between the nose gear and the rotation limit", () => {
    const ac = aircraft();
    const up = fly(ac, initialState(ac, 600, RUNWAY), () => ({ throttle: 0, pitch: 1, afterburner: false }), 5);
    expect(up.at(-1)!.theta).toBe(ROTATION_LIMIT);
    const down = fly(ac, initialState(ac, 600, RUNWAY), () => ({ throttle: 0, pitch: -1, afterburner: false }), 2);
    expect(down.at(-1)!.theta).toBe(0);
  });

  it("after the outcome, the state no longer changes", () => {
    const ac = aircraft();
    const run = fly(ac, airborne(ac, { x: 10000, h: 50, speed: 150, gamma: -0.2, theta: -0.1 }), steady(0.5), 30);
    const end = run.at(-1)!;
    expect(end.outcome).not.toBeNull();
    expect(fly(ac, end, steady(1), 1).at(-1)).toBe(end);
  });
});
