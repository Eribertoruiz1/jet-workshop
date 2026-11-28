import { describe, expect, it } from "vitest";
import { DT, G0, PITCH_RATE_LIMIT, atmosphere, initialState, lift, observe, type Controls, type FlightState } from "../../src/flight/index.ts";
import { CONSTANT, RUNWAY, aircraft, airborne, fly, report, withoutDrag, type Script } from "./fixtures.ts";

const DEG = Math.PI / 180;

/** True while t is in [a, b), robust to the rounding of i * dt. */
const during = (t: number, a: number, b: number): boolean => t + 1e-9 >= a && t + 1e-9 < b;

function energy(s: FlightState, emptyMass: number): number {
  const m = emptyMass + s.fuel_kg;
  return m * (0.5 * (s.vx * s.vx + s.vz * s.vz) + G0 * s.h);
}

describe("check 1: energy is conserved without thrust or drag", () => {
  it("keeps the total energy within one part in a million over 60 s of manoeuvring flight", () => {
    const ac = withoutDrag(aircraft({ tables: CONSTANT, thrust: 0 }));
    const start = airborne(ac, { h: 4000, speed: 200, theta: 0.04 });
    const script: Script = (t) => ({
      throttle: 0,
      pitch: during(t, 5, 8) ? 0.6 : during(t, 20, 24) ? -0.5 : during(t, 35, 37) ? 0.8 : 0,
      afterburner: false,
    });
    const run = fly(ac, start, script, 60);
    expect(run.at(-1)!.outcome).toBeNull();
    expect(run.at(-1)!.t).toBeCloseTo(60, 9);
    const e0 = energy(start, ac.emptyMass_kg);
    const worst = Math.max(...run.map((s) => Math.abs(energy(s, ac.emptyMass_kg) - e0) / e0));
    report("check 1: largest relative change of the total energy in 60 s", worst);
    expect(worst).toBeLessThan(1e-6);
    // The flight is not trivial: it climbed and dived, trading speed for height.
    const heights = run.map((s) => s.h);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(300);
  });
});

describe("check 2: the steady glide slope is drag over lift", () => {
  it("settles on tan(-gamma) = D / L within 1 percent", () => {
    // A light aircraft glides slowly, so the change of air density along the
    // glide barely accelerates it (the glide is steady to well under 1 percent).
    const ac = { ...aircraft({ thrust: 0 }), emptyMass_kg: 400 };
    const start = airborne(ac, { h: 3000, speed: 25, gamma: -0.06, theta: 0.085, fuel: 10 });
    const run = fly(ac, start, () => ({ throttle: 0, pitch: 0, afterburner: false }), 120);
    const s = run.at(-1)!;
    expect(s.outcome).toBeNull();
    const o = observe(s, ac);
    const slope = -s.vz / s.vx;
    const ratio = o.drag_N / o.lift_N;
    report("check 2: glide slope", slope, "D/L", ratio, "relative difference", Math.abs(slope - ratio) / ratio);
    expect(Math.abs(slope - ratio) / ratio).toBeLessThan(0.01);
    expect(slope).toBeGreaterThan(0.02);
  });
});

/** Seconds of full stick that change the attitude by `deg` degrees. */
const stickFor = (deg: number): number => (deg * DEG) / PITCH_RATE_LIMIT;

/**
 * A scripted take-off and climb: rotation to 8 deg on the runway, then two
 * small pitch inputs in the air (larger ones break the wing at this speed).
 */
const takeoffScript: Script = (t) => ({
  throttle: 1,
  pitch: during(t, 0, stickFor(8)) ? 1 : during(t, 30, 30 + stickFor(1.5)) ? 1 : during(t, 45, 45 + stickFor(2)) ? -1 : 0,
  afterburner: false,
});

describe("check 4: the result does not depend on the time step", () => {
  it("moves the position after 60 s by less than 1 m when the step is halved", () => {
    const ac = aircraft();
    const s0 = initialState(ac, 800, RUNWAY);
    const a = fly(ac, s0, takeoffScript, 60, DT).at(-1)!;
    const b = fly(ac, s0, takeoffScript, 60, DT / 2).at(-1)!;
    expect(a.outcome).toBeNull();
    expect(b.outcome).toBeNull();
    expect(a.phase).toBe("air");
    expect(a.h).toBeGreaterThan(100);
    report("check 4: position after 60 s", a.x, a.h, "change with half the step (m)", Math.hypot(a.x - b.x, a.h - b.h));
    expect(Math.hypot(a.x - b.x, a.h - b.h)).toBeLessThan(1);
  });
});

describe("check 5: the same script gives the same flight, bit for bit", () => {
  it("repeats every state exactly", () => {
    const ac = aircraft();
    const s0 = initialState(ac, 800, RUNWAY);
    const one = fly(ac, s0, takeoffScript, 60);
    const two = fly(ac, s0, takeoffScript, 60);
    expect(two.length).toBe(one.length);
    for (let i = 0; i < one.length; i++) {
      const p = one[i]!;
      const q = two[i]!;
      for (const k of ["t", "x", "h", "vx", "vz", "theta", "fuel_kg"] as const) {
        expect(Object.is(p[k], q[k])).toBe(true);
      }
    }
    expect(JSON.stringify(one)).toBe(JSON.stringify(two));
  });
});

describe("check 6: lift-off happens where lift equals weight", () => {
  for (const attitudeDeg of [6, 8, 11]) {
    it(`lifts off at the speed where lift equals weight, rotated to ${attitudeDeg} deg`, () => {
      const ac = aircraft();
      const rotate = stickFor(attitudeDeg);
      const script = (t: number): Controls => ({ throttle: 1, pitch: during(t, 0, rotate) ? 1 : 0, afterburner: false });
      const run = fly(ac, initialState(ac, 800, RUNWAY), script, 60);
      const lo = run.at(-1)!.records.liftoff;
      expect(lo).not.toBeNull();
      expect(lo!.alpha / DEG).toBeCloseTo(attitudeDeg, 6);
      // Independent: V = sqrt(2 m g / (rho S CL)), with CL at the lift-off Mach number.
      const air = atmosphere(0);
      let v = 50;
      for (let i = 0; i < 50; i++) {
        const cl = lift(ac.aero, ac.wing, v / air.speedOfSound_m_s, lo!.alpha).cl;
        v = Math.sqrt((2 * lo!.mass_kg * G0) / (air.density_kg_m3 * ac.wingArea_m2 * cl));
      }
      report(`check 6: ${attitudeDeg} deg, lift-off at`, lo!.speed_m_s, "m/s; lift equals weight at", v, "m/s; relative difference", Math.abs(lo!.speed_m_s - v) / v);
      expect(Math.abs(lo!.speed_m_s - v) / v).toBeLessThan(0.02);
    });
  }
});
