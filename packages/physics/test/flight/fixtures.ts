/**
 * Synthetic aerodynamic tables and helpers for the flight tests
 * (brief 006, Amendment 1, point 1: the physics tests do not read the
 * measured data). The numbers are of the order of the tested wings but are
 * not data, and no test result depends on them matching the wings.
 */

import { bielatWing } from "../../src/geometry.ts";
import {
  DT,
  initialState,
  lift,
  makeAircraft,
  makePlaceholderEngine,
  step,
  type Aircraft,
  type Controls,
  type FlightState,
  type Scenario,
  type WingAeroTables,
} from "../../src/flight/index.ts";
import type { EngineModel } from "../../src/propulsion/contract.ts";

const DEG = Math.PI / 180;

export const SYNTHETIC: WingAeroTables = {
  wingId: "35",
  liftSlope: {
    points: [
      { mach: 0.5, value: 3.4 },
      { mach: 0.85, value: 3.8 },
      { mach: 0.95, value: 4.0 },
      { mach: 1.0, value: 3.7 },
      { mach: 1.1, value: 3.4 },
    ],
    dataClass: "computed",
    source: "synthetic test table",
  },
  liftSlopeSpread: { points: [{ mach: 0.5, value: 0.05 }], dataClass: "computed", source: "synthetic test table" },
  zeroLiftAlpha: { points: [{ mach: 0.5, value: -1.3 * DEG }], dataClass: "computed", source: "synthetic test table" },
  liftFitClLimit: 0.3,
  clMax: {
    points: [
      { mach: 0.5, value: 0.75 },
      { mach: 0.85, value: 0.65 },
      { mach: 1.1, value: 0.6 },
    ],
    dataClass: "measured",
    source: "synthetic test table",
  },
  dragRise: {
    points: [
      { mach: 0.5, value: 0 },
      { mach: 0.85, value: 0.0005 },
      { mach: 0.95, value: 0.003 },
      { mach: 1.0, value: 0.009 },
      { mach: 1.035, value: 0.01 },
      { mach: 1.1, value: 0.0097 },
    ],
    dataClass: "NACA faired",
    source: "synthetic test table",
    referenceMach: 0.5,
  },
  gaps: [[1.04, 1.08]],
  machTolerance: 0.025,
};

/** Tables with one point each: coefficients that do not change with Mach number (smooth, for the energy check). */
export const CONSTANT: WingAeroTables = {
  ...SYNTHETIC,
  liftSlope: { ...SYNTHETIC.liftSlope, points: [{ mach: 0, value: 3.6 }] },
  zeroLiftAlpha: { ...SYNTHETIC.zeroLiftAlpha, points: [{ mach: 0, value: -1.3 * DEG }] },
  clMax: { ...SYNTHETIC.clMax, points: [{ mach: 0, value: 0.75 }] },
  dragRise: { ...SYNTHETIC.dragRise, points: [{ mach: 0, value: 0 }], referenceMach: 0 },
};

export const RUNWAY: Scenario = { runways: [{ start_m: 0, length_m: 3000 }] };

export function aircraft(opts: { tables?: WingAeroTables; area?: number; thrust?: number; engine?: EngineModel } = {}): Aircraft {
  return makeAircraft({
    wing: bielatWing("35"),
    aero: opts.tables ?? SYNTHETIC,
    wingArea_m2: opts.area ?? 25,
    engine: opts.engine ?? makePlaceholderEngine({ staticThrust_N: opts.thrust ?? 60000 }),
  });
}

/** The same aircraft with lift and no drag at all. */
export function withoutDrag(ac: Aircraft): Aircraft {
  return {
    ...ac,
    aerodynamics: (mach, alpha) => ({
      lift: lift(ac.aero, ac.wing, mach, alpha),
      drag: {
        cd: 0,
        parts: { friction: 0, rise: 0, induced: 0 },
        evidence: "estimated",
        frictionEvidence: "estimated",
        riseEvidence: "estimated",
        inducedEvidence: "estimated",
      },
    }),
  };
}

/** A state in the air, flying at `speed` along a path angle `gamma` with attitude `theta`. */
export function airborne(ac: Aircraft, o: { x?: number; h: number; speed: number; gamma?: number; theta: number; fuel?: number; scenario?: Scenario }): FlightState {
  const s = initialState(ac, o.fuel ?? Math.min(800, ac.fuelCapacity_kg), o.scenario ?? RUNWAY);
  const g = o.gamma ?? 0;
  return {
    ...s,
    phase: "air",
    x: o.x ?? 10000,
    h: o.h,
    vx: o.speed * Math.cos(g),
    vz: o.speed * Math.sin(g),
    theta: o.theta,
    records: { ...s.records, liftoff: { t: 0, speed_m_s: o.speed, mass_kg: ac.emptyMass_kg + s.fuel_kg, alpha: o.theta - g } },
  };
}

export type Script = (t: number, s: FlightState) => Controls;

/** Runs a scripted flight for `seconds` (or until it ends), recording every state. */
export function fly(ac: Aircraft, start: FlightState, script: Script, seconds: number, dt = DT): FlightState[] {
  const out: FlightState[] = [start];
  let s = start;
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n && !s.outcome; i++) {
    s = step(s, script(i * dt, s), ac, dt);
    out.push(s);
  }
  return out;
}

export const idle: Controls = { throttle: 0, pitch: 0, afterburner: false };

/** Holds the attitude at `theta` (rad) with the stick, as a pilot would: full stick until within one step of it. */
export function holdAttitude(s: FlightState, theta: number, throttle: number, rateLimit: number, dt = DT): Controls {
  const err = theta - s.theta;
  const pitch = Math.max(-1, Math.min(1, err / (rateLimit * dt)));
  return { throttle, pitch, afterburner: false };
}
