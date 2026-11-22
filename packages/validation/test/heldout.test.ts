/**
 * The held-out datasets (brief 003): NACA RM L51I04a and RM L51K16a, read
 * with the current reader. No model is run on them (decision 0004).
 *
 * Checks: the exact schema of the open dataset; every row belongs to one of
 * the six configurations of docs/studies/heldout-geometry.md, named in
 * `series` by the pattern of the dataset card (owner's decision 4 at gate 1);
 * the sweep in `wing` agrees with the configuration; every symbol has both CL
 * and CD; the counts per figure match the pass comparisons.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assemble, parseCsv, parseRows, type Row } from "../src/index.ts";

const FIELDS = [
  "document", "figure_id", "figure", "pdf_page", "printed_page", "wing", "mach", "series", "point_id",
  "variable", "value_pass_a", "value_pass_b", "value_adopted", "pass_difference", "u_pixel_floor",
  "u_digitization", "u_declared", "u_total", "data_class", "method", "flags", "note",
];

/** The six configurations of the geometry sheet, with their quarter-chord sweep as the reader labels it. */
const CONFIGS: Record<string, string> = {
  "10.8deg-t04": "10.8",
  "35deg-t04": "35",
  "47deg-t04": "47",
  "47deg-t06": "47",
  "47deg-t09": "47",
  "47deg-root12-t06": "47",
};

/** Symbols: <figure_id>-<config>-M<mach, 3 decimals>. NACA faired curves (figure 11): <figure_id>-<config>. */
const SYMBOL_SERIES = /^(fig\d\d[a-z](?:-drag)?)-(10\.8deg-t04|35deg-t04|47deg-t04|47deg-t06|47deg-t09|47deg-root12-t06)-M(\d\.\d{3})$/;
const FAIRED_SERIES = /^(fig11-(?:upper|lower))-(10\.8deg-t04|35deg-t04|47deg-t04|47deg-t06|47deg-t09|47deg-root12-t06)$/;

const read = (name: string): string => readFileSync(new URL(`../data/heldout/${name}`, import.meta.url), "utf8");

function configOf(r: Row): string {
  const s = SYMBOL_SERIES.exec(r.series);
  if (s) {
    expect(s[1]).toBe(r.figureId);
    expect(Number(s[3])).toBeCloseTo(r.mach, 6);
    expect(r.dataClass).toBe("measured");
    return s[2]!;
  }
  const f = FAIRED_SERIES.exec(r.series);
  if (f) {
    expect(f[1]).toBe(r.figureId);
    expect(r.dataClass).toBe("naca_faired_crossplot");
    expect(r.variable).toBe("CD0");
    return f[2]!;
  }
  throw new Error(`series outside the six configurations: ${r.series}`);
}

function checkFile(name: string, document: string) {
  const text = read(name);
  const [header] = parseCsv(text);
  expect(header).toEqual(FIELDS);
  for (const line of parseCsv(text).slice(1)) expect(line[0]).toBe(document);
  const rows = parseRows(text);
  expect(rows.length).toBeGreaterThan(0);
  const configs = new Set<string>();
  for (const r of rows) {
    const c = configOf(r);
    configs.add(c);
    expect(r.wing).toBe(CONFIGS[c]);
    expect(["CL", "CD", "CD0"]).toContain(r.variable);
    for (const v of [r.value, r.valuePassA, r.valuePassB, r.uTotal]) expect(Number.isFinite(v)).toBe(true);
    expect(r.uDigitization).toBeGreaterThanOrEqual(r.uPixelFloor);
    expect(r.uTotal).toBeGreaterThanOrEqual(r.uDeclared);
  }
  // every symbol carries both CL and CD (the drag polars), and nothing else
  const symbols = new Map<string, string[]>();
  for (const r of rows.filter((r) => r.dataClass === "measured")) {
    const k = `${r.series}|${r.pointId}`;
    symbols.set(k, [...(symbols.get(k) ?? []), r.variable]);
  }
  for (const vars of symbols.values()) expect(vars.sort()).toEqual(["CD", "CL"]);
  const d = assemble(rows);
  expect(d.polar.length).toBe(symbols.size);
  expect(d.lift).toHaveLength(0);
  return { rows, configs, polar: d.polar, faired: rows.filter((r) => r.dataClass === "naca_faired_crossplot") };
}

const count = (rows: { series: string }[], prefix: string): number => rows.filter((r) => r.series.startsWith(prefix)).length;

describe("held-out dataset: NACA RM L51I04a", () => {
  const { configs, polar, faired } = checkFile("l51i04a.csv", "NACA RM L51I04a");
  it("holds the four 47 deg wings of the report", () => {
    expect([...configs].sort()).toEqual(["47deg-root12-t06", "47deg-t04", "47deg-t06", "47deg-t09"]);
  });
  it("has the symbols of figures 6(b) to 9(b), five Mach numbers each", () => {
    for (const fig of ["fig06b", "fig07b", "fig08b", "fig09b"]) {
      expect(new Set(polar.filter((p) => p.figure !== "" && p.series.startsWith(fig)).map((p) => p.mach)).size).toBe(5);
    }
    expect(count(polar, "fig06b-47deg-t04-")).toBe(32);
  });
  it("has NACA's faired CD0 curves of figure 11 at each wing's test Mach numbers, wing 2 once", () => {
    expect(count(faired, "fig11-upper-47deg-t04")).toBe(12);
    expect(count(faired, "fig11-upper-47deg-t06")).toBe(13);
    expect(count(faired, "fig11-upper-47deg-t09")).toBe(13);
    expect(count(faired, "fig11-lower-47deg-root12-t06")).toBe(13);
    expect(count(faired, "fig11-lower-47deg-t06")).toBe(0);
  });
});

describe("held-out dataset: NACA RM L51K16a", () => {
  const { configs, polar, faired } = checkFile("l51k16a.csv", "NACA RM L51K16a");
  it("holds the six configurations at M 1.60, 8 symbols each", () => {
    expect([...configs].sort()).toEqual(Object.keys(CONFIGS).sort());
    for (const c of Object.keys(CONFIGS)) expect(polar.filter((p) => p.series.includes(`-${c}-M`)).length).toBe(8);
    for (const p of polar) expect(p.mach).toBe(1.6);
    expect(faired).toHaveLength(0);
  });
  it("carries the report's own declared accuracy (CL 0.005, CD 0.001)", () => {
    const rows = parseRows(read("l51k16a.csv"));
    for (const r of rows) expect(r.uDeclared).toBe(r.variable === "CL" ? 0.005 : 0.001);
  });
});
