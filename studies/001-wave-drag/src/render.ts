/**
 * Fills study.template.md with generated tables and numbers and writes
 * docs/studies/001-wave-drag-method.md. Markers:
 *   {{s:name}}       a generated table (study snippets)
 *   {{n:key}}        a value as text
 *   {{nD:key}}       a number with D decimals (D = 0, 1, 3 or 4); key "onset:<id>" is that curve's largest onset error
 *   {{t:thresholds}} the thresholds
 *   {{v:summary}} / {{v:nose}}  sections of out/verification.md
 * An unknown marker stops the run, so no marker can be left unfilled.
 */

import { readFileSync, writeFileSync } from "node:fs";
import type { CandidateResult } from "./evaluate.ts";
import { thresholdsText } from "./report-study.ts";

function section(md: string, heading: string): string {
  const start = md.indexOf(heading);
  if (start < 0) throw new Error(`section not found: ${heading}`);
  const body = md.slice(start + heading.length);
  const next = body.search(/\n## /);
  return (next < 0 ? body : body.slice(0, next)).trim();
}

export function renderStudy(templatePath: string, outPath: string, snippets: Record<string, string>, numbers: Record<string, number | string | null>, results: CandidateResult[], verificationMd: string): void {
  const tpl = readFileSync(templatePath, "utf8");
  const v: Record<string, string> = {
    summary: section(verificationMd, "## Niveles fijados"),
    nose: section(verificationMd, "## La afirmación del PM sobre la nariz redondeada"),
  };
  const num = (key: string): number | string | null => {
    if (key.startsWith("onset:")) {
      const r = results.find((x) => x.id === key.slice(6));
      if (!r) throw new Error(`unknown curve ${key}`);
      return r.metrics.onsetMaxAbs;
    }
    if (!(key in numbers)) throw new Error(`unknown number ${key}`);
    return numbers[key]!;
  };
  const out = tpl.replace(/\{\{(\w+):([^}]+)\}\}/g, (_, kind: string, key: string) => {
    if (kind === "s") {
      if (!(key in snippets)) throw new Error(`unknown snippet ${key}`);
      return snippets[key]!;
    }
    if (kind === "v") {
      if (!(key in v)) throw new Error(`unknown verification section ${key}`);
      return v[key]!;
    }
    if (kind === "t") return thresholdsText();
    if (kind === "n") return String(num(key) ?? "ninguno");
    const m = /^n(\d)$/.exec(kind);
    if (m) {
      const x = num(key);
      return typeof x === "number" && Number.isFinite(x) ? x.toFixed(Number(m[1])) : "NA";
    }
    throw new Error(`unknown marker ${kind}:${key}`);
  });
  writeFileSync(outPath, out);
}
