/**
 * pnpm validate: score every model against the digitized datasets and write
 * the validation report. Usage: tsx packages/validation/src/cli.ts [dataset.csv] [report.md] [body.csv]
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadBodyDataset, loadDataset } from "./data.ts";
import { buildReport } from "./report.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const datasetPath = resolve(process.argv[2] ?? resolve(here, "../data/bielat-l52b08.csv"));
const reportPath = resolve(process.argv[3] ?? resolve(here, "../report/validation-report.md"));
const bodyPath = resolve(process.argv[4] ?? resolve(here, "../data/bielat-l51i04a-body.csv"));

const data = loadDataset(readFileSync(datasetPath, "utf8"));
const show = (path: string): string => {
  const label = relative(root, path).replaceAll("\\", "/");
  return label.startsWith("..") ? "a dataset given on the command line" : label;
};
const body = existsSync(bodyPath) ? { points: loadBodyDataset(readFileSync(bodyPath, "utf8")), label: show(bodyPath) } : null;
const { markdown } = buildReport(data, show(datasetPath), body);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, markdown + "\n", "utf8");
process.stdout.write(markdown + "\n");
process.stdout.write(`\nReport written to ${relative(root, reportPath).replaceAll("\\", "/")}\n`);
