import { describe, expect, it } from "vitest";
import { TESTED_SWEEPS } from "@jet-workshop/physics";
import { fill, initialLang } from "../src/i18n/i18n.tsx";
import { en, es, type StringKey } from "../src/i18n/strings.ts";

/** Digits a string may carry (brief 002): the wing names, the year of the tests and Mach 1. Step numbers come in as placeholders. */
const ALLOWED = [/10\.8°/g, /35°/g, /47°/g, /1952/g, /Mach 1(?![\d.])/g];
const placeholders = (s: string): string[] => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();

describe("string tables", () => {
  it("es and en have the same keys", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
  });

  it("no string carries a written number outside the allowed list", () => {
    const bad: string[] = [];
    for (const [lang, table] of [["es", es], ["en", en]] as const) {
      for (const [k, v] of Object.entries(table)) {
        let rest = v.replace(/\{\w+\}/g, "");
        for (const a of ALLOWED) rest = rest.replace(a, "");
        if (/\d/.test(rest)) bad.push(`${lang}.${k}: ${v}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("each key has the same placeholders in both languages", () => {
    for (const k of Object.keys(es) as StringKey[]) expect(placeholders(en[k]), k).toEqual(placeholders(es[k]));
  });

  it("the wing names allowed as written digits are the tested wings", () => {
    expect(Object.values(TESTED_SWEEPS).sort((a, b) => a - b)).toEqual([10.8, 35, 47]);
  });

  it("a missing placeholder value is an error, never a blank", () => {
    expect(() => fill("Mach {mach}", {})).toThrow();
    expect(fill("Paso {n} de {total}", { n: 3, total: 8 })).toBe("Paso 3 de 8");
  });

  it("the first language follows the browser: Spanish if it starts with es", () => {
    expect(initialLang(["es-PA", "en"])).toBe("es");
    expect(initialLang(["en-US", "es"])).toBe("en");
    expect(initialLang([])).toBe("en");
  });
});
