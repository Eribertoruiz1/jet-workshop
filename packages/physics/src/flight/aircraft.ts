/**
 * The aircraft: the wing-body of NACA RM L52B08 scaled geometrically to the
 * wing area the player chooses, with a structure, an engine and fuel.
 *
 * Nothing here is measured. The mass rule, the fuel capacity and the limits
 * are declared constants, `estimated`, each with the source it was taken
 * from or the UNVERIFIED marker (docs/cp/006.md lists them).
 */

import { geometry, sweepAtDeg, type WingBody } from "../geometry.ts";
import type { Evidence, EngineModel } from "../propulsion/contract.ts";
import { checkTables, drag, lift, type DragState, type FlightGeometry, type LiftState, type WingAeroTables } from "./aero.ts";
import { M_PER_FT, scaleFactor, scaledLength } from "./units.ts";

/**
 * Mass of everything that is not engine or fuel, per square metre of wing:
 * structure, systems, gear. Scales with the square of size, like the skin.
 * `estimated`. Declared before the comparison and not fitted to it: empty
 * mass less engine dry mass, over wing area, is 134 kg/m^2 for the F-86F and
 * 136 kg/m^2 for the MiG-15bis (docs/cp/006.md gives the figures and sources).
 */
export const STRUCTURE_MASS_PER_WING_AREA = 150;

/** Density of jet fuel, kg/m^3 (kerosene, about 0.8 kg per litre). */
// UNVERIFIED: check against a public fuel specification (for example the density range of ASTM D1655 Jet A).
export const FUEL_DENSITY = 800;

/**
 * Share of the body volume that holds fuel. The rest is engine, inlet duct,
 * cockpit, gear bays and equipment. `estimated`, compared in order of
 * magnitude with the internal fuel of real aircraft in docs/cp/006.md.
 */
export const FUEL_VOLUME_FRACTION = 0.3;

/**
 * Limit load factors of a fighter: +7.33 g and -3.0 g at the basic flight
 * design weight (MIL-A-8861, fighter and attack class). The wing breaks
 * when the lift load factor goes beyond either.
 */
// UNVERIFIED: check against MIL-A-8861B (Airplane Strength and Rigidity, Flight Loads), table of limit load factors.
export const MAX_LOAD_FACTOR = 7.33;
export const MIN_LOAD_FACTOR = -3.0;

/**
 * Sink speed the landing gear takes: 10 ft/s, "a limit descent velocity of
 * 10 fps at the design landing weight", 14 CFR 25.473(a)(2). A civil
 * transport rule standing in for the fighter's own, `report text`
 * (Cornell LII e-CFR, read on 16 November 2026).
 */
export const GEAR_SINK_LIMIT = 10 * M_PER_FT;

/** Tangent-ogive radius of the nose of the tested body, inches (NACA RM L51I04a figure 3, packages/validation/README.md). */
export const NOSE_OGIVE_RADIUS_IN = 20;

/**
 * Station of the quarter-chord point of the mean aerodynamic chord, inches
 * from the nose: the same for every wing of the series (RM L51K16a, "always
 * at the same body station"; docs/studies/heldout-geometry.md, computed from
 * the 47 deg wing). Used only to draw the aircraft.
 */
export const MAC_QUARTER_CHORD_STATION_IN = 16.61;

export interface Limits {
  readonly maxLoadFactor: number;
  readonly minLoadFactor: number;
  /** Sink speed the gear takes, m/s */
  readonly gearSink_m_s: number;
}

export interface AircraftDesign {
  /** The tested wing-body, in the units of the tunnel model (inches) */
  readonly wing: WingBody;
  readonly aero: WingAeroTables;
  /** Reference wing area of the full-size aircraft, m^2 */
  readonly wingArea_m2: number;
  readonly engine: EngineModel;
}

/**
 * Lift and drag coefficients at a Mach number, angle of attack (rad) and
 * Reynolds number per metre. `makeAircraft` sets the one built from the
 * wing's tables (aero.ts); a test can replace it, for example to fly without
 * drag (brief 006, check 1).
 */
export type Aerodynamics = (mach: number, alpha: number, reynoldsPerMetre: number) => { readonly lift: LiftState; readonly drag: DragState };

export interface Aircraft extends FlightGeometry {
  readonly wingId: string;
  readonly aerodynamics: Aerodynamics;
  readonly wing: WingBody;
  readonly aero: WingAeroTables;
  /** Length scale from the tunnel model */
  readonly scale: number;
  readonly wingArea_m2: number;
  readonly span_m: number;
  readonly rootChord_m: number;
  readonly tipChord_m: number;
  readonly bodyDiameter_m: number;
  readonly noseLength_m: number;
  /** Leading-edge sweep, degrees */
  readonly leadingEdgeSweepDeg: number;
  /** Distance from the nose to the wing apex (leading edge carried to the centre line), m; for drawing */
  readonly apexStation_m: number;
  readonly bodyVolume_m3: number;
  readonly structureMass_kg: number;
  readonly fuelCapacity_kg: number;
  /** Structure and engine */
  readonly emptyMass_kg: number;
  readonly massEvidence: Evidence;
  readonly engine: EngineModel;
  readonly limits: Limits;
}

/** Radius of a tangent ogive nose at distance x from its tip, inches. */
export function ogiveRadius(xIn: number, noseLengthIn: number, bodyRadiusIn: number, ogiveRadiusIn: number): number {
  const d = noseLengthIn - Math.min(Math.max(xIn, 0), noseLengthIn);
  return Math.sqrt(ogiveRadiusIn * ogiveRadiusIn - d * d) + bodyRadiusIn - ogiveRadiusIn;
}

/** Volume of the tested body (tangent-ogive nose and cylinder), cubic inches, by Simpson's rule on the nose. */
export function bodyVolumeIn3(w: WingBody, ogiveRadiusIn = NOSE_OGIVE_RADIUS_IN): number {
  const b = w.body;
  const r = b.diameterIn / 2;
  const n = 200;
  const h = b.noseLengthIn / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const ri = ogiveRadius(i * h, b.noseLengthIn, r, ogiveRadiusIn);
    s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * Math.PI * ri * ri;
  }
  return (s * h) / 3 + Math.PI * r * r * (b.lengthIn - b.noseLengthIn);
}

export function makeAircraft(d: AircraftDesign): Aircraft {
  checkTables(d.aero);
  if (!(d.wingArea_m2 > 0)) throw new RangeError("wing area must be positive");
  const k = scaleFactor(d.wing.planform.areaIn2, d.wingArea_m2);
  const g = geometry(d.wing);
  const L = (inches: number): number => scaledLength(inches, k);
  const volume = bodyVolumeIn3(d.wing) * Math.pow(L(1), 3);
  const structure = STRUCTURE_MASS_PER_WING_AREA * d.wingArea_m2;
  const leSweep = sweepAtDeg(d.wing.planform, 0);
  const apexIn = MAC_QUARTER_CHORD_STATION_IN - g.macSpanwiseIn * Math.tan((leSweep * Math.PI) / 180) - 0.25 * g.macIn;
  const geom: FlightGeometry = { mac_m: L(g.macIn), bodyLength_m: L(d.wing.body.lengthIn) };
  const aerodynamics: Aerodynamics = (mach, alpha, rePerM) => {
    const l = lift(d.aero, d.wing, mach, alpha);
    return { lift: l, drag: drag(d.aero, d.wing, geom, mach, rePerM, l) };
  };
  return {
    wingId: d.aero.wingId,
    aerodynamics,
    wing: d.wing,
    aero: d.aero,
    scale: k,
    wingArea_m2: d.wingArea_m2,
    span_m: L(g.spanIn),
    rootChord_m: L(g.rootChordIn),
    tipChord_m: L(g.tipChordIn),
    ...geom,
    bodyDiameter_m: L(d.wing.body.diameterIn),
    noseLength_m: L(d.wing.body.noseLengthIn),
    leadingEdgeSweepDeg: leSweep,
    apexStation_m: L(apexIn),
    bodyVolume_m3: volume,
    structureMass_kg: structure,
    fuelCapacity_kg: FUEL_VOLUME_FRACTION * volume * FUEL_DENSITY,
    emptyMass_kg: structure + d.engine.mass_kg,
    massEvidence: "estimated",
    engine: d.engine,
    limits: { maxLoadFactor: MAX_LOAD_FACTOR, minLoadFactor: MIN_LOAD_FACTOR, gearSink_m_s: GEAR_SINK_LIMIT },
  };
}
