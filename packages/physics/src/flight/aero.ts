/**
 * Aerodynamic forces of the flying wing-body, from tables the caller supplies.
 *
 * The flight model does not read the measured data: it receives them
 * (brief 006, Amendment 1, point 1). `apps/web/src/flight/tables.ts` builds the
 * tables from the digitized NACA RM L52B08 dataset; the tests here use
 * synthetic tables.
 *
 * Lift: CL = a(M) (alpha - alpha0(M)) with the slope a and the zero-lift angle
 * alpha0 fitted to the measured symbols, up to the highest measured lift
 * coefficient at that Mach number. Beyond it there are no data and a declared
 * stall model takes over (Viterna and Corrigan), `estimated`.
 *
 * Drag at zero lift: the friction of the current model (parasite.ts) at the
 * flight Reynolds number, `estimated`, plus the measured rise of the NACA
 * faired curve, CD0(M) - CD0(0.50), `NACA faired`. Drag due to lift: the
 * current model, K (CL - CL_min)^2 (induced.ts, lift.ts).
 */

import type { WingBody } from "../geometry.ts";
import { inducedDragFactor, oswaldFitValid } from "../induced.ts";
import { liftCurveSlope, minimumDragCl } from "../lift.ts";
import { POLAR_CL_HALF_RANGE } from "../models.ts";
import { parasiteDrag, turbulentCf } from "../parasite.ts";

/** Classes of data of the evidence rules (docs/PROCESS.md, rule 1). */
export type DataClass = "measured" | "NACA faired" | "report text" | "computed" | "model";

/**
 * What the player is told about a value at an instant (docs/PROCESS.md, rule 9):
 * compared with measurements in this range, estimated, or beyond the data.
 */
export type FlightEvidence = "validated" | "estimated" | "no-data";

const RANK: Record<FlightEvidence, number> = { validated: 0, estimated: 1, "no-data": 2 };

/** The weaker of several evidence states. */
export function weakest(...states: FlightEvidence[]): FlightEvidence {
  return states.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "validated");
}

export interface MachPoint {
  readonly mach: number;
  readonly value: number;
}

export interface MachTable {
  /** Ascending in Mach number, at least one point */
  readonly points: readonly MachPoint[];
  readonly dataClass: DataClass;
  /** Document, figure and page, or the function that computed the values */
  readonly source: string;
}

/** Everything the flight model needs to know about one tested wing. */
export interface WingAeroTables {
  readonly wingId: string;
  /** Lift-curve slope dCL/dalpha, per radian */
  readonly liftSlope: MachTable;
  /**
   * Half the spread of the slope over the windows of angle of attack it can be
   * fitted on, as a fraction of the slope (brief 006: the fit depends on how
   * many points it takes). An uncertainty to report, never a value to use.
   */
  readonly liftSlopeSpread: MachTable;
  /** Angle of attack of zero lift, radians */
  readonly zeroLiftAlpha: MachTable;
  /** |CL| within which the slope was fitted to the measured symbols */
  readonly liftFitClLimit: number;
  /** Highest measured lift coefficient */
  readonly clMax: MachTable;
  /** Rise of the zero-lift drag over its value at `referenceMach` */
  readonly dragRise: MachTable & { readonly referenceMach: number };
  /** Mach intervals in which the source has no data (report text) */
  readonly gaps: readonly (readonly [number, number])[];
  /**
   * A lift value within this Mach distance of a Mach number where the slope
   * was measured counts as compared with measurements (if no gap is crossed).
   */
  readonly machTolerance: number;
}

/** Where a Mach number falls in a table. */
export type Placement = "at" | "between" | "gap" | "below" | "above";

export interface Lookup {
  readonly value: number;
  readonly placement: Placement;
}

function inGap(gaps: WingAeroTables["gaps"], m: number): boolean {
  return gaps.some(([lo, hi]) => m >= lo && m <= hi);
}

function crossesGap(gaps: WingAeroTables["gaps"], a: number, b: number): boolean {
  return gaps.some(([lo, hi]) => a < hi && b > lo);
}

/**
 * Value of a table at a Mach number. Inside the sampled range it is joined by
 * straight lines between neighbouring samples; outside it holds the end value
 * (brief 006: "se mantiene el último incremento"). An interval whose ends lie
 * on either side of a gap is a straight join across the gap: "gap".
 */
export function lookup(t: MachTable, mach: number, gaps: WingAeroTables["gaps"], tolerance = 0): Lookup {
  const p = t.points;
  const first = p[0]!;
  const last = p[p.length - 1]!;
  if (mach < first.mach) return { value: first.value, placement: "below" };
  if (mach > last.mach) return { value: last.value, placement: "above" };
  let i = 0;
  while (i < p.length - 2 && mach > p[i + 1]!.mach) i++;
  const a = p[i]!;
  const b = p[Math.min(i + 1, p.length - 1)]!;
  const f = b.mach > a.mach ? (mach - a.mach) / (b.mach - a.mach) : 0;
  const value = a.value + f * (b.value - a.value);
  if (inGap(gaps, mach)) return { value, placement: "gap" };
  if (Math.abs(mach - a.mach) <= tolerance || Math.abs(mach - b.mach) <= tolerance) return { value, placement: "at" };
  if (crossesGap(gaps, a.mach, b.mach)) return { value, placement: "gap" };
  return { value, placement: "between" };
}

/** Throws if a table cannot be used; called once when an aircraft is made, never in a time step. */
export function checkTables(t: WingAeroTables): void {
  const tables: [string, MachTable][] = [
    ["liftSlope", t.liftSlope],
    ["liftSlopeSpread", t.liftSlopeSpread],
    ["zeroLiftAlpha", t.zeroLiftAlpha],
    ["clMax", t.clMax],
    ["dragRise", t.dragRise],
  ];
  for (const [name, table] of tables) {
    if (!table.points.length) throw new Error(`${t.wingId}: table ${name} is empty`);
    for (let i = 0; i < table.points.length; i++) {
      const pt = table.points[i]!;
      if (!Number.isFinite(pt.mach) || !Number.isFinite(pt.value)) throw new Error(`${t.wingId}: table ${name} has a value that is not finite`);
      if (i > 0 && pt.mach <= table.points[i - 1]!.mach) throw new Error(`${t.wingId}: table ${name} is not in ascending Mach order`);
    }
  }
  if (t.liftSlope.points.some((pt) => pt.value <= 0)) throw new Error(`${t.wingId}: lift-curve slope must be positive`);
  if (t.clMax.points.some((pt) => pt.value <= 0)) throw new Error(`${t.wingId}: highest lift coefficient must be positive`);
}

// ---------------------------------------------------------------------------
// Stall model

/**
 * Viterna and Corrigan's post-stall extension, matched to the lift and drag
 * at the stall angle so that both are continuous there:
 *   CD_max = 1.11 + 0.018 A
 *   CL = (CD_max / 2) sin 2a + K_L cos^2 a / sin a,  K_L = (CL_s - CD_max sin a_s cos a_s) sin a_s / cos^2 a_s
 *   CD = CD_max sin^2 a + K_D cos a,                K_D = (CD_s - CD_max sin^2 a_s) / cos a_s
 * for a_s <= a <= 90 deg. Written for wind-turbine blades; here it stands for
 * the separated flow above the highest measured lift, and it is `estimated`.
 * Angles are measured from zero lift, a declared simplification.
 */
export function viterna(alpha: number, alphaStall: number, clStall: number, cdStall: number, aspectRatio: number): { cl: number; cd: number } {
  // UNVERIFIED: check against L. A. Viterna and R. D. Corrigan, NASA CP-2230 (1982), and the AeroDyn theory manual (NREL).
  const cdMax = 1.11 + 0.018 * aspectRatio;
  const ss = Math.sin(alphaStall);
  const cs = Math.cos(alphaStall);
  const kl = ((clStall - cdMax * ss * cs) * ss) / (cs * cs);
  const kd = (cdStall - cdMax * ss * ss) / cs;
  const sa = Math.sin(alpha);
  const ca = Math.cos(alpha);
  return { cl: (cdMax / 2) * Math.sin(2 * alpha) + (kl * ca * ca) / sa, cd: cdMax * sa * sa + kd * ca };
}

/** Angle wrapped to (-pi, pi]. */
export function wrapAngle(a: number): number {
  const t = Math.PI * 2;
  let r = a % t;
  if (r <= -Math.PI) r += t;
  if (r > Math.PI) r -= t;
  return r;
}

// ---------------------------------------------------------------------------
// Lift

export interface LiftState {
  readonly cl: number;
  /** Angle of attack measured from zero lift, alpha - alpha0, wrapped to (-pi, pi] */
  readonly angle: number;
  /** Lift-curve slope in use, per radian */
  readonly slope: number;
  /** Zero-lift angle of attack, radians */
  readonly alpha0: number;
  readonly clMax: number;
  /** Angle of attack at which the linear lift reaches clMax, radians (positive side) */
  readonly stallAlpha: number;
  /** Angle of attack at which the stall warning starts, radians (see STALL_WARNING_SPEED_MARGIN) */
  readonly warningAlpha: number;
  /** |alpha - alpha0| beyond the stall angle: the declared stall model is in use */
  readonly stalled: boolean;
  /** Beyond 90 degrees from zero lift: the air comes from behind the wing */
  readonly reversed: boolean;
  readonly evidence: FlightEvidence;
}

/**
 * Speed margin of the stall warning: it starts at a speed 5 percent above the
 * stall, the larger of the two margins of 14 CFR 25.207(c) (5 knots or 5
 * percent) at fighter speeds. At constant weight that is a lift coefficient
 * of CL_max / 1.05^2.
 */
// UNVERIFIED: check the wording of 14 CFR 25.207(c) (eCFR).
export const STALL_WARNING_SPEED_MARGIN = 1.05;

export function liftSlopeAt(aero: WingAeroTables, wing: WingBody, mach: number): { slope: number; placement: Placement } {
  const s = lookup(aero.liftSlope, mach, aero.gaps, aero.machTolerance);
  if (s.placement !== "below") return { slope: s.value, placement: s.placement };
  // Below the lowest measured Mach number: the measured slope there, scaled by
  // the model's own compressibility (Helmbold with Prandtl-Glauert, lift.ts).
  const m0 = aero.liftSlope.points[0]!.mach;
  const ratio = liftCurveSlope(wing, Math.max(0, mach)).perRad / liftCurveSlope(wing, m0).perRad;
  return { slope: s.value * ratio, placement: "below" };
}

function liftEvidence(placement: Placement, cl: number, fitLimit: number): FlightEvidence {
  if (placement === "gap" || placement === "above") return "no-data";
  if (placement === "at" && Math.abs(cl) <= fitLimit) return "validated";
  return "estimated";
}

/** Lift coefficient at a Mach number and angle of attack, with the stall model beyond the data. */
export function lift(aero: WingAeroTables, wing: WingBody, mach: number, alpha: number): LiftState {
  const { slope, placement } = liftSlopeAt(aero, wing, mach);
  const alpha0 = lookup(aero.zeroLiftAlpha, mach, aero.gaps).value;
  const clMax = lookup(aero.clMax, mach, aero.gaps).value;
  const stallAngle = clMax / slope;
  const stallAlpha = alpha0 + stallAngle;
  const warningAlpha = alpha0 + stallAngle / (STALL_WARNING_SPEED_MARGIN * STALL_WARNING_SPEED_MARGIN);
  const a = wrapAngle(alpha - alpha0);
  const abs = Math.abs(a);
  const base = { angle: a, slope, alpha0, clMax, stallAlpha, warningAlpha };
  if (abs <= stallAngle) {
    const cl = slope * a;
    return { ...base, cl, stalled: false, reversed: false, evidence: liftEvidence(placement, cl, aero.liftFitClLimit) };
  }
  // Separated flow: the lift of the declared stall model (its drag is in `drag`).
  const reversed = abs > Math.PI / 2;
  const folded = reversed ? Math.PI - abs : abs;
  const sign = Math.sign(a) * (reversed ? -1 : 1);
  // The matching drag at the stall angle does not change the lift of the model, so 0 is passed here.
  const cl = folded <= stallAngle ? slope * folded : viterna(folded, stallAngle, clMax, 0, wing.planform.aspectRatio).cl;
  return { ...base, cl: sign * cl, stalled: true, reversed, evidence: reversed ? "no-data" : weakest("estimated", liftEvidence(placement, cl, Infinity)) };
}

// ---------------------------------------------------------------------------
// Drag

/** Lowest Reynolds number at which the turbulent friction formula is evaluated (the formula is for turbulent plates). */
export const FRICTION_MIN_REYNOLDS = 1e5;

export interface FlightGeometry {
  /** Mean aerodynamic chord of the full-size aircraft, m */
  readonly mac_m: number;
  /** Body length of the full-size aircraft, m */
  readonly bodyLength_m: number;
}

export interface DragParts {
  /** Skin friction and form drag of wing and body at the flight Reynolds number */
  readonly friction: number;
  /** Measured rise of the zero-lift drag over its value at M 0.50 */
  readonly rise: number;
  /** Drag due to lift of the attached-flow polar */
  readonly induced: number;
}

export interface DragState {
  readonly cd: number;
  readonly parts: DragParts;
  readonly evidence: FlightEvidence;
  readonly frictionEvidence: FlightEvidence;
  readonly riseEvidence: FlightEvidence;
  readonly inducedEvidence: FlightEvidence;
}

/**
 * The friction term of the current model (parasite.ts, Raymer form factor,
 * turbulent boundary layer) with its skin friction re-evaluated at the flight
 * Reynolds number: the form factors and the wetted areas over the reference
 * area do not change with scale, only the friction coefficient does.
 */
export function flightFriction(wing: WingBody, geom: FlightGeometry, mach: number, reynoldsPerMetre: number): number {
  const tunnel = parasiteDrag(wing, mach);
  const reWing = Math.max(FRICTION_MIN_REYNOLDS, reynoldsPerMetre * geom.mac_m);
  const reBody = Math.max(FRICTION_MIN_REYNOLDS, reynoldsPerMetre * geom.bodyLength_m);
  return (tunnel.wing * turbulentCf(reWing, mach)) / tunnel.wingCf + (tunnel.body * turbulentCf(reBody, mach)) / tunnel.bodyCf;
}

function riseEvidence(p: Placement): FlightEvidence {
  if (p === "gap" || p === "above") return "no-data";
  if (p === "below") return "estimated";
  return "validated";
}

/** Drag coefficient at a Mach number and Reynolds number per metre, for a lift state from `lift`. */
export function drag(aero: WingAeroTables, wing: WingBody, geom: FlightGeometry, mach: number, reynoldsPerMetre: number, l: LiftState): DragState {
  const friction = flightFriction(wing, geom, mach, reynoldsPerMetre);
  const r = lookup(aero.dragRise, mach, aero.gaps);
  const k = inducedDragFactor(wing.planform);
  const clMin = minimumDragCl(wing, mach);
  const polar = (cl: number): number => friction + r.value + k * (cl - clMin) ** 2;
  const fe: FlightEvidence = "estimated";
  const re = riseEvidence(r.placement);
  if (!l.stalled) {
    const induced = k * (l.cl - clMin) ** 2;
    const ie: FlightEvidence = Math.abs(l.cl - clMin) <= POLAR_CL_HALF_RANGE && oswaldFitValid(wing.planform) ? "validated" : "estimated";
    return {
      cd: friction + r.value + induced,
      parts: { friction, rise: r.value, induced },
      evidence: weakest(fe, re, ie),
      frictionEvidence: fe,
      riseEvidence: re,
      inducedEvidence: ie,
    };
  }
  // Separated flow: Viterna and Corrigan's drag, matched to the polar at the
  // stall angle on the side (positive or negative lift) where the wing stalled.
  const stallAngle = l.clMax / l.slope;
  const abs = Math.abs(l.angle);
  const reversed = abs > Math.PI / 2;
  const folded = reversed ? Math.PI - abs : abs;
  const side = Math.sign(l.angle) * (reversed ? -1 : 1) || 1;
  const cdStall = polar(side * l.clMax);
  const cd = folded <= stallAngle ? polar(side * l.slope * folded) : viterna(folded, stallAngle, l.clMax, cdStall, wing.planform.aspectRatio).cd;
  const induced = cd - friction - r.value;
  return {
    cd,
    parts: { friction, rise: r.value, induced },
    evidence: weakest(fe, re, "estimated", l.reversed ? "no-data" : "estimated"),
    frictionEvidence: fe,
    riseEvidence: re,
    inducedEvidence: "estimated",
  };
}
