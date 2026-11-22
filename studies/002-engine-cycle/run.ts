/**
 * Study 002, engine cycle: the one command that regenerates its tables, its figure and its text.
 *
 *   corepack pnpm exec tsx studies/002-engine-cycle/run.ts
 *
 * Gate 2 of brief 007: the comparison of the anchored model with the J47 tests. It writes
 * studies/002-engine-cycle/out/, docs/studies/002-engine-cycle.md and the list of compared
 * regions the engine carries (packages/physics/src/propulsion/j47-compared-regions.generated.ts).
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { designBasis } from "../../packages/physics/src/propulsion/design.ts";
import { compareJ47, compareJ47AtExhaustTemperature } from "../../packages/physics/src/propulsion/j47-comparison.ts";
import { parseJ47Table } from "../../packages/physics/src/propulsion/j47-data.ts";
import { j47AtSeaLevelStatic } from "../../packages/physics/src/propulsion/j47.ts";
import { renderComparedRegions } from "./src/compared-regions.ts";
import {
  anchorDerivedTable,
  anchorInputsTable,
  designBasisTable,
  errorBySpeedTable,
  errorFigure,
  pointsCsv,
  pointsTable,
  regionsTable,
  seaLevelTable,
  snippets,
  standardDayTable,
  temperatureMatchedTable,
} from "./src/report.ts";

const path = (relative: string): string => fileURLToPath(new URL(relative, import.meta.url));
const OUT = path("./out/");
mkdirSync(OUT, { recursive: true });
const write = (file: string, text: string): void => {
  writeFileSync(file, text.endsWith("\n") ? text : `${text}\n`);
};

const runs = parseJ47Table(readFileSync(path("../../packages/physics/data/engines/j47/rm-e9g09-table1.csv"), "utf8"));
const comparison = compareJ47(runs);
const matched = compareJ47AtExhaustTemperature(runs, comparison.engine);
const seaLevel = j47AtSeaLevelStatic(comparison.engine);
const basis = designBasis();

const tables: Record<string, string> = {
  anchorInputs: anchorInputsTable(),
  anchorDerived: anchorDerivedTable(comparison.engine),
  seaLevel: seaLevelTable(seaLevel),
  designBasis: designBasisTable(basis),
  regions: regionsTable(comparison),
  points: pointsTable(comparison),
  errorBySpeed: errorBySpeedTable(comparison),
  temperatureMatched: temperatureMatchedTable(matched),
  standardDay: standardDayTable(comparison.regions.map((result) => result.region)),
};
const numbers = snippets(runs, comparison, matched, seaLevel, basis);

write(`${OUT}j47-anchor.md`, `${tables.anchorInputs}\n\n${tables.anchorDerived}\n\n${tables.seaLevel}\n\n${tables.designBasis}`);
write(`${OUT}j47-comparison-regions.md`, `${tables.regions}\n\n${tables.errorBySpeed}\n\n${tables.standardDay}`);
write(`${OUT}j47-comparison-points.md`, `${tables.points}\n\n${tables.temperatureMatched}`);
write(`${OUT}j47-comparison-points.csv`, pointsCsv(comparison));
write(`${OUT}fig-j47-error.svg`, errorFigure(comparison));
write(path("../../packages/physics/src/propulsion/j47-compared-regions.generated.ts"), renderComparedRegions(comparison));

// The study: the template with every {{t:name}} and {{n:name}} replaced. A name that is not produced is an error.
const template = readFileSync(path("./study.template.md"), "utf8");
const study = template.replace(/\{\{(t|n):([^}]+)\}\}/g, (_, kind: string, name: string) => {
  const value = kind === "t" ? tables[name] : numbers[name];
  if (value === undefined) throw new Error(`the template asks for ${kind}:${name}, which the study does not produce`);
  return value;
});
write(path("../../docs/studies/002-engine-cycle.md"), study);

const hits = comparison.regions.filter((result) => result.hit).length;
const compared = comparison.regions.filter((result) => result.compared).length;
console.log(`runs ${runs.length}, scored points ${numbers.scoredPoints}, regions ${comparison.regions.length}, compared ${compared}, hits ${hits}`);
console.log("wrote studies/002-engine-cycle/out/, docs/studies/002-engine-cycle.md and j47-compared-regions.generated.ts");
