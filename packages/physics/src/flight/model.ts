/**
 * Point-mass flight in a vertical plane (brief 006, "El modelo").
 *
 * In the air the equations of the brief,
 *   m dV/dt     = T cos(alpha) - D - m g sin(gamma)
 *   m V dgamma/dt = L + T sin(alpha) - m g cos(gamma)
 *   dh/dt = V sin(gamma),  dx/dt = V cos(gamma),  dm/dt = -fuel flow
 * are integrated in their earth-frame form, the same equations projected on
 * the horizontal and the vertical:
 *   m dvx/dt = T cos(theta) - D cos(gamma) - L sin(gamma)
 *   m dvz/dt = T sin(theta) - D sin(gamma) + L cos(gamma) - m g
 * with gamma = atan2(vz, vx) and alpha = theta - gamma. This form has no
 * 1/V term, so it stays finite when the speed falls towards zero in the air.
 * Thrust acts along the body axis (theta).
 *
 * Attitude is kinematic: the stick sets the pitch rate, up to a limit, and
 * with the stick released the attitude is held. A declared simplification,
 * `estimated`.
 *
 * On the runway a separate model: no flight-path angle, rolling friction on
 * the part of the weight the wing does not carry, until lift equals weight.
 *
 * Integration: fixed step, classical fourth-order Runge-Kutta. `step` is a
 * pure function: the same inputs give the same output, bit for bit. Events
 * inside a step (lift-off, end of the runway, touchdown) are located by
 * bisection on the sub-step, so the result does not depend on where the
 * step boundaries fall.
 */

import type { EngineCommand, EngineLimit, EngineOutput, EngineState, FlightCondition } from "../propulsion/contract.ts";
import { weakest, wrapAngle, type DragState, type FlightEvidence, type LiftState } from "./aero.ts";
import type { Aircraft } from "./aircraft.ts";
import { atmosphere, G0, type Air } from "./atmosphere.ts";

const DEG = Math.PI / 180;

/** Time step of the integration, s (brief 006). */
export const DT = 1 / 120;

/**
 * Pitch rate at full stick, rad/s. A property of the control, not of the
 * aircraft: with kinematic attitude there is no moment to limit it. In a
 * sustained pull the flight path turns at about this rate, so it also sets
 * the load factor the pilot can ask for, n ~ 1 + V q / g: at 20 deg/s about
 * 11 g at 280 m/s and 4.6 g at 100 m/s. So at speed the wing limit, not the
 * control, stops a hard pull, and at low speed the stall does. Of the order
 * of the pitch rate of a fighter at its corner speed; chosen for the feel,
 * `estimated`.
 */
export const PITCH_RATE_LIMIT = 20 * DEG;

/** Rolling friction coefficient of tyres on a dry concrete runway, brakes off. */
// UNVERIFIED: 0.03 for dry concrete is the textbook value (Raymer, Aircraft Design, table 17.1); find an open source.
export const ROLLING_FRICTION = 0.03;

/**
 * Highest pitch attitude on the runway, rad: rotating further would put the
 * aft body on the ground. No tail and no gear are modelled, so the angle is
 * declared, of the order of a fighter's tail-strike angle.
 */
// UNVERIFIED: no source; declared, `estimated`.
export const ROTATION_LIMIT = 15 * DEG;

/**
 * Height that completes a take-off: 35 ft above the take-off surface,
 * 14 CFR 25.113(a)(1) (`report text`, Cornell LII e-CFR, read on 17 November
 * 2026). A gentle touchdown on a runway before the aircraft has climbed to it
 * is not a landing: the aircraft goes back to its ground roll.
 */
export const TAKEOFF_SCREEN_HEIGHT = 35 * 0.3048;

/** Load factor, as a fraction of a limit, at which the wing-limit warning starts. A warning threshold, not a limit. */
export const WING_LIMIT_WARNING_FRACTION = 0.9;
/** Fraction of an engine limit at which the page relays the engine's warning. */
export const ENGINE_LIMIT_WARNING_FRACTION = 0.9;

const BISECTION_STEPS = 40;

export interface Runway {
  /** Distance of the threshold from the origin, m */
  readonly start_m: number;
  readonly length_m: number;
}

export interface Scenario {
  /** The first runway is the one the aircraft takes off from. */
  readonly runways: readonly Runway[];
}

export interface Controls {
  /** 0 is idle, 1 is full throttle */
  readonly throttle: number;
  /** Stick, -1 to 1, as a fraction of the pitch-rate limit; positive raises the nose */
  readonly pitch: number;
  readonly afterburner: boolean;
}

export type Phase = "ground" | "air";

/** The moment the wing went past its stall angle, kept until the aircraft recovers. */
export interface StallEpisode {
  readonly t: number;
  readonly speed_m_s: number;
  readonly height_m: number;
  readonly mass_kg: number;
}

export interface Records {
  readonly maxMach: number;
  /** Height and mass when the top Mach number was reached */
  readonly maxMachHeight_m: number;
  readonly maxMachMass_kg: number;
  readonly maxHeight_m: number;
  /** The moment of lift-off; null while it has not left the ground */
  readonly liftoff: Liftoff | null;
}

export interface Liftoff {
  readonly t: number;
  readonly speed_m_s: number;
  readonly mass_kg: number;
  /** Angle of attack at lift-off (the attitude on the runway), rad */
  readonly alpha: number;
}

export type Outcome =
  | { readonly kind: "landed"; readonly t: number; readonly speed_m_s: number; readonly sink_m_s: number }
  | { readonly kind: "no-takeoff"; readonly t: number; readonly speed_m_s: number; readonly required_m_s: number }
  | { readonly kind: "stall"; readonly t: number; readonly speed_m_s: number; readonly height_m: number; readonly mass_kg: number; readonly stallSpeed_m_s: number }
  | { readonly kind: "wing-break"; readonly t: number; readonly loadFactor: number; readonly limit: number; readonly speed_m_s: number }
  | { readonly kind: "out-of-fuel"; readonly t: number; readonly distance_m: number }
  | { readonly kind: "engine-failure"; readonly t: number; readonly limitId: string }
  | { readonly kind: "hard-landing"; readonly t: number; readonly sink_m_s: number; readonly limit_m_s: number }
  | {
      readonly kind: "crash";
      readonly t: number;
      readonly speed_m_s: number;
      readonly reason: "off-runway" | "nose-low" | "backwards";
      /** Pitch attitude at contact, rad (negative: nose below the horizon) */
      readonly theta: number;
      /** Distance to the nearest runway, m (0 on a runway) */
      readonly distance_m: number;
    };

export interface FlightState {
  readonly t: number;
  readonly phase: Phase;
  /** Horizontal position, m */
  readonly x: number;
  /** Height above the runway, m */
  readonly h: number;
  /** Velocity, earth frame, m/s */
  readonly vx: number;
  readonly vz: number;
  /** Pitch attitude, rad (body axis above the horizon) */
  readonly theta: number;
  readonly fuel_kg: number;
  readonly initialFuel_kg: number;
  readonly engine: EngineState;
  /** Engine output used for the last step (at its start) */
  readonly engineOutput: EngineOutput;
  readonly scenario: Scenario;
  readonly stall: StallEpisode | null;
  readonly records: Records;
  /** Set once, when the flight ends; then `step` returns the state unchanged. */
  readonly outcome: Outcome | null;
}

/** [x, h, vx, vz, theta, fuel] */
type Vec = readonly [number, number, number, number, number, number];

export interface Forces {
  readonly air: Air;
  readonly speed_m_s: number;
  readonly mach: number;
  /** Flight-path angle, rad */
  readonly gamma: number;
  /** Angle of attack, rad */
  readonly alpha: number;
  readonly mass_kg: number;
  readonly lift: LiftState;
  readonly drag: DragState;
  readonly lift_N: number;
  readonly drag_N: number;
  readonly thrust_N: number;
  readonly weight_N: number;
  readonly fuelFlow_kg_s: number;
  /** Lift over weight */
  readonly loadFactor: number;
}

function flightCondition(air: Air, mach: number): FlightCondition {
  return { ambient: { pressure_Pa: air.pressure_Pa, temperature_K: air.temperature_K }, mach };
}

/** Aerodynamic and engine forces at a point of the state space, with the engine output given. */
export function forcesAt(ac: Aircraft, y: Vec, onGround: boolean, engine: EngineOutput): Forces {
  const [, h, vx, vz, theta, fuel] = y;
  const air = atmosphere(h);
  const speed = onGround ? Math.max(0, vx) : Math.hypot(vx, vz);
  const gamma = onGround || speed === 0 ? 0 : Math.atan2(vz, vx);
  const alpha = onGround ? theta : wrapAngle(theta - gamma);
  const mach = speed / air.speedOfSound_m_s;
  const { lift: l, drag: d } = ac.aerodynamics(mach, alpha, (air.density_kg_m3 * speed) / air.viscosity_Pa_s);
  const q = 0.5 * air.density_kg_m3 * speed * speed;
  const mass = ac.emptyMass_kg + Math.max(0, fuel);
  const thrust = engine.failure ? 0 : engine.thrust_N;
  const liftN = q * ac.wingArea_m2 * l.cl;
  return {
    air,
    speed_m_s: speed,
    mach,
    gamma,
    alpha,
    mass_kg: mass,
    lift: l,
    drag: d,
    lift_N: liftN,
    drag_N: q * ac.wingArea_m2 * d.cd,
    thrust_N: thrust,
    weight_N: mass * G0,
    fuelFlow_kg_s: engine.failure || fuel <= 0 ? 0 : engine.fuelFlow_kg_s,
    loadFactor: liftN / (mass * G0),
  };
}

function engineAt(ac: Aircraft, state: EngineState, cmd: EngineCommand, y: Vec, onGround: boolean, dt: number): { state: EngineState; output: EngineOutput } {
  const [, h, vx, vz] = y;
  const air = atmosphere(h);
  const speed = onGround ? Math.max(0, vx) : Math.hypot(vx, vz);
  const r = ac.engine.step(state, cmd, flightCondition(air, speed / air.speedOfSound_m_s), dt);
  return { state: r.state, output: r.output };
}

function derivative(ac: Aircraft, y: Vec, onGround: boolean, engine: EngineOutput, pitchRate: number): Vec {
  const f = forcesAt(ac, y, onGround, engine);
  const theta = y[4];
  if (onGround) {
    const normal = Math.max(0, f.weight_N - f.lift_N);
    const drive = f.thrust_N * Math.cos(theta) - f.drag_N;
    const friction = ROLLING_FRICTION * normal;
    // Rolling friction opposes motion; at rest it holds the aircraft until the drive exceeds it.
    const force = y[2] > 0 ? drive - friction : Math.max(0, drive - friction);
    // The nose gear stops the attitude at zero, the aft body at the rotation limit.
    const thetaRate = (theta <= 0 && pitchRate < 0) || (theta >= ROTATION_LIMIT && pitchRate > 0) ? 0 : pitchRate;
    return [Math.max(0, y[2]), 0, force / f.mass_kg, 0, thetaRate, -f.fuelFlow_kg_s];
  }
  const cg = Math.cos(f.gamma);
  const sg = Math.sin(f.gamma);
  const fx = f.thrust_N * Math.cos(theta) - f.drag_N * cg - f.lift_N * sg;
  const fz = f.thrust_N * Math.sin(theta) - f.drag_N * sg + f.lift_N * cg - f.weight_N;
  return [y[2], y[3], fx / f.mass_kg, fz / f.mass_kg, pitchRate, -f.fuelFlow_kg_s];
}

function add(y: Vec, k: Vec, s: number): Vec {
  return [y[0] + k[0] * s, y[1] + k[1] * s, y[2] + k[2] * s, y[3] + k[3] * s, y[4] + k[4] * s, y[5] + k[5] * s];
}

interface Advance {
  readonly y: Vec;
  readonly engine: EngineState;
  readonly output: EngineOutput;
}

/** One RK4 step of length `dt` from `y`; the engine is asked for its output at each stage's flight condition. */
function advance(ac: Aircraft, y: Vec, onGround: boolean, engine: EngineState, cmd: EngineCommand, pitchRate: number, dt: number): Advance {
  const first = engineAt(ac, engine, cmd, y, onGround, dt);
  const out = (z: Vec): EngineOutput => engineAt(ac, engine, cmd, z, onGround, dt).output;
  const k1 = derivative(ac, y, onGround, first.output, pitchRate);
  const y2 = add(y, k1, dt / 2);
  const k2 = derivative(ac, y2, onGround, out(y2), pitchRate);
  const y3 = add(y, k2, dt / 2);
  const k3 = derivative(ac, y3, onGround, out(y3), pitchRate);
  const y4 = add(y, k3, dt);
  const k4 = derivative(ac, y4, onGround, out(y4), pitchRate);
  const s = dt / 6;
  let next: Vec = [
    y[0] + s * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]),
    y[1] + s * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]),
    y[2] + s * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]),
    y[3] + s * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]),
    y[4] + s * (k1[4] + 2 * k2[4] + 2 * k3[4] + k4[4]),
    y[5] + s * (k1[5] + 2 * k2[5] + 2 * k3[5] + k4[5]),
  ];
  if (onGround) next = [next[0], 0, Math.max(0, next[2]), 0, Math.min(ROTATION_LIMIT, Math.max(0, next[4])), next[5]];
  return { y: next, engine: first.state, output: first.output };
}

/** Smallest sub-step in (0, dt] at which `hit` becomes true, assuming it is false at 0 and true at dt. */
function bisect(dt: number, hit: (tau: number) => boolean): number {
  let lo = 0;
  let hi = dt;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const mid = (lo + hi) / 2;
    if (hit(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}

function vecOf(s: FlightState): Vec {
  return [s.x, s.h, s.vx, s.vz, s.theta, s.fuel_kg];
}

function withVec(s: FlightState, y: Vec, t: number, engine: EngineState, output: EngineOutput): FlightState {
  return { ...s, t, x: y[0], h: y[1], vx: y[2], vz: y[3], theta: y[4], fuel_kg: Math.max(0, y[5]), engine, engineOutput: output };
}

/** Horizontal distance to the nearest runway, m (0 over a runway). */
export function distanceToRunway(scenario: Scenario, x: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const r of scenario.runways) {
    const d = x < r.start_m ? r.start_m - x : x > r.start_m + r.length_m ? x - r.start_m - r.length_m : 0;
    best = Math.min(best, d);
  }
  return best;
}

function onRunway(scenario: Scenario, x: number): boolean {
  return distanceToRunway(scenario, x) === 0;
}

/** The runway under a position, or null. */
export function runwayAt(scenario: Scenario, x: number): Runway | null {
  return scenario.runways.find((r) => x >= r.start_m && x <= r.start_m + r.length_m) ?? null;
}

export function initialState(ac: Aircraft, fuel_kg: number, scenario: Scenario): FlightState {
  if (!(fuel_kg >= 0) || fuel_kg > ac.fuelCapacity_kg + 1e-9) throw new RangeError("fuel must be between 0 and the aircraft's capacity");
  if (!scenario.runways.length) throw new RangeError("the scenario needs a runway to take off from");
  const engine = ac.engine.initialState();
  const start = scenario.runways[0]!.start_m;
  const y: Vec = [start, 0, 0, 0, 0, fuel_kg];
  const output = engineAt(ac, engine, { throttle: 0, afterburner: false }, y, true, DT).output;
  return {
    t: 0,
    phase: "ground",
    x: start,
    h: 0,
    vx: 0,
    vz: 0,
    theta: 0,
    fuel_kg,
    initialFuel_kg: fuel_kg,
    engine,
    engineOutput: output,
    scenario,
    stall: null,
    records: { maxMach: 0, maxMachHeight_m: 0, maxMachMass_kg: ac.emptyMass_kg + fuel_kg, maxHeight_m: 0, liftoff: null },
    outcome: null,
  };
}

function ended(s: FlightState, outcome: Outcome): FlightState {
  return { ...s, outcome };
}

/** Speed at which the wing carries `mass_kg` at a lift coefficient that may change with Mach number, m/s. */
export function speedForLift(ac: Aircraft, mass_kg: number, height_m: number, clAt: (mach: number) => number): number {
  const air = atmosphere(height_m);
  let v = 0.2 * air.speedOfSound_m_s;
  for (let i = 0; i < 60; i++) {
    const cl = clAt(v / air.speedOfSound_m_s);
    if (!(cl > 0)) return Number.POSITIVE_INFINITY;
    const next = Math.sqrt((2 * mass_kg * G0) / (air.density_kg_m3 * ac.wingArea_m2 * cl));
    if (Math.abs(next - v) < 1e-9 * next) return next;
    v = next;
  }
  return v;
}

/** Stall speed: the speed at which the highest measured lift coefficient carries the weight, m/s. */
export function stallSpeed(ac: Aircraft, mass_kg: number, height_m: number): number {
  return speedForLift(ac, mass_kg, height_m, (m) => ac.aerodynamics(m, 0, LIFT_ONLY_REYNOLDS).lift.clMax);
}

/** Speed at which the wing carries the weight at a fixed angle of attack, m/s. */
export function liftoffSpeed(ac: Aircraft, mass_kg: number, alpha: number, height_m = 0): number {
  return speedForLift(ac, mass_kg, height_m, (m) => ac.aerodynamics(m, alpha, LIFT_ONLY_REYNOLDS).lift.cl);
}

/** Lift does not depend on the Reynolds number in this model; any value serves when only lift is wanted. */
const LIFT_ONLY_REYNOLDS = 1e7;

function records(r: Records, f: Forces, y: Vec, t: number, airborne: boolean): Records {
  const top = f.mach > r.maxMach;
  return {
    maxMach: top ? f.mach : r.maxMach,
    maxMachHeight_m: top ? y[1] : r.maxMachHeight_m,
    maxMachMass_kg: top ? f.mass_kg : r.maxMachMass_kg,
    maxHeight_m: Math.max(r.maxHeight_m, y[1]),
    liftoff: r.liftoff ?? (airborne ? { t, speed_m_s: f.speed_m_s, mass_kg: f.mass_kg, alpha: f.alpha } : null),
  };
}

function groundStep(s: FlightState, ac: Aircraft, cmd: EngineCommand, rate: number, dt: number): FlightState {
  const y0 = vecOf(s);
  const go = (tau: number): Advance => advance(ac, y0, true, s.engine, cmd, rate, tau);
  const lifts = (a: Advance): boolean => {
    const f = forcesAt(ac, a.y, true, a.output);
    return f.lift_N >= f.weight_N;
  };
  // The runway it is rolling on: the take-off runway, or the one it touched back down on.
  const runway = runwayAt(s.scenario, s.x) ?? s.scenario.runways[0]!;
  const end = runway.start_m + runway.length_m;
  const full = go(dt);
  const liftoff = lifts(full);
  const overrun = full.y[0] > end;
  if (!liftoff && !overrun) {
    const f = forcesAt(ac, full.y, true, full.output);
    const next = withVec(s, full.y, s.t + dt, full.engine, full.output);
    return finishStep({ ...next, records: records(s.records, f, full.y, next.t, false) }, ac, f, false);
  }
  const tLift = liftoff ? bisect(dt, (tau) => lifts(go(tau))) : Number.POSITIVE_INFINITY;
  const tEnd = overrun ? bisect(dt, (tau) => go(tau).y[0] > end) : Number.POSITIVE_INFINITY;
  if (tEnd < tLift) {
    const a = go(tEnd);
    const f = forcesAt(ac, a.y, true, a.output);
    const at = withVec(s, a.y, s.t + tEnd, a.engine, a.output);
    return ended(at, { kind: "no-takeoff", t: at.t, speed_m_s: f.speed_m_s, required_m_s: liftoffSpeed(ac, f.mass_kg, a.y[4]) });
  }
  const a = go(tLift);
  const f = forcesAt(ac, a.y, true, a.output);
  const up: FlightState = {
    ...withVec(s, a.y, s.t + tLift, a.engine, a.output),
    phase: "air",
    records: records(s.records, f, a.y, s.t + tLift, true),
  };
  const rest = dt - tLift;
  return rest > 0 ? airStep(up, ac, cmd, rate, rest) : up;
}

/**
 * Contact with the ground at `s` (h = 0). `rest` is what is left of the time
 * step: a touchdown that only ends a hop below the take-off screen height
 * goes back to the ground roll for that time.
 */
function touchdown(s: FlightState, ac: Aircraft, f: Forces, cmd: EngineCommand, rate: number, rest: number): FlightState {
  const sink = -s.vz;
  const noseLow = wrapAngle(s.theta) < 0;
  const runway = onRunway(s.scenario, s.x);
  const forward = s.vx > 0;
  const gentle = sink <= ac.limits.gearSink_m_s;
  const t = s.t;
  if (runway && forward && !noseLow && gentle) {
    if (s.records.maxHeight_m < TAKEOFF_SCREEN_HEIGHT) {
      const rolling: FlightState = { ...s, phase: "ground", h: 0, vz: 0, theta: Math.min(ROTATION_LIMIT, Math.max(0, s.theta)), stall: null };
      return rest > 0 ? groundStep(rolling, ac, cmd, rate, rest) : rolling;
    }
    return ended(s, { kind: "landed", t, speed_m_s: f.speed_m_s, sink_m_s: sink });
  }
  if (s.stall) {
    const e = s.stall;
    return ended(s, { kind: "stall", t, speed_m_s: e.speed_m_s, height_m: e.height_m, mass_kg: e.mass_kg, stallSpeed_m_s: stallSpeed(ac, e.mass_kg, e.height_m) });
  }
  const contact = { t, speed_m_s: f.speed_m_s, theta: wrapAngle(s.theta), distance_m: distanceToRunway(s.scenario, s.x) };
  if (!forward) return ended(s, { kind: "crash", reason: "backwards", ...contact });
  if (!runway) return ended(s, { kind: "crash", reason: "off-runway", ...contact });
  if (noseLow) return ended(s, { kind: "crash", reason: "nose-low", ...contact });
  return ended(s, { kind: "hard-landing", t, sink_m_s: sink, limit_m_s: ac.limits.gearSink_m_s });
}

function airStep(s: FlightState, ac: Aircraft, cmd: EngineCommand, rate: number, dt: number): FlightState {
  const y0 = vecOf(s);
  const go = (tau: number): Advance => advance(ac, y0, false, s.engine, cmd, rate, tau);
  const full = go(dt);
  if (full.y[1] < 0 && full.y[3] < 0) {
    const tau = bisect(dt, (x) => go(x).y[1] < 0);
    const a = go(tau);
    const y: Vec = [a.y[0], 0, a.y[2], a.y[3], a.y[4], a.y[5]];
    const f = forcesAt(ac, y, false, a.output);
    const at = { ...withVec(s, y, s.t + tau, a.engine, a.output), records: records(s.records, f, y, s.t + tau, true) };
    return touchdown(at, ac, f, cmd, rate, dt - tau);
  }
  const f = forcesAt(ac, full.y, false, full.output);
  const next = withVec(s, full.y, s.t + dt, full.engine, full.output);
  let stall = s.stall;
  if (f.lift.stalled && !stall) stall = { t: next.t, speed_m_s: f.speed_m_s, height_m: full.y[1], mass_kg: f.mass_kg };
  else if (stall && !f.lift.stalled && full.y[3] >= 0) stall = null;
  return finishStep({ ...next, stall, records: records(s.records, f, full.y, next.t, true) }, ac, f, true);
}

/** Failures that do not depend on where the aircraft is: engine, wing, fuel. */
function finishStep(s: FlightState, ac: Aircraft, f: Forces, airborne: boolean): FlightState {
  const failure = s.engineOutput.failure;
  if (failure) return ended(s, { kind: "engine-failure", t: s.t, limitId: failure.limitId });
  if (airborne && f.loadFactor > ac.limits.maxLoadFactor) return ended(s, { kind: "wing-break", t: s.t, loadFactor: f.loadFactor, limit: ac.limits.maxLoadFactor, speed_m_s: f.speed_m_s });
  if (airborne && f.loadFactor < ac.limits.minLoadFactor) return ended(s, { kind: "wing-break", t: s.t, loadFactor: f.loadFactor, limit: ac.limits.minLoadFactor, speed_m_s: f.speed_m_s });
  if (s.fuel_kg <= 0) return ended(s, { kind: "out-of-fuel", t: s.t, distance_m: distanceToRunway(s.scenario, s.x) });
  return s;
}

/** Advances the flight by `dt` seconds. Pure. Once the flight has an outcome it returns the state unchanged. */
export function step(s: FlightState, c: Controls, ac: Aircraft, dt: number): FlightState {
  if (s.outcome) return s;
  const cmd: EngineCommand = { throttle: Math.min(1, Math.max(0, c.throttle)), afterburner: c.afterburner };
  const rate = Math.min(1, Math.max(-1, c.pitch)) * PITCH_RATE_LIMIT;
  return s.phase === "ground" ? groundStep(s, ac, cmd, rate, dt) : airStep(s, ac, cmd, rate, dt);
}

// ---------------------------------------------------------------------------
// What the page shows

export interface Observation extends Forces {
  readonly height_m: number;
  readonly theta: number;
  /** Fuel left over fuel loaded */
  readonly fuelFraction: number;
  readonly evidence: { readonly lift: FlightEvidence; readonly drag: FlightEvidence; readonly thrust: FlightEvidence; readonly weight: FlightEvidence };
  readonly warnings: { readonly nearStall: boolean; readonly wingLimit: boolean; readonly engineLimits: readonly EngineLimit[] };
  /** Force vectors in the earth frame (x forward, z up), N */
  readonly vectors: {
    readonly lift: readonly [number, number];
    readonly drag: readonly [number, number];
    readonly thrust: readonly [number, number];
    readonly weight: readonly [number, number];
    /** The sum of the four */
    readonly resultant: readonly [number, number];
  };
}

/** Forces, readouts, evidence and warnings at a state, for the page. Pure. */
export function observe(s: FlightState, ac: Aircraft): Observation {
  const onGround = s.phase === "ground";
  const f = forcesAt(ac, vecOf(s), onGround, s.engineOutput);
  const cg = Math.cos(f.gamma);
  const sg = Math.sin(f.gamma);
  const lv: [number, number] = [-f.lift_N * sg, f.lift_N * cg];
  const dv: [number, number] = [-f.drag_N * cg, -f.drag_N * sg];
  const tv: [number, number] = [f.thrust_N * Math.cos(s.theta), f.thrust_N * Math.sin(s.theta)];
  const wv: [number, number] = [0, -f.weight_N];
  const a = f.lift.angle;
  const warnAngle = f.lift.warningAlpha - f.lift.alpha0;
  const engineLimits = s.engineOutput.limits.filter((l) => l.fraction >= ENGINE_LIMIT_WARNING_FRACTION);
  return {
    ...f,
    height_m: s.h,
    theta: s.theta,
    fuelFraction: s.initialFuel_kg > 0 ? s.fuel_kg / s.initialFuel_kg : 0,
    evidence: {
      lift: f.lift.evidence,
      drag: f.drag.evidence,
      thrust: s.engineOutput.evidence,
      weight: weakest(ac.massEvidence, ac.engine.massEvidence),
    },
    warnings: {
      nearStall: !onGround && Math.abs(a) >= warnAngle,
      wingLimit: !onGround && (f.loadFactor >= WING_LIMIT_WARNING_FRACTION * ac.limits.maxLoadFactor || f.loadFactor <= WING_LIMIT_WARNING_FRACTION * ac.limits.minLoadFactor),
      engineLimits,
    },
    vectors: {
      lift: lv,
      drag: dv,
      thrust: tv,
      weight: wv,
      resultant: [lv[0] + dv[0] + tv[0] + wv[0], lv[1] + dv[1] + tv[1] + wv[1]],
    },
  };
}
