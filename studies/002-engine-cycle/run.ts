/**
 * Study 002, engine cycle: the one command that regenerates its tables, figures and text.
 *
 *   corepack pnpm exec tsx studies/002-engine-cycle/run.ts
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compareJ47 } from "../../packages/physics/src/propulsion/j47-comparison.ts";
import { parseJ47Table } from "../../packages/physics/src/propulsion/j47-data.ts";
import { renderComparedRegions } from "./src/compared-regions.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const runs = parseJ47Table(readFileSync(resolve(root, "packages/physics/data/engines/j47/rm-e9g09-table1.csv"), "utf8"));
const comparison = compareJ47(runs);

writeFileSync(
  resolve(root, "packages/physics/src/propulsion/j47-compared-regions.generated.ts"),
  renderComparedRegions(comparison),
);
console.log(`regions written: ${comparison.regions.length}`);
