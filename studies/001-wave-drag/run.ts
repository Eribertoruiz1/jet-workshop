/**
 * Study 001: the one command that regenerates every table and figure of the study.
 *
 *   corepack pnpm exec tsx studies/001-wave-drag/run.ts
 *
 * Steps before the freeze (geometry and numerics only, no drag data): the
 * sonic-edge table and the condition counts, the geometry cross-checks, the
 * numerical verification of the wave-drag integral (known-answer cases, the
 * choice of N0 and m0, the nose check), the freeze record, and the wave levels
 * of A and C at the open conditions with the lesson figures. Nothing is run on
 * held-out data.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { geometryChecks } from "./src/checks.ts";
import { edgesReport } from "./src/edges.ts";
import { FREEZE } from "./src/freeze.ts";
import { areaFigure, decompositionFigure, waveLevelsMarkdown } from "./src/lesson.ts";
import { freezeMarkdown } from "./src/report-freeze.ts";
import { verificationMarkdown } from "./src/report-verification.ts";
import { waveRequests } from "./src/requests.ts";
import { runVerification } from "./src/verification.ts";
import { buildWaveTable } from "./src/wavetable.ts";
import { loadConfigs } from "./src/config.ts";

const FREEZE_SHIFT = loadConfigs().wingPosition.uncertaintyIn;

const OUT = fileURLToPath(new URL("./out/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const edges = edgesReport();
writeFileSync(`${OUT}edges.md`, edges.markdown);
writeFileSync(`${OUT}edges.csv`, edges.csv);
console.log(`edges: wrote out/edges.md and out/edges.csv`);
console.log(`counts: ${edges.summary}`);

const checks = geometryChecks();
writeFileSync(`${OUT}geometry-checks.md`, checks.markdown);
console.log(`geometry: ${checks.summary}`);
if (!checks.ok) throw new Error("geometry checks failed");

// --reuse-cache (development only) reuses the last verification and wave table; the study is always regenerated without it.
const reuseAll = process.argv.includes("--reuse-cache");
const vPath = `${OUT}verification.json`;
const v: ReturnType<typeof runVerification> = reuseAll && existsSync(vPath) ? JSON.parse(readFileSync(vPath, "utf8")) : runVerification();
writeFileSync(`${OUT}verification.md`, verificationMarkdown(v));
writeFileSync(`${OUT}verification.json`, JSON.stringify(v, null, 1));
console.log(`verification: N0 ${v.n0}, m0 ${v.m0}, self-check ${v.selfCheck.worstRelative.toExponential(1)}, ${v.seconds.toFixed(0)} s`);
if (v.n0 !== FREEZE.n0 || v.m0 !== FREEZE.m0) {
  throw new Error(`the verification picks N0 ${v.n0}, m0 ${v.m0}, but the frozen values are N0 ${FREEZE.n0}, m0 ${FREEZE.m0}`);
}

writeFileSync(`${OUT}freeze.md`, freezeMarkdown(v));

// Wave levels of A and C for the open conditions (geometry only, before any drag data).
const CACHE = fileURLToPath(new URL("../../.cache/wave-table.json", import.meta.url));
const table = buildWaveTable(waveRequests("open"), FREEZE_SHIFT, CACHE, reuseAll, (s) => console.log(s));
writeFileSync(`${OUT}wave-levels.md`, waveLevelsMarkdown(table));
const area = areaFigure();
writeFileSync(`${OUT}fig-area-35.svg`, area.svg);
writeFileSync(`${OUT}fig-decomposition-35.svg`, decompositionFigure(table));
console.log(`wave levels: wrote out/wave-levels.md, out/fig-area-35.svg, out/fig-decomposition-35.svg`);
