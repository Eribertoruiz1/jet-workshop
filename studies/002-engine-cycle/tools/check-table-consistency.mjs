// Internal consistency of RM E9G09 table I, as transcribed: columns the report
// derived from other columns are recomputed and compared with the printed value.
// It is a control of transcription and of misprints, and changes nothing.
//
// Usage: node studies/002-engine-cycle/tools/check-table-consistency.mjs <table.csv>

import { readFileSync } from "node:fs";

const [path] = process.argv.slice(2);
const lines = readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim() !== "");
const header = lines[0].split(",");
const rows = lines.slice(1).map((line) => Object.fromEntries(line.split(",").map((cell, i) => [header[i], cell])));

const GAMMA = 1.4;
const checks = [
  {
    name: "flight Mach number from the ram pressure ratio, equation 1",
    printed: (r) => Number(r.flight_mach),
    computed: (r) => Math.sqrt((2 / (GAMMA - 1)) * (Number(r.ram_pressure_ratio) ** ((GAMMA - 1) / GAMMA) - 1)),
    tolerance: () => 0.006,
  },
  {
    name: "specific fuel consumption = fuel flow / net thrust",
    printed: (r) => (r.sfc_lb_h_lbf === "" ? Number.NaN : Number(r.sfc_lb_h_lbf)),
    computed: (r) => Number(r.fuel_flow_lb_h) / Number(r.net_thrust_lbf),
    tolerance: (r) => 0.01 * Math.abs(Number(r.fuel_flow_lb_h) / Number(r.net_thrust_lbf)),
  },
  {
    name: "fuel-air ratio = fuel flow / (3600 air flow)",
    printed: (r) => Number(r.fuel_air_ratio),
    computed: (r) => Number(r.fuel_flow_lb_h) / 3600 / Number(r.air_flow_lb_s),
    tolerance: () => 0.00011,
  },
  {
    name: "engine total-temperature ratio = T7 / (te ram^((gamma-1)/gamma)), equation 3",
    printed: (r) => Number(r.engine_total_temperature_ratio),
    computed: (r) =>
      Number(r.exhaust_gas_total_temperature_R) /
      (Number(r.equivalent_ambient_temperature_R) * Number(r.ram_pressure_ratio) ** ((GAMMA - 1) / GAMMA)),
    tolerance: (r) => 0.006 * Number(r.engine_total_temperature_ratio),
  },
];

for (const check of checks) {
  const failures = [];
  let compared = 0;
  for (const row of rows) {
    const printed = check.printed(row);
    const computed = check.computed(row);
    if (!Number.isFinite(printed) || !Number.isFinite(computed)) continue;
    compared += 1;
    if (Math.abs(printed - computed) > check.tolerance(row)) {
      failures.push(`  run ${row.run}: printed ${printed}, recomputed ${computed.toFixed(4)}`);
    }
  }
  console.log(`${check.name}: ${compared} rows compared, ${failures.length} outside tolerance`);
  for (const failure of failures) console.log(failure);
}
