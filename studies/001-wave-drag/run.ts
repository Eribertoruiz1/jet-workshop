/**
 * Study 001: the one command that regenerates every table and figure of the study.
 *
 *   corepack pnpm exec tsx studies/001-wave-drag/run.ts
 *
 * Steps present so far (gate 1): the sonic-edge table and the condition counts,
 * from geometry only. Later steps (numerical verification, candidates, scoring)
 * are added here; none of them is run on held-out data.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { edgesReport } from "./src/edges.ts";

const OUT = fileURLToPath(new URL("./out/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const edges = edgesReport();
writeFileSync(`${OUT}edges.md`, edges.markdown);
writeFileSync(`${OUT}edges.csv`, edges.csv);
console.log(`edges: wrote out/edges.md and out/edges.csv`);
console.log(`counts: ${edges.summary}`);
