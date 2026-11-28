/**
 * Check 7 of brief 007: how long one call to the engine takes.
 *
 *   corepack pnpm exec tsx studies/002-engine-cycle/bench.ts
 *
 * Median over many calls of `step`, after warming up, on flight conditions and throttle
 * settings that change from call to call. The figure depends on the machine, so it is
 * printed here and reported in docs/cp/007.md, not written into the study.
 */

import { cpus } from "node:os";
import { designEngine, j47Design } from "../../packages/physics/src/propulsion/index.ts";

const built = designEngine({ ...j47Design(), afterburner: true });
if (!built.ok) throw new Error("the J47 design was rejected");
const engine = built.engine;
const state = engine.initialState();

// 400 flight conditions from sea level to about 13 km and Mach 0 to 0.95, and 11 throttle settings.
const conditions = Array.from({ length: 400 }, (_, i) => ({
  ambient: { pressure_Pa: 101325 - 212 * i, temperature_K: 288.15 - 0.179 * i },
  mach: (i % 20) * 0.05,
}));
const call = (k: number): number => {
  const condition = conditions[k % conditions.length];
  if (!condition) throw new Error("no condition");
  return engine.step(state, { throttle: (k % 11) / 10, afterburner: k % 7 === 0 }, condition, 1 / 120).output.thrust_N;
};

const CALLS = 50000;
let checksum = 0;
for (let k = 0; k < CALLS; k++) checksum += call(k);
const times = new Float64Array(CALLS);
for (let k = 0; k < CALLS; k++) {
  const start = performance.now();
  checksum += call(k);
  times[k] = performance.now() - start;
}
times.sort();
const at = (fraction: number): string => (times[Math.floor(fraction * (CALLS - 1))] ?? Number.NaN).toFixed(4);
console.log(`node ${process.version}, ${cpus()[0]?.model.trim() ?? "unknown cpu"}`);
console.log(`${CALLS} calls after ${CALLS} of warm-up`);
console.log(`median ${at(0.5)} ms, 90th percentile ${at(0.9)} ms, 99th percentile ${at(0.99)} ms per call`);
console.log(`checksum ${checksum.toFixed(0)}`);
