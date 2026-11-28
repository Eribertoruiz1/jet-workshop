/**
 * The aerodynamic tables the flight model flies with, built from the
 * digitized NACA RM L52B08 dataset (brief 006, Amendment 1, point 1).
 *
 * - Lift-curve slope: `measuredLiftSlope` of the validation package, the
 *   least-squares slope through the measured symbols with |CL| <= 0.3, at
 *   each test Mach number. `computed` (a slope fitted to measured symbols is
 *   not itself measured).
 * - Zero-lift angle: the intercept of the same least-squares line. `computed`.
 * - Highest lift coefficient: the largest measured CL at each test Mach
 *   number. `measured`. Above it there are no data.
 * - Drag rise: the NACA faired zero-lift drag curve, CD0(M) - CD0(0.50).
 *   `NACA faired`.
 * - The window of angles the slope is fitted on changes it (brief 006): the
 *   half-spread over the windows is kept as an uncertainty, never used.
 *
 * Nothing is smoothed, and no measured point is interpolated: the flight
 * model joins the table entries in Mach number and labels what it joins.
 */

import { BASELINE_REFERENCE_MACH, bielatWing, type TestedWingId } from "@jet-workshop/physics";
import type { MachPoint, MachTable, WingAeroTables } from "@jet-workshop/physics/flight";
import { LOW_LIFT, measuredLiftSlope, type Dataset, type LiftPoint } from "@jet-workshop/validation";

const DEG = Math.PI / 180;

export const REPORT = "NACA RM L52B08 (Bielat, 1952)";

/** Year of the report: the wings "NACA measured in 1952". `report text`, title page of NACA RM L52B08. */
export const REPORT_YEAR = 1952;

/**
 * No data between these Mach numbers: "no data were taken in the range of
 * Mach numbers from 1.04 to 1.08" (reflected shock waves), NACA RM L52B08,
 * p. 6 (PDF p. 8). `report text`.
 */
export const REPORT_GAP: readonly [number, number] = [1.04, 1.08];

/**
 * Windows of angle of attack, degrees, over which the slope's dependence on
 * the window is measured: the four of lane A's lesson (docs/cp/002.md on
 * lane/lesson, step 6), with every tested angle as the last.
 */
export const SLOPE_WINDOWS_DEG = [2.5, 4.5, 6.5, Number.POSITIVE_INFINITY] as const;

/**
 * Half the width of the Mach segments of the wing bench's reliability strip
 * (packages/validation, SEGMENT_EDGES, 0.05 wide): a lift value this close
 * to a test Mach number counts as at it.
 */
export const MACH_TOLERANCE = 0.025;

export const TESTED_WINGS: readonly TestedWingId[] = ["10.8", "35", "47"];

/** Least-squares zero-lift angle (degrees) through the same symbols `measuredLiftSlope` fits. */
export function zeroLiftAngleDeg(points: LiftPoint[], limit = LOW_LIFT): number | null {
  const v = points.filter((p) => Math.abs(p.cl) <= limit);
  const fit = measuredLiftSlope(points, limit);
  if (!fit) return null;
  const ma = v.reduce((a, p) => a + p.alpha, 0) / v.length;
  const mc = v.reduce((a, p) => a + p.cl, 0) / v.length;
  return ma - mc / fit.slope;
}

/** Slope (per degree) through the symbols within each window of angle of attack; null where a window has fewer than three symbols. */
export function slopeByWindow(points: LiftPoint[]): (number | null)[] {
  return SLOPE_WINDOWS_DEG.map((w) => measuredLiftSlope(points.filter((p) => Math.abs(p.alpha) <= w), Number.POSITIVE_INFINITY)?.slope ?? null);
}

function table(points: MachPoint[], dataClass: MachTable["dataClass"], source: string): MachTable {
  return { points, dataClass, source };
}

/** The tables of one tested wing. Throws if the dataset lacks what the flight needs. */
export function wingTables(data: Dataset, wing: TestedWingId): WingAeroTables {
  const lift = data.lift.filter((p) => p.wing === wing);
  const machs = [...new Set(lift.map((p) => p.mach))].sort((a, b) => a - b);
  const slope: MachPoint[] = [];
  const spread: MachPoint[] = [];
  const alpha0: MachPoint[] = [];
  const clMax: MachPoint[] = [];
  for (const mach of machs) {
    const at = lift.filter((p) => p.mach === mach);
    // The highest lift is a measured symbol at every test Mach number.
    clMax.push({ mach, value: Math.max(...at.map((p) => p.cl)) });
    // The slope needs three symbols with |CL| <= 0.3 (measuredLiftSlope); where there
    // are fewer, that Mach number has no slope and the model joins its neighbours.
    const fit = measuredLiftSlope(at);
    const a0 = zeroLiftAngleDeg(at);
    if (!fit || a0 === null) continue;
    slope.push({ mach, value: fit.slope / DEG });
    alpha0.push({ mach, value: a0 * DEG });
    const windows = slopeByWindow(at).filter((s): s is number => s !== null);
    spread.push({ mach, value: windows.length > 1 ? (Math.max(...windows) - Math.min(...windows)) / 2 / fit.slope : 0 });
  }
  const faired = data.faired.filter((s) => s.wing === wing).sort((a, b) => a.mach - b.mach);
  const reference = faired.find((s) => s.mach === BASELINE_REFERENCE_MACH);
  if (!slope.length || !reference) throw new Error(`wing ${wing}: the dataset lacks lift symbols or the faired curve at M ${BASELINE_REFERENCE_MACH}`);
  const rise = faired.filter((s) => s.mach >= BASELINE_REFERENCE_MACH).map((s) => ({ mach: s.mach, value: s.cd0 - reference.cd0 }));
  return {
    wingId: wing,
    liftSlope: table(slope, "computed", `${REPORT}, figures 5(a) to 7(a): measuredLiftSlope, |CL| <= ${LOW_LIFT}`),
    liftSlopeSpread: table(spread, "computed", `half-spread of the slope over windows of |alpha| <= ${SLOPE_WINDOWS_DEG.join(", ")} deg`),
    zeroLiftAlpha: table(alpha0, "computed", `${REPORT}, figures 5(a) to 7(a): intercept of the same fit`),
    liftFitClLimit: LOW_LIFT,
    clMax: table(clMax, "measured", `${REPORT}, figures 5(a) to 7(a): highest measured CL at each Mach number`),
    dragRise: { ...table(rise, "NACA faired", `${REPORT}, figure 9: CD0(M) - CD0(${BASELINE_REFERENCE_MACH})`), referenceMach: BASELINE_REFERENCE_MACH },
    gaps: [REPORT_GAP],
    machTolerance: MACH_TOLERANCE,
  };
}

/** The tables of the three tested wings. */
export function allWingTables(data: Dataset): Record<TestedWingId, WingAeroTables> {
  return { "10.8": wingTables(data, "10.8"), "35": wingTables(data, "35"), "47": wingTables(data, "47") };
}

/** The tested wing-body geometry (tunnel model, inches). */
export const wingBody = bielatWing;
