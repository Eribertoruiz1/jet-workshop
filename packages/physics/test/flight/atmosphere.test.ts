import { describe, expect, it } from "vitest";
import { bielatWing, geometry } from "../../src/geometry.ts";
import {
  M2_PER_FT2,
  M_PER_IN,
  SEA_LEVEL_DENSITY,
  atmosphere,
  geopotentialAltitude,
  scaleFactor,
  scaledLength,
  squareInchesToSquareMetres,
} from "../../src/flight/index.ts";

/**
 * U.S. Standard Atmosphere 1976 (NASA-TM-X-74335), table I, by geometric
 * altitude: temperature (K), pressure (Pa), density (kg/m^3), with the
 * number of significant figures the table prints.
 */
// UNVERIFIED: values to confirm against the table pages of NASA-TM-X-74335 (cited in docs/cp/006.md).
const TABLE = [
  { z: 0, t: 288.15, p: 1.01325e5, rho: 1.225 },
  { z: 11000, t: 216.774, p: 2.27e4, rho: 3.648e-1 },
  { z: 20000, t: 216.65, p: 5.5293e3, rho: 8.891e-2 },
];

describe("check 3: the standard atmosphere against its table", () => {
  for (const row of TABLE) {
    it(`matches the table at ${row.z / 1000} km`, () => {
      const a = atmosphere(row.z);
      // The table prints five significant figures: agreement within half a unit of the last one.
      expect(Math.abs(a.temperature_K - row.t) / row.t).toBeLessThan(5e-6);
      expect(Math.abs(a.pressure_Pa - row.p) / row.p).toBeLessThan(5e-5);
      expect(Math.abs(a.density_kg_m3 - row.rho) / row.rho).toBeLessThan(5e-5);
      expect(a.inRange).toBe(true);
    });
  }

  it("uses geopotential altitude: 11 km geometric is 10 981 m geopotential", () => {
    expect(geopotentialAltitude(11000)).toBeCloseTo(10981.0, 0);
  });

  it("gives the sea-level speed of sound and viscosity of the standard", () => {
    const a = atmosphere(0);
    expect(a.speedOfSound_m_s).toBeCloseTo(340.294, 2);
    expect(a.viscosity_Pa_s).toBeCloseTo(1.7894e-5, 8);
    expect(SEA_LEVEL_DENSITY).toBeCloseTo(1.225, 4);
  });

  it("is continuous across the layer boundaries", () => {
    for (const hGeo of [11000, 20000]) {
      const z = (6356766 * hGeo) / (6356766 - hGeo);
      const below = atmosphere(z - 1e-6);
      const above = atmosphere(z + 1e-6);
      expect(Math.abs(below.pressure_Pa - above.pressure_Pa) / below.pressure_Pa).toBeLessThan(1e-9);
      expect(Math.abs(below.temperature_K - above.temperature_K)).toBeLessThan(1e-6);
    }
  });
});

describe("units: the tunnel model scaled to the aircraft", () => {
  it("converts the reference area of the tested models, 1.143 sq ft", () => {
    const w = bielatWing("35");
    expect(squareInchesToSquareMetres(w.planform.areaIn2)).toBeCloseTo(1.143 * M2_PER_FT2, 12);
    expect(1.143 * M2_PER_FT2).toBeCloseTo(0.106188, 6);
  });

  it("scales every length by the same factor and keeps the aspect ratio", () => {
    const w = bielatWing("47");
    const g = geometry(w);
    const area = 25;
    const k = scaleFactor(w.planform.areaIn2, area);
    const span = scaledLength(g.spanIn, k);
    expect((span * span) / area).toBeCloseTo(w.planform.aspectRatio, 10);
    expect(scaledLength(1, 1)).toBe(M_PER_IN);
  });
});
