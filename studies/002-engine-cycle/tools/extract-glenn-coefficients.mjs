// Prints the data block of packages/physics/src/propulsion/glenn-coefficients.ts.
//
// Source: McBride, Zehe and Gordon, "NASA Glenn Coefficients for Calculating
// Thermodynamic Properties of Individual Species", NASA/TP-2002-211556 (2002),
// NTRS 20020085330, appendix with the species records. No coefficient is typed
// by hand: they are read from the text layer of the report.
//
// Usage, from the repository root:
//   pdftotext -layout .cache/sources/nasa-tp-2002-211556/nasa-tp-2002-211556.pdf .cache/text/nasa-tp-2002-211556.txt
//   node studies/002-engine-cycle/tools/extract-glenn-coefficients.mjs .cache/text/nasa-tp-2002-211556.txt
import { readFileSync } from "node:fs";

const SPECIES = ["N2", "O2", "Ar", "CO2", "H2O"];
const lines = readFileSync(process.argv[2], "latin1").split(/\r?\n/);
const coefficient = /-?\d\.\d{9}D[+-]\d{2}/g;

/** First line of the record of a species: its name, then its reference comment. */
function recordStart(name) {
  const header = new RegExp(`^\\s*${name}\\s+(Ref-Elm\\.|Gurvich|Hf:)`);
  const hits = lines.flatMap((line, i) => (header.test(line) ? [i] : []));
  if (hits.length !== 1) throw new Error(`${name}: expected one record, found ${hits.length}`);
  return hits[0];
}

const out = [];
for (const name of SPECIES) {
  const record = lines.slice(recordStart(name), recordStart(name) + 40).filter((l) => l.trim() !== "");
  const second = record[1].trim();
  const intervalCount = Number(second.split(/\s+/)[0]);
  const molarMass = second.match(/\s(\d+\.\d{7})\s+-?\d+\.\d{3}\s*$/)[1];
  const intervals = [];
  for (let k = 0; k < intervalCount; k++) {
    const range = record[2 + 3 * k].trim().split(/\s+/);
    const first = record[3 + 3 * k].match(coefficient);
    const rest = record[4 + 3 * k].match(coefficient);
    if (first.length !== 5 || rest.length !== 4) throw new Error(`${name}: bad coefficient count in interval ${k}`);
    intervals.push({ low: Number(range[0]), high: Number(range[1].slice(0, -1)), values: [...first, ...rest] });
  }
  const [low, high] = intervals;
  if (low.low !== 200 || low.high !== 1000 || high.low !== 1000 || high.high !== 6000) {
    throw new Error(`${name}: unexpected temperature intervals`);
  }
  const row = (v) => `[${v.values.map((s) => s.replace("D", "e")).join(", ")}]`;
  out.push(`  ${name}: {\n    molarMass_g_mol: ${molarMass},\n    low: ${row(low)},\n    high: ${row(high)},\n  },`);
}
console.log(out.join("\n"));
