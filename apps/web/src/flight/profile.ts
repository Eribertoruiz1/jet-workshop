/**
 * The aircraft seen from the side, from its real geometry (brief 006,
 * "Dirección de arte"): the tested body (tangent-ogive nose and cylinder)
 * and the chosen wing, scaled to the aircraft. Coordinates in metres, origin
 * at the nose tip, x aft along the body axis, z up.
 *
 * The wing has no dihedral and sits on the body axis, so from the side it
 * is a thin band from the root's leading edge to the tip's trailing edge;
 * the root and tip sections are drawn so the sweep shows. The section shape
 * is drawn with the NACA four-digit thickness formula at 4 percent: a
 * drawing, not the tested 65A section.
 */

import { geometry, sweepAtDeg, type WingBody } from "@jet-workshop/physics";
import { NOSE_OGIVE_RADIUS_IN, ogiveRadius, type Aircraft } from "@jet-workshop/physics/flight";

export type Point = readonly [number, number];

export interface Profile {
  /** Closed outline of the body */
  readonly body: readonly Point[];
  /** Closed outline of the root section (at the body side) */
  readonly root: readonly Point[];
  /** Closed outline of the tip section */
  readonly tip: readonly Point[];
  readonly length_m: number;
  readonly span_m: number;
}

const DEG = Math.PI / 180;

function section(xLe: number, chord: number, thickness: number, n = 24): Point[] {
  const upper: Point[] = [];
  const lower: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos((Math.PI * i) / n)) / 2;
    const yt = 5 * thickness * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4) * chord;
    upper.push([xLe + x * chord, yt]);
    lower.push([xLe + x * chord, -yt]);
  }
  return [...upper, ...lower.reverse()];
}

/** Side-view outlines of an aircraft made from a tested wing-body. */
export function profile(ac: Aircraft): Profile {
  const w: WingBody = ac.wing;
  const k = ac.bodyLength_m / w.body.lengthIn; // metres per tunnel inch on this aircraft
  const r = w.body.diameterIn / 2;
  const body: Point[] = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const x = (w.body.noseLengthIn * i) / n;
    body.push([x * k, ogiveRadius(x, w.body.noseLengthIn, r, NOSE_OGIVE_RADIUS_IN) * k]);
  }
  body.push([w.body.lengthIn * k, r * k]);
  body.push([w.body.lengthIn * k, -r * k]);
  for (let i = n; i >= 0; i--) {
    const x = (w.body.noseLengthIn * i) / n;
    body.push([x * k, -ogiveRadius(x, w.body.noseLengthIn, r, NOSE_OGIVE_RADIUS_IN) * k]);
  }
  const g = geometry(w);
  const tanLe = Math.tan(sweepAtDeg(w.planform, 0) * DEG);
  const t = w.planform.thicknessRatio;
  const rootLe = ac.apexStation_m + r * k * tanLe;
  const tipLe = ac.apexStation_m + (g.spanIn / 2) * k * tanLe;
  return {
    body,
    root: section(rootLe, g.sideChordIn * k, t),
    tip: section(tipLe, g.tipChordIn * k, t),
    length_m: ac.bodyLength_m,
    span_m: ac.span_m,
  };
}

/** Half-planform of the wing seen from above, in tunnel inches, for the wing buttons: [y, x] pairs. */
export function halfPlanform(w: WingBody): Point[] {
  const g = geometry(w);
  const half = g.spanIn / 2;
  const tipLe = half * Math.tan(sweepAtDeg(w.planform, 0) * DEG);
  return [
    [0, 0],
    [half, tipLe],
    [half, tipLe + g.tipChordIn],
    [0, g.rootChordIn],
  ];
}
