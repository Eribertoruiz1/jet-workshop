/**
 * Wing-body geometry.
 *
 * Lengths are in inches and areas in square inches, as in NACA RM L52B08.
 * Every aerodynamic coefficient in this package uses the report's reference
 * area: the trapezoidal wing carried to the centreline (1.143 sq ft for the
 * tested models), and its mean aerodynamic chord.
 */

export interface Planform {
  /** A = b^2 / S */
  aspectRatio: number;
  /** lambda = c_tip / c_root */
  taperRatio: number;
  /** Sweep of the quarter-chord line, degrees */
  sweepQuarterChordDeg: number;
  /** Streamwise thickness ratio t/c */
  thicknessRatio: number;
  /** Reference area S, square inches (trapezoid carried to the centreline) */
  areaIn2: number;
}

export interface Airfoil {
  /** Chordwise position of maximum thickness, x/c */
  maxThicknessX: number;
  /** Zero-lift angle of the section, degrees (negative for positive camber) */
  zeroLiftAngleDeg: number;
  /** Angle at which the mean line works at its design condition, degrees */
  idealAngleDeg: number;
  /** eta = section lift-curve slope / (2 pi), incompressible */
  liftSlopeEfficiency: number;
  /** Area of the section as a fraction of t * c^2 */
  areaFactor: number;
}

export interface Body {
  diameterIn: number;
  lengthIn: number;
  noseLengthIn: number;
}

export interface WingBody {
  planform: Planform;
  airfoil: Airfoil;
  body: Body;
}

const DEG = Math.PI / 180;

/** Reference area of the tested models: 1.143 sq ft (figure 3), in square inches. */
export const BIELAT_AREA_IN2 = 1.143 * 144;

/** Body of the tested models (figure 3): cylinder with an ogive nose. */
export const BIELAT_BODY: Body = { diameterIn: 2.25, lengthIn: 25.15, noseLengthIn: 6.61 };

/**
 * Section of the tested models: NACA 65A-series thickness, 4 percent thick,
 * with a mean line made of 1/3 of the NACA 230-series line plus the NACA
 * 6-series uniform-load line (a = 1.0) for cl_i = 0.1 (figure 3).
 *
 * Zero-lift angle: the a = 1.0 line gives -cl_i / (2 pi) rad = -0.912 deg
 * exactly in thin-airfoil theory; 1/3 of the 230 line adds about -0.40 deg.
 * Ideal angle: 0 for the a = 1.0 line, small for the 230 line.
 */
export const BIELAT_AIRFOIL: Airfoil = {
  maxThicknessX: 0.4,
  // UNVERIFIED: check the 230 mean-line zero-lift angle against Abbott & von Doenhoff, Theory of Wing Sections.
  zeroLiftAngleDeg: -(0.1 / (2 * Math.PI)) / DEG - 0.4,
  idealAngleDeg: 0,
  liftSlopeEfficiency: 0.95,
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  areaFactor: 0.685,
};

export type TestedWingId = "10.8" | "35" | "47";

export const TESTED_SWEEPS: Record<TestedWingId, number> = { "10.8": 10.8, "35": 35, "47": 47 };

/** One of the three wing-body models of NACA RM L52B08. */
export function bielatWing(id: TestedWingId): WingBody {
  return {
    planform: {
      aspectRatio: 3.5,
      taperRatio: 0.2,
      sweepQuarterChordDeg: TESTED_SWEEPS[id],
      thicknessRatio: 0.04,
      areaIn2: BIELAT_AREA_IN2,
    },
    airfoil: BIELAT_AIRFOIL,
    body: BIELAT_BODY,
  };
}

/** Which tested wing, if any, this geometry is (same planform within tolerance). */
export function matchTestedWing(w: WingBody): TestedWingId | null {
  const p = w.planform;
  if (Math.abs(p.aspectRatio - 3.5) > 0.01 || Math.abs(p.taperRatio - 0.2) > 0.001) return null;
  if (Math.abs(p.thicknessRatio - 0.04) > 0.0005 || Math.abs(p.areaIn2 - BIELAT_AREA_IN2) > 0.5) return null;
  for (const id of Object.keys(TESTED_SWEEPS) as TestedWingId[]) {
    if (Math.abs(p.sweepQuarterChordDeg - TESTED_SWEEPS[id]) < 0.05) return id;
  }
  return null;
}

export interface DerivedGeometry {
  spanIn: number;
  rootChordIn: number;
  tipChordIn: number;
  macIn: number;
  macSpanwiseIn: number;
  exposedAreaIn2: number;
  /** Chord where the wing meets the body side */
  sideChordIn: number;
}

export function chordAt(p: Planform, yIn: number): number {
  const g = derive(p);
  return g.rootChordIn * (1 - ((1 - p.taperRatio) * 2 * Math.abs(yIn)) / g.spanIn);
}

function derive(p: Planform): Omit<DerivedGeometry, "exposedAreaIn2" | "sideChordIn"> {
  const span = Math.sqrt(p.aspectRatio * p.areaIn2);
  const root = (2 * p.areaIn2) / (span * (1 + p.taperRatio));
  const l = p.taperRatio;
  return {
    spanIn: span,
    rootChordIn: root,
    tipChordIn: l * root,
    macIn: ((2 / 3) * root * (1 + l + l * l)) / (1 + l),
    macSpanwiseIn: ((span / 6) * (1 + 2 * l)) / (1 + l),
  };
}

export function geometry(w: WingBody): DerivedGeometry {
  const g = derive(w.planform);
  const halfBody = w.body.diameterIn / 2;
  const side = chordAt(w.planform, halfBody);
  const hidden = w.body.diameterIn * (g.rootChordIn + side) / 2;
  return { ...g, exposedAreaIn2: w.planform.areaIn2 - hidden, sideChordIn: side };
}

/**
 * Sweep of the n-chord line (n = 0 leading edge, 0.5 mid-chord, 1 trailing edge), degrees.
 * tan(L_n) = tan(L_m) - (4/A) (n - m) (1 - lambda) / (1 + lambda), with m = 0.25.
 */
export function sweepAtDeg(p: Planform, n: number): number {
  // UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.
  const t = Math.tan(p.sweepQuarterChordDeg * DEG) - (4 / p.aspectRatio) * (n - 0.25) * (1 - p.taperRatio) / (1 + p.taperRatio);
  return Math.atan(t) / DEG;
}

export interface Strip {
  /** Spanwise centre of the strip, inches from the plane of symmetry */
  yIn: number;
  chordIn: number;
  /** Area of the strip on both sides of the body, square inches */
  areaIn2: number;
  /** eta = 2y/b */
  eta: number;
}

/** Exposed wing (body side to tip) cut into n strips of equal span. */
export function strips(w: WingBody, n = 20): Strip[] {
  const g = geometry(w);
  const y0 = w.body.diameterIn / 2;
  const dy = (g.spanIn / 2 - y0) / n;
  const out: Strip[] = [];
  for (let i = 0; i < n; i++) {
    const y = y0 + (i + 0.5) * dy;
    const c = chordAt(w.planform, y);
    out.push({ yIn: y, chordIn: c, areaIn2: 2 * c * dy, eta: (2 * y) / g.spanIn });
  }
  return out;
}
