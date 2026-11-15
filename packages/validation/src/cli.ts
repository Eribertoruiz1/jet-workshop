/**
 * pnpm validate: score every model against the digitized dataset and write
 * the validation report. Usage: tsx packages/validation/src/cli.ts [dataset.csv] [report.md]
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDataset } from "./data.ts";
import { buildReport } from "./report.ts";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../..");
const datasetPath = resolve(process.argv[2] ?? resolve(here, "../data/bielat-l52b08.csv"));
const reportPath = resolve(process.argv[3] ?? resolve(here, "../report/validation-report.md"));

const data = loadDataset(readFileSync(datasetPath, "utf8"));
const label = relative(root, datasetPath).replaceAll("\\", "/");
const { markdown } = buildReport(data, label.startsWith("..") ? "the dataset given on the command line" : label);
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, markdown + "\n", "utf8");
process.stdout.write(markdown + "\n");
process.stdout.write(`\nReport written to ${relative(root, reportPath).replaceAll("\\", "/")}\n`);
