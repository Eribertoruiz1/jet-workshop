import { describe, expect, it } from "vitest";
import { bielatWing, geometry } from "../../src/geometry.ts";
import { parasiteDrag } from "../../src/parasite.ts";
import { M_PER_IN, drag, flightFriction, lift, lookup, makeAircraft, makePlaceholderEngine, viterna, weakest } from "../../src/flight/index.ts";
import { SYNTHETIC } from "./fixtures.ts";

const DEG = Math.PI / 180;
const wing = bielatWing("35");
const tunnelGeom = { mac_m: geometry(wing).macIn * M_PER_IN, bodyLength_m: wing.body.lengthIn * M_PER_IN };

describe("tables: where a Mach number falls", () => {
  const rise = SYNTHETIC.dragRise;
  it("holds the last increment above the last sampled Mach number, as no data", () => {
    expect(lookup(rise, 1.3, SYNTHETIC.gaps)).toEqual({ value: 0.0097, placement: "above" });
  });
  it("joins the samples on either side of the gap with a straight line, as no data", () => {
    const mid = lookup(rise, 1.06, SYNTHETIC.gaps);
    expect(mid.placement).toBe("gap");
    expect(mid.value).toBeCloseTo(0.01 + ((1.06 - 1.035) / (1.1 - 1.035)) * (0.0097 - 0.01), 12);
    // Outside the gap itself but on the straight join across it: still no data.
    expect(lookup(rise, 1.09, SYNTHETIC.gaps).placement).toBe("gap");
  });
  it("interpolates between samples inside the sampled range", () => {
    const v = lookup(rise, 0.9, SYNTHETIC.gaps);
    expect(v.placement).toBe("between");
    expect(v.value).toBeCloseTo((0.0005 + 0.003) / 2, 15);
  });
  it("ranks evidence: no data is weaker than estimated, estimated than validated", () => {
    expect(weakest("validated", "estimated")).toBe("estimated");
    expect(weakest("estimated", "no-data", "validated")).toBe("no-data");
    expect(weakest()).toBe("validated");
  });
});

describe("lift: measured slope, then the declared stall model", () => {
  it("is validated only near a measured Mach number and inside the fitted lift range", () => {
    expect(lift(SYNTHETIC, wing, 0.85, 3 * DEG).evidence).toBe("validated");
    expect(lift(SYNTHETIC, wing, 0.7, 3 * DEG).evidence).toBe("estimated");
    expect(lift(SYNTHETIC, wing, 0.85, 9 * DEG).evidence).toBe("estimated");
    expect(lift(SYNTHETIC, wing, 0.3, 3 * DEG).evidence).toBe("estimated");
    expect(lift(SYNTHETIC, wing, 1.06, 3 * DEG).evidence).toBe("no-data");
    expect(lift(SYNTHETIC, wing, 1.2, 3 * DEG).evidence).toBe("no-data");
  });

  it("uses the measured slope and zero-lift angle", () => {
    const l = lift(SYNTHETIC, wing, 0.85, 3 * DEG);
    expect(l.cl).toBeCloseTo(3.8 * (3 + 1.3) * DEG, 12);
  });

  it("reaches the highest measured lift at the stall angle and is continuous across it", () => {
    const at = lift(SYNTHETIC, wing, 0.85, 0);
    const a = at.stallAlpha;
    const below = lift(SYNTHETIC, wing, 0.85, a - 1e-9);
    const above = lift(SYNTHETIC, wing, 0.85, a + 1e-9);
    expect(below.cl).toBeCloseTo(0.65, 6);
    expect(above.stalled).toBe(true);
    expect(above.evidence).toBe("estimated");
    expect(Math.abs(above.cl - below.cl)).toBeLessThan(1e-6);
    // Past the stall the lift falls.
    expect(lift(SYNTHETIC, wing, 0.85, a + 8 * DEG).cl).toBeLessThan(0.65);
  });

  it("drag is continuous across the stall and grows past it", () => {
    const re = 2e7;
    const a = lift(SYNTHETIC, wing, 0.6, 0).stallAlpha;
    const cd = (alpha: number) => drag(SYNTHETIC, wing, tunnelGeom, 0.6, re, lift(SYNTHETIC, wing, 0.6, alpha)).cd;
    expect(Math.abs(cd(a + 1e-9) - cd(a - 1e-9))).toBeLessThan(1e-6);
    expect(cd(a + 10 * DEG)).toBeGreaterThan(3 * cd(a - 1e-9));
  });

  it("Viterna and Corrigan's extension matches the lift and drag it is given at the stall angle", () => {
    const v = viterna(0.2, 0.2, 0.7, 0.05, 3.5);
    expect(v.cl).toBeCloseTo(0.7, 12);
    expect(v.cd).toBeCloseTo(0.05, 12);
    // At 90 degrees: no lift, the flat-plate drag 1.11 + 0.018 A.
    const flat = viterna(Math.PI / 2, 0.2, 0.7, 0.05, 3.5);
    expect(flat.cl).toBeCloseTo(0, 12);
    expect(flat.cd).toBeCloseTo(1.11 + 0.018 * 3.5, 12);
  });
});

describe("drag: friction at the flight Reynolds number plus the measured rise", () => {
  it("gives the current model's friction when evaluated at the tunnel Reynolds number", () => {
    // The tunnel: Reynolds number 2.0 million on the 7.874 in chord at M 0.50.
    const rePerM = 2.0e6 / (7.874 * M_PER_IN);
    const tunnel = parasiteDrag(wing, 0.5);
    expect(flightFriction(wing, tunnelGeom, 0.5, rePerM)).toBeCloseTo(tunnel.total, 12);
  });

  it("falls when the Reynolds number is ten times the tunnel's (thinner boundary layer)", () => {
    const rePerM = 2.0e6 / (7.874 * M_PER_IN);
    expect(flightFriction(wing, tunnelGeom, 0.5, 10 * rePerM)).toBeLessThan(0.85 * flightFriction(wing, tunnelGeom, 0.5, rePerM));
  });

  it("adds the rise over M 0.50 and is never better than estimated", () => {
    const re = 2e7;
    const l = lift(SYNTHETIC, wing, 0.95, 2 * DEG);
    const d = drag(SYNTHETIC, wing, tunnelGeom, 0.95, re, l);
    expect(d.parts.rise).toBeCloseTo(0.003, 12);
    expect(d.cd).toBeCloseTo(d.parts.friction + d.parts.rise + d.parts.induced, 12);
    expect(d.evidence).toBe("estimated");
    expect(drag(SYNTHETIC, wing, tunnelGeom, 1.06, re, lift(SYNTHETIC, wing, 1.06, 2 * DEG)).evidence).toBe("no-data");
  });

  it("stays finite at rest", () => {
    const l = lift(SYNTHETIC, wing, 0, 0);
    expect(Number.isFinite(drag(SYNTHETIC, wing, tunnelGeom, 0, 0, l).cd)).toBe(true);
  });
});

describe("the aircraft: scale, mass and capacity", () => {
  it("scales the tested body and keeps the coefficients' reference area", () => {
    const ac = makeAircraft({ wing, aero: SYNTHETIC, wingArea_m2: 25, engine: makePlaceholderEngine({ staticThrust_N: 50000 }) });
    expect((ac.span_m * ac.span_m) / ac.wingArea_m2).toBeCloseTo(3.5, 10);
    expect(ac.bodyLength_m / ac.bodyDiameter_m).toBeCloseTo(25.15 / 2.25, 10);
    expect(ac.emptyMass_kg).toBeCloseTo(ac.structureMass_kg + ac.engine.mass_kg, 9);
    expect(ac.fuelCapacity_kg).toBeGreaterThan(0);
    // Capacity grows with volume (k^3), structure with area (k^2).
    const big = makeAircraft({ wing, aero: SYNTHETIC, wingArea_m2: 100, engine: makePlaceholderEngine({ staticThrust_N: 50000 }) });
    expect(big.fuelCapacity_kg / ac.fuelCapacity_kg).toBeCloseTo(8, 9);
    expect(big.structureMass_kg / ac.structureMass_kg).toBeCloseTo(4, 9);
  });

  it("refuses tables it cannot fly with", () => {
    const bad = { ...SYNTHETIC, liftSlope: { ...SYNTHETIC.liftSlope, points: [] } };
    expect(() => makeAircraft({ wing, aero: bad, wingArea_m2: 25, engine: makePlaceholderEngine({ staticThrust_N: 1 }) })).toThrow(/empty/);
  });
});

describe("the provisional engine", () => {
  it("gives its static thrust at sea level, less with density, and burns fuel in proportion", () => {
    const e = makePlaceholderEngine({ staticThrust_N: 40000 });
    expect(e.id).toBe("placeholder");
    const sl = e.step(e.initialState(), { throttle: 1, afterburner: false }, { ambient: { pressure_Pa: 101325, temperature_K: 288.15 }, mach: 0 }, 1 / 120).output;
    expect(sl.thrust_N).toBeCloseTo(40000, 6);
    expect(sl.evidence).toBe("estimated");
    const high = e.step(e.initialState(), { throttle: 1, afterburner: false }, { ambient: { pressure_Pa: 22632, temperature_K: 216.65 }, mach: 0.8 }, 1 / 120).output;
    expect(high.thrust_N / sl.thrust_N).toBeCloseTo((22632 / 216.65) / (101325 / 288.15), 9);
    expect(high.fuelFlow_kg_s / high.thrust_N).toBeCloseTo(sl.fuelFlow_kg_s / sl.thrust_N, 15);
  });
});
