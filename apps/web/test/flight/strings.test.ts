import { describe, expect, it } from "vitest";
import type { FlightReport } from "@jet-workshop/physics/flight";
import { fixed, kmh } from "../../src/flight/format.ts";
import { reportSentences } from "../../src/flight/Report.tsx";
import { STRINGS, initialLang, t } from "../../src/flight/strings.ts";

describe("check 8: the string tables", () => {
  it("have the same keys in Spanish and English", () => {
    expect(Object.keys(STRINGS.en).sort()).toEqual(Object.keys(STRINGS.es).sort());
  });

  it("have no figure written inside a string", () => {
    for (const lang of ["es", "en"] as const) {
      for (const [key, s] of Object.entries(STRINGS[lang])) {
        // Decimal digits of any script; the figures come in through the {placeholders}.
        expect(/\p{Nd}/u.test(s), `${lang}.${key}: "${s}"`).toBe(false);
      }
    }
  });

  it("use the same placeholders in both languages", () => {
    const names = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
    for (const key of Object.keys(STRINGS.es) as (keyof typeof STRINGS.es)[]) {
      expect(names(STRINGS.en[key]), key).toEqual(names(STRINGS.es[key]));
    }
  });

  it("refuse to print a string with a figure missing", () => {
    expect(() => t("es", "wingSize")).toThrow(/\{S\}/);
    expect(t("en", "wingSize", { S: "25" })).toBe("Wing size: 25 m²");
  });

  it("start in Spanish when the browser's language starts with es (decision 0003)", () => {
    expect(initialLang("es-MX")).toBe("es");
    expect(initialLang("en-GB")).toBe("en");
    expect(initialLang(undefined)).toBe("en");
  });

  it("print decimals with a point and no negative zero", () => {
    expect(fixed(-0.0001, 2)).toBe("0.00");
    expect(fixed(1.005, 1)).toBe("1.0");
    expect(kmh(100)).toBe("360");
  });
});

describe("the report: one sentence with its figures for every outcome", () => {
  const base = { maxMach: 0.93, supersonic: false, dragEqualsThrustMach: 0.97, fuelLeftFraction: 0.42, maxHeight_m: 3000, flightTime_s: 200, engineId: "placeholder", provisionalEngine: true };
  const outcomes: FlightReport["outcome"][] = [
    { kind: "landed", t: 1, speed_m_s: 80, sink_m_s: 1 },
    { kind: "no-takeoff", t: 1, speed_m_s: 70, required_m_s: 95 },
    { kind: "stall", t: 1, speed_m_s: 75, height_m: 900, mass_kg: 6000, stallSpeed_m_s: 78 },
    { kind: "wing-break", t: 1, loadFactor: 7.3335, limit: 7.33, speed_m_s: 280 },
    { kind: "out-of-fuel", t: 1, distance_m: 12000 },
    { kind: "engine-failure", t: 1, limitId: "turbine-inlet-temperature" },
    { kind: "hard-landing", t: 1, sink_m_s: 4.2, limit_m_s: 3.048 },
    { kind: "crash", t: 1, speed_m_s: 150, reason: "off-runway", theta: -0.1, distance_m: 4000 },
    { kind: "crash", t: 1, speed_m_s: 90, reason: "nose-low", theta: -0.05, distance_m: 0 },
    { kind: "crash", t: 1, speed_m_s: 40, reason: "backwards", theta: 3, distance_m: 0 },
  ];
  for (const lang of ["es", "en"] as const) {
    it(`gives every outcome its sentence in ${lang}, and says why it did not go supersonic`, () => {
      for (const outcome of outcomes) {
        const s = reportSentences(lang, { ...base, outcome });
        expect(s.length).toBeGreaterThanOrEqual(2);
        for (const line of s) expect(line).not.toMatch(/[{}]/);
        expect(s.at(-1)).toBe(t(lang, "noCross", { m: "0.97" }));
      }
    });
  }

  it("says the aircraft could have gone supersonic when, at full throttle, drag equals thrust above Mach 1", () => {
    const s = reportSentences("en", { ...base, dragEqualsThrustMach: 1.18, outcome: outcomes[0]! });
    expect(s.at(-1)).toBe("It did not pass Mach 0.93. At full throttle it could have: at that height drag equals thrust at Mach 1.18.");
  });

  it("adds nothing about the speed of sound to a supersonic flight", () => {
    const s = reportSentences("es", { ...base, supersonic: true, maxMach: 1.2, dragEqualsThrustMach: null, outcome: outcomes[0]! });
    expect(s).toEqual(["Aterrizaste. Velocidad máxima: Mach 1.20. Te quedó un 42 % de combustible."]);
  });
});

describe("the wing-break figures explain the failure", () => {
  it("prints the load factor and its limit apart, and the speed", () => {
    const base = { maxMach: 0.9, supersonic: false, dragEqualsThrustMach: 1.2, fuelLeftFraction: 0.5, maxHeight_m: 3000, flightTime_s: 100, engineId: "placeholder", provisionalEngine: true };
    const s = reportSentences("en", { ...base, outcome: { kind: "wing-break", t: 1, loadFactor: 7.3415, limit: 7.33, speed_m_s: 280 } });
    expect(s[0]).toBe("The wing broke at 7.34 g. Its limit was 7.33 g.");
    expect(s[1]).toContain("1008 km/h");
    const close = reportSentences("en", { ...base, outcome: { kind: "wing-break", t: 1, loadFactor: 7.3337, limit: 7.33, speed_m_s: 280 } });
    expect(close[0]).toBe("The wing broke at 7.334 g. Its limit was 7.330 g.");
    const negative = reportSentences("es", { ...base, outcome: { kind: "wing-break", t: 1, loadFactor: -3.08, limit: -3, speed_m_s: 250 } });
    expect(negative[0]).toBe("El ala se rompió a -3.08 g. Su límite era -3.00 g.");
  });
});
