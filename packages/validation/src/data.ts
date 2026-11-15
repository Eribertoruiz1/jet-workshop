/**
 * The digitized NACA RM L52B08 dataset: parse the CSV and assemble points.
 *
 * Two data classes, never mixed:
 * - "measured": the hollow symbols of the polars (figures 5-7). Figure (b)
 *   gives CL and CD of each test point; figure (a) gives CL and angle of attack.
 * - "naca_faired_crossplot": samples of the faired curves NACA drew in
 *   figure 9 (drag coefficient at zero lift against Mach number). Not measured
 *   points; reported separately.
 *
 * A second, separate file holds the body-alone drag of NACA RM L51I04a,
 * figure 16(b): the same body, tested without wings (brief 001, Amendment 3,
 * point 2). Its rows have the same columns, with "body alone" as the wing.
 */

import type { TestedWingId } from "@jet-workshop/physics";

export type DataClass = "measured" | "naca_faired_crossplot";

export interface Row {
  figureId: string;
  figure: string;
  pdfPage: number;
  printedPage: number;
  wing: TestedWingId;
  mach: number;
  series: string;
  pointId: string;
  variable: string;
  valuePassA: number;
  valuePassB: number;
  value: number;
  passDifference: number;
  uPixelFloor: number;
  uDigitization: number;
  uDeclared: number;
  uTotal: number;
  dataClass: DataClass;
  flags: string;
  note: string;
}

export interface PolarPoint {
  wing: TestedWingId;
  mach: number;
  figure: string;
  series: string;
  pointId: string;
  cl: number;
  uCl: number;
  cd: number;
  uCd: number;
  flags: string;
  note: string;
}

export interface LiftPoint {
  wing: TestedWingId;
  mach: number;
  figure: string;
  series: string;
  pointId: string;
  cl: number;
  uCl: number;
  alpha: number;
  uAlpha: number;
}

export interface FairedSample {
  wing: TestedWingId;
  mach: number;
  cd0: number;
  uCd0: number;
  flags: string;
}

export interface Dataset {
  rows: Row[];
  polar: PolarPoint[];
  lift: LiftPoint[];
  faired: FairedSample[];
}

/** One measured symbol of the body-alone drag figure: drag coefficient on the wing area at an angle of attack. */
export interface BodyPoint {
  document: string;
  figure: string;
  pdfPage: number;
  printedPage: number;
  mach: number;
  series: string;
  pointId: string;
  alpha: number;
  uAlpha: number;
  cd: number;
  uCd: number;
  flags: string;
  note: string;
}

/** RFC 4180 CSV: comma separated, double-quoted fields, doubled quotes inside. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") out.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    out.push(row);
  }
  return out;
}

const WINGS: Record<string, TestedWingId> = { "10.8 deg": "10.8", "35 deg": "35", "47 deg": "47" };

type RawRow = Omit<Row, "wing"> & { document: string; wingLabel: string };

function readRows(text: string): RawRow[] {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error("empty dataset");
  const col = (name: string): number => {
    const i = header.indexOf(name);
    if (i < 0) throw new Error(`dataset column missing: ${name}`);
    return i;
  };
  const c = {
    document: col("document"), figureId: col("figure_id"), figure: col("figure"), pdfPage: col("pdf_page"), printedPage: col("printed_page"),
    wing: col("wing"), mach: col("mach"), series: col("series"), pointId: col("point_id"), variable: col("variable"),
    a: col("value_pass_a"), b: col("value_pass_b"), v: col("value_adopted"), diff: col("pass_difference"),
    floor: col("u_pixel_floor"), dig: col("u_digitization"), dec: col("u_declared"), tot: col("u_total"),
    cls: col("data_class"), flags: col("flags"), note: col("note"),
  };
  return body.map((r) => {
    const cls = r[c.cls];
    if (cls !== "measured" && cls !== "naca_faired_crossplot") throw new Error(`unknown data class: ${cls}`);
    const num = (i: number): number => Number(r[i]);
    return {
      document: r[c.document]!, figureId: r[c.figureId]!, figure: r[c.figure]!, pdfPage: num(c.pdfPage), printedPage: num(c.printedPage),
      wingLabel: r[c.wing] ?? "", mach: num(c.mach), series: r[c.series]!, pointId: r[c.pointId]!, variable: r[c.variable]!,
      valuePassA: num(c.a), valuePassB: num(c.b), value: num(c.v), passDifference: num(c.diff), uPixelFloor: num(c.floor),
      uDigitization: num(c.dig), uDeclared: num(c.dec), uTotal: num(c.tot), dataClass: cls, flags: r[c.flags] ?? "", note: r[c.note] ?? "",
    };
  });
}

export function parseRows(text: string): Row[] {
  return readRows(text).map(({ document: _document, wingLabel, ...r }) => {
    const wing = WINGS[wingLabel];
    if (!wing) throw new Error(`unknown wing: ${wingLabel}`);
    return { ...r, wing };
  });
}

/** The body-alone dataset: one point per symbol, CD and alpha from the same symbol, never mixed with the wing-body data. */
export function loadBodyDataset(text: string): BodyPoint[] {
  const rows = readRows(text);
  const groups = new Map<string, RawRow[]>();
  for (const r of rows) {
    if (r.wingLabel !== "body alone") throw new Error(`not a body-alone row: ${r.wingLabel}`);
    if (r.dataClass !== "measured") throw new Error(`body-alone rows are measured symbols, not ${r.dataClass}`);
    const k = `${r.series}|${r.pointId}`;
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const out: BodyPoint[] = [];
  for (const g of groups.values()) {
    const cd = g.find((r) => r.variable === "CD");
    const alpha = g.find((r) => r.variable === "alpha");
    if (!cd || !alpha) throw new Error(`incomplete body-alone point: ${g[0]!.series} ${g[0]!.pointId}`);
    out.push({
      document: cd.document, figure: cd.figure, pdfPage: cd.pdfPage, printedPage: cd.printedPage, mach: cd.mach, series: cd.series,
      pointId: cd.pointId, alpha: alpha.value, uAlpha: alpha.uTotal, cd: cd.value, uCd: cd.uTotal,
      flags: [cd.flags, alpha.flags].filter(Boolean).filter((f, i, a) => a.indexOf(f) === i).join("; "), note: cd.note || alpha.note,
    });
  }
  return out.sort((a, b) => a.mach - b.mach || a.alpha - b.alpha);
}

export function assemble(rows: Row[]): Dataset {
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = `${r.series}|${r.pointId}`;
    const g = groups.get(k);
    if (g) g.push(r);
    else groups.set(k, [r]);
  }
  const polar: PolarPoint[] = [];
  const lift: LiftPoint[] = [];
  const faired: FairedSample[] = [];
  for (const g of groups.values()) {
    const first = g[0]!;
    const get = (v: string): Row | undefined => g.find((r) => r.variable === v);
    if (first.dataClass === "naca_faired_crossplot") {
      const r = get("CD0");
      if (r) faired.push({ wing: r.wing, mach: r.mach, cd0: r.value, uCd0: r.uTotal, flags: r.flags });
      continue;
    }
    const cl = get("CL");
    const cd = get("CD");
    const alpha = get("alpha");
    if (cl && cd) {
      polar.push({ wing: first.wing, mach: first.mach, figure: first.figure, series: first.series, pointId: first.pointId,
        cl: cl.value, uCl: cl.uTotal, cd: cd.value, uCd: cd.uTotal, flags: [cl.flags, cd.flags].filter(Boolean).join("; "),
        note: cd.note || cl.note });
    } else if (cl && alpha) {
      lift.push({ wing: first.wing, mach: first.mach, figure: first.figure, series: first.series, pointId: first.pointId,
        cl: cl.value, uCl: cl.uTotal, alpha: alpha.value, uAlpha: alpha.uTotal });
    }
  }
  const byWingMach = <T extends { wing: string; mach: number }>(a: T, b: T): number => a.wing.localeCompare(b.wing) || a.mach - b.mach;
  polar.sort((a, b) => byWingMach(a, b) || a.cl - b.cl);
  lift.sort((a, b) => byWingMach(a, b) || a.alpha - b.alpha);
  faired.sort(byWingMach);
  return { rows, polar, lift, faired };
}

export function loadDataset(text: string): Dataset {
  return assemble(parseRows(text));
}
