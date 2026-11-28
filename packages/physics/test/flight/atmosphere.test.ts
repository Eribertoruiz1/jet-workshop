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
 * U.S. Standard Atmosphere, 1976, by geometric altitude, as printed: the
 * tables of Part 4 of the standard (NOAA, NASA, USAF, NASA-TM-X-74335),
 * as reproduced by Public Domain Aeronautical Software, "Tables of the U.S.
 * Standard Atmosphere, 1976", Table 1 (https://www.pdas.com/bigtables.html),
 * read on 16 November 2026. That table steps 5 km; 11 km is checked against
 * the standard's own layer table below.
 */
const TABLE: { zKm: number; t: string; p: string; rho: string; a: string }[] = [
  { zKm: 0, t: "288.150", p: "1.0132E+05", rho: "1.2250E+00", a: "340.29" },
  { zKm: 10, t: "223.252", p: "2.6500E+04", rho: "4.1351E-01", a: "299.53" },
  { zKm: 15, t: "216.650", p: "1.2112E+04", rho: "1.9476E-01", a: "295.07" },
  { zKm: 20, t: "216.650", p: "5.5293E+03", rho: "8.8910E-02", a: "295.07" },
];

/** Half a unit of the last printed digit of a table entry. */
function halfUnit(printed: string): number {
  const [mantissa, exp] = printed.split("E");
  const decimals = (mantissa!.split(".")[1] ?? "").length;
  return 0.5 * Math.pow(10, -decimals + Number(exp ?? 0));
}

/** The model agrees with a printed entry when it rounds to it. */
function rounds(model: number, printed: string): boolean {
  return Math.abs(model - Number(printed)) <= halfUnit(printed) * (1 + 1e-9);
}

describe("check 3: the standard atmosphere against its table", () => {
  for (const row of TABLE) {
    it(`rounds to the printed table at ${row.zKm} km`, () => {
      const a = atmosphere(row.zKm * 1000);
      expect(rounds(a.temperature_K, row.t)).toBe(true);
      expect(rounds(a.pressure_Pa, row.p)).toBe(true);
      expect(rounds(a.density_kg_m3, row.rho)).toBe(true);
      expect(rounds(a.speedOfSound_m_s, row.a)).toBe(true);
      expect(a.inRange).toBe(true);
    });
  }

  it("gives the base of the second layer, 11 km geopotential, of the standard's layer table", () => {
    // Layer table of the 1976 standard (base 1): H 11 000 m, 22 632.1 Pa, 216.65 K
    // (Wikipedia, "U.S. Standard Atmosphere", read on 16 November 2026).
    const z = (6356766 * 11000) / (6356766 - 11000);
    const a = atmosphere(z);
    expect(rounds(a.pressure_Pa, "22632.1")).toBe(true);
    expect(rounds(a.temperature_K, "216.65")).toBe(true);
    expect(rounds(atmosphere((6356766 * 20000) / (6356766 - 20000)).pressure_Pa, "5474.89")).toBe(true);
    // Density at the same base: 0.3639 kg/m^3 in the layer table of the International Standard
    // Atmosphere, whose base values are the 1976 standard's (Wikipedia, "International Standard
    // Atmosphere", read on 17 November 2026; base geometric altitude printed there: 11 019 m).
    expect(rounds(a.density_kg_m3, "0.3639")).toBe(true);
    expect(rounds(atmosphere((6356766 * 20000) / (6356766 - 20000)).density_kg_m3, "0.0880")).toBe(true);
  });

  it("gives the defining sea-level values", () => {
    const a = atmosphere(0);
    expect(a.pressure_Pa).toBe(101325);
    expect(a.temperature_K).toBe(288.15);
    expect(rounds(SEA_LEVEL_DENSITY, "1.2250")).toBe(true);
  });

  it("uses geopotential altitude: 11 km geometric is 10 981 m geopotential", () => {
    expect(geopotentialAltitude(11000)).toBeCloseTo(10981.0, 0);
  });

  it("gives the dynamic viscosity of the same source's Table 2 (transport properties)", () => {
    expect(rounds(atmosphere(0).viscosity_Pa_s, "1.7894E-05")).toBe(true);
    expect(rounds(atmosphere(20000).viscosity_Pa_s, "1.4216E-05")).toBe(true);
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
