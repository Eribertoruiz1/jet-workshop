// Compares two independent transcriptions of the same printed table, cell by cell.
//
// Usage: node studies/002-engine-cycle/tools/compare-passes.mjs <pass-a.csv> <pass-b.csv> [key-column]
//
// The two files must have the same header. Rows are matched by the key column
// (the first one unless named). A cell differs when its two readings are not the
// same number; "1.210" and "1.21" are the same number. Prints every difference
// and exits with status 1 if there is any, so a clean comparison can be asserted.

import { readFileSync } from "node:fs";

function parse(path) {
  const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    if (cells.length !== header.length) throw new Error(`${path}: expected ${header.length} cells in "${line}"`);
    return Object.fromEntries(header.map((name, i) => [name, cells[i].trim()]));
  });
  return { header, rows };
}

const [pathA, pathB, keyArg] = process.argv.slice(2);
if (!pathA || !pathB) throw new Error("usage: compare-passes.mjs <pass-a.csv> <pass-b.csv> [key-column]");
const a = parse(pathA);
const b = parse(pathB);
if (a.header.join(",") !== b.header.join(",")) throw new Error("the two passes have different headers");
const key = keyArg ?? a.header[0];

const same = (x, y) => x === y || (x !== "" && y !== "" && Number(x) === Number(y));
const byKeyB = new Map(b.rows.map((row) => [row[key], row]));
let differences = 0;
let cells = 0;
for (const rowA of a.rows) {
  const rowB = byKeyB.get(rowA[key]);
  if (!rowB) {
    console.log(`${key} ${rowA[key]}: missing in pass B`);
    differences += 1;
    continue;
  }
  for (const name of a.header) {
    cells += 1;
    if (!same(rowA[name], rowB[name])) {
      console.log(`${key} ${rowA[key]}, ${name}: pass A "${rowA[name]}", pass B "${rowB[name]}"`);
      differences += 1;
    }
  }
}
for (const rowB of b.rows) {
  if (!a.rows.some((rowA) => rowA[key] === rowB[key])) {
    console.log(`${key} ${rowB[key]}: missing in pass A`);
    differences += 1;
  }
}
console.log(`${a.rows.length} rows in pass A, ${b.rows.length} in pass B, ${cells} cells compared, ${differences} differences`);
process.exit(differences === 0 ? 0 : 1);
