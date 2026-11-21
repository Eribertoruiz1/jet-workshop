/**
 * Wing-body configurations of the study, built from geometry/configs.json and
 * geometry/airfoils.json, with the uncertain geometric inputs of PLAN.md,
 * section 7, as options:
 * - I1 `wingShiftIn`: the wing moved along the body;
 * - I2 `interpolation`: spline between stations;
 * - I6 `rootRule`: for 47deg-root12-t06, the 6 % section scaled to the local thickness;
 * - I7 `trailingEdge`: the 4 % section closed;
 * - I8 `nose`: rounded nose.
 * I4 (sting) is not active: RM L52B08 figure 3 shows no other support.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bodyTable, ogiveCylinder, type RevolutionShape } from "./body.ts";
import { chords } from "./planform.ts";
import { NOMINAL_SECTION_OPTIONS, sectionModel, type SectionOptions } from "./section.ts";
import { dragGrid, singularThetas, type DragGrid, type EquivalentBodyPart } from "./wavedrag.ts";
import { TrapezoidWing, type SpanTerm } from "./wing.ts";

const DEG = Math.PI / 180;

interface ConfigsFile {
  body: { diameterIn: number; noseLengthIn: number; noseOgiveRadiusIn: number; lengthIn: Record<string, number> };
  planform: { aspectRatio: number; taperRatio: number; spanIn: number; areaFt2: number };
  wingPosition: { macQuarterChordStationIn: number; printedRootQuarterChordIn: Record<string, number>; printedApex47In: number; uncertaintyIn: number };
  configurations: Record<
    string,
    {
      sweepQuarterChordDeg: number;
      thickness: { kind: "uniform"; section: string } | { kind: "root-taper"; rootSection: string; outerSection: string; taperEndSemispanFraction: number };
      bodyLength: string | Record<string, string>;
    }
  >;
}

const FILE = fileURLToPath(new URL("../geometry/configs.json", import.meta.url));
let cache: ConfigsFile | null = null;
export function loadConfigs(): ConfigsFile {
  if (!cache) cache = JSON.parse(readFileSync(FILE, "utf8")) as ConfigsFile;
  return cache;
}

export type RootRule = "ordinates" | "scaled";

export interface GeometryOptions extends SectionOptions {
  wingShiftIn: number;
  rootRule: RootRule;
}

export const NOMINAL_GEOMETRY: GeometryOptions = { ...NOMINAL_SECTION_OPTIONS, wingShiftIn: 0, rootRule: "ordinates" };

export interface Configuration {
  id: string;
  sweepQuarterChordDeg: number;
  wing: TrapezoidWing;
  shape: RevolutionShape & { ogiveRadius: number };
  refAreaIn2: number;
  /** tan of the sweep of every tabulated station line, with its strength for the theta rule */
  lines: { xi: number; tan: number; strong: boolean }[];
  /** Representative thickness ratio for D (area-weighted mean over the exposed wing) */
  meanThickness: number;
  maxThicknessRoot: number;
}

/** Map a study configuration id (open or held-out) to its entry in configs.json. */
export function configKey(id: string, open: boolean): string {
  if (open) return `open-${id.replace("deg-t04", "")}`;
  return id;
}

export function buildConfiguration(key: string, opts: GeometryOptions = NOMINAL_GEOMETRY): Configuration {
  const f = loadConfigs();
  const c = f.configurations[key];
  if (!c) throw new Error(`unknown configuration ${key}`);
  const ch = chords({ aspectRatio: f.planform.aspectRatio, taperRatio: f.planform.taperRatio, spanIn: f.planform.spanIn });
  const cr = ch.rootChordIn;
  const ct = ch.tipChordIn;
  const s = ch.semispanIn;
  const tanQC = Math.tan(c.sweepQuarterChordDeg * DEG);
  const dc = (cr - ct) / s;
  const tanLE = tanQC + 0.25 * dc;
  // Apex from the quarter-chord point of the mean aerodynamic chord.
  const yMac = (s * (1 + 2 * f.planform.taperRatio)) / (3 * (1 + f.planform.taperRatio));
  const cMac = (2 / 3) * cr * (1 + f.planform.taperRatio + f.planform.taperRatio ** 2) / (1 + f.planform.taperRatio);
  const xMacLE = f.wingPosition.macQuarterChordStationIn + opts.wingShiftIn - 0.25 * cMac;
  const xApex = xMacLE - yMac * tanLE;
  const R = f.body.diameterIn / 2;
  const sec: SectionOptions = { nose: opts.nose, trailingEdge: opts.trailingEdge, interpolation: opts.interpolation };
  let terms: SpanTerm[];
  let meanThickness: number;
  let maxThicknessRoot: number;
  if (c.thickness.kind === "uniform") {
    const m = sectionModel(c.thickness.section, sec);
    terms = [{ section: m, weight: [[0, 1], [s, 1]] }];
    meanThickness = m.maxThickness;
    maxThicknessRoot = m.maxThickness;
  } else {
    const root = sectionModel(c.thickness.rootSection, sec);
    const outer = sectionModel(c.thickness.outerSection, sec);
    const e = c.thickness.taperEndSemispanFraction * s;
    if (opts.rootRule === "ordinates") {
      terms = [
        { section: root, weight: [[0, 1], [e, 0], [s, 0]] },
        { section: outer, weight: [[0, 0], [e, 1], [s, 1]] },
      ];
    } else {
      const k = root.maxThickness / outer.maxThickness;
      terms = [{ section: outer, weight: [[0, k], [e, 1], [s, 1]] }];
    }
    // Exposed-area-weighted mean of the local maximum thickness ratio.
    let num = 0;
    let den = 0;
    for (let i = 0; i < 2000; i++) {
      const eta = R + ((i + 0.5) * (s - R)) / 2000;
      const w = eta < e ? eta / e : 1;
      const tau = (1 - w) * root.maxThickness + w * outer.maxThickness;
      const chord = cr - dc * eta;
      num += tau * chord;
      den += chord;
    }
    meanThickness = num / den;
    maxThicknessRoot = root.maxThickness;
  }
  const wing = new TrapezoidWing({ xApex, rootChord: cr, tipChord: ct, semispan: s, tanLE, etaRoot: R, terms });
  const shape = ogiveCylinder(R, f.body.noseLengthIn);
  const xi = terms[0]!.section.xi;
  const lines = xi.map((x, i) => ({ xi: x, tan: tanLE - x * dc, strong: i === 0 || i === 1 || i === xi.length - 1 }));
  return { id: key, sweepQuarterChordDeg: c.sweepQuarterChordDeg, wing, shape, refAreaIn2: f.planform.areaFt2 * 144, lines, meanThickness, maxThicknessRoot };
}

/** Equivalent-body parts of a configuration at a Mach number: [wing, body]. */
export function parts(cfg: Configuration, beta: number): EquivalentBodyPart[] {
  const t = bodyTable(cfg.shape, beta);
  return [
    { support: (k) => cfg.wing.support(k), sPrime: (X, k) => cfg.wing.sPrime(X, k) },
    { support: () => t.support, sPrime: (X) => t.sPrime(X) },
  ];
}

/**
 * Wave drag (CD on the reference area) at a Mach number >= 1 for the whole
 * configuration (A: wing and body together), the wing alone and the body
 * alone (C = wing + body, no interference). The three share one equivalent-body
 * interval, so A - C is the interference term at the same smoothing.
 */
export function waveDragCD(cfg: Configuration, mach: number, ns: number[], nThetas: number[]): { grid: DragGrid; total: number[][]; wing: number[][]; body: number[][] } {
  const beta = mach > 1 ? Math.sqrt(mach * mach - 1) : 0;
  const sing = beta > 0 ? singularThetas(beta, cfg.lines) : [];
  const grid = dragGrid(parts(cfg, beta), beta, ns, nThetas, sing, [[0, 1], [0], [1]]);
  const cd = (g: number[][]): number[][] => g.map((r) => r.map((v) => v / cfg.refAreaIn2));
  return { grid, total: cd(grid.groups[0]!), wing: cd(grid.groups[1]!), body: cd(grid.groups[2]!) };
}
