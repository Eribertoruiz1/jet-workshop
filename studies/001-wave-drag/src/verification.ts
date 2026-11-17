/**
 * Numerical verification of the wave-drag integral (PLAN.md, section 6), with
 * no drag data: cases with a known answer, the choice of the smoothing level
 * N0 and of the theta level m0, and the check of the rounded-nose claim.
 *
 * Selection rule (PLAN.md, section 6, "Nivel de suavizado"): N0 is the smallest
 * N that reproduces cases 1, 2, 4 and 5 within 1 % and converges in case 3;
 * m0 is the smallest number of Gauss-Legendre nodes per theta sub-interval
 * that does the same at N0. Case 3 converges when the plateau rule of
 * PREREGISTRATION.md, A.7, holds on N0, 2 N0, 4 N0.
 */

import { bodyTable, ogiveCylinder, type RevolutionShape } from "./body.ts";
import { buildConfiguration, loadConfigs, NOMINAL_GEOMETRY, waveDragCD } from "./config.ts";
import * as T from "./testcases.ts";
import { dragGrid, plateau, THETA_GRADING, type EquivalentBodyPart } from "./wavedrag.ts";

export const N_CANDIDATES = [8, 16, 32, 64];
export const M_CANDIDATES = [2, 4, 8, 16];
export const TOLERANCE = 0.01;

const bodyPart = (shape: RevolutionShape, beta: number): EquivalentBodyPart => {
  const t = bodyTable(shape, beta);
  return { support: () => t.support, sPrime: (X) => t.sPrime(X) };
};

export interface CaseRow {
  case: string;
  label: string;
  mach: number;
  /** relErr[iN][iM] = computed / exact - 1 */
  relErr: number[][];
}

export interface VerificationResult {
  ns: number[];
  ms: number[];
  rows: CaseRow[];
  ogive: { mach: number; cd: number[]; converged: boolean[] }[];
  n0: number;
  m0: number;
  parabolicSeries: number;
  selfCheck: { worstRelative: number; samples: number };
  nose: NoseRow[];
  noseNs: number[];
  grading: typeof THETA_GRADING;
  seconds: number;
}

export interface NoseRow {
  config: string;
  mach: number;
  nose: "polygonal" | "rounded";
  normalMachLE: number;
  cd: number[];
}

function bodyCases(ns: number[], ms: number[]): CaseRow[] {
  const L = 20;
  const A = 1.5;
  const R = Math.sqrt(A / Math.PI);
  const sh = dragGrid([bodyPart(T.searsHaackShape(L, A), 0)], 0, ns, ms);
  const pb = dragGrid([bodyPart(T.parabolicShape(L, R), 0)], 0, ns, ms);
  return [
    { case: "1", label: "Sears-Haack, M = 1 (cortes normales)", mach: 1, relErr: sh.dq.map((r) => r.map((v) => v / T.searsHaackExact(L, A) - 1)) },
    { case: "2", label: "Arco parabólico, M = 1 (cortes normales)", mach: 1, relErr: pb.dq.map((r) => r.map((v) => v / T.parabolicBodyExact(L, R) - 1)) },
  ];
}

function ellipticCases(ns: number[], ms: number[]): CaseRow[] {
  const rows: CaseRow[] = [];
  const a = 5;
  const z = 0.2;
  for (const ba of [0.5, 1, 2, 3]) {
    for (const M of [1.05, 1.2, 1.4, 1.6]) {
      const b = ba * a;
      const g = dragGrid([T.ellipticWing(a, b, z)], Math.sqrt(M * M - 1), ns, ms);
      const ex = T.ellipticWingExact(M, a, b, z);
      rows.push({ case: "4", label: `Ala elíptica, b/a = ${ba}`, mach: M, relErr: g.dq.map((r) => r.map((v) => v / (Math.PI * a * b) / ex - 1)) });
    }
  }
  return rows;
}

function rectangularCases(ns: number[], ms: number[]): CaseRow[] {
  const rows: CaseRow[] = [];
  const tau = 0.05;
  for (const M of [1.25, 1.6]) {
    const beta = Math.sqrt(M * M - 1);
    for (const A of [2, 4, 8, 16, 32]) {
      const g = dragGrid([T.rectangularWing(1, A, tau)], beta, ns, ms, [{ theta: Math.PI / 2, strong: true }]);
      const ex = T.ackeretBiconvex(M, tau);
      rows.push({ case: "5", label: `Ala rectangular, A = ${A} (βA = ${(beta * A).toFixed(1)})`, mach: M, relErr: g.dq.map((r) => r.map((v) => v / A / ex - 1)) });
    }
  }
  return rows;
}

function ogiveConvergence(n: number, mFinest: number): { mach: number; cd: number[]; converged: boolean[] }[] {
  const f = loadConfigs();
  const shape = ogiveCylinder(f.body.diameterIn / 2, f.body.noseLengthIn);
  const sref = f.planform.areaFt2 * 144;
  return [1.0, 1.1, 1.6].map((M) => {
    const beta = M > 1 ? Math.sqrt(M * M - 1) : 0;
    const g = dragGrid([bodyPart(shape, beta)], beta, [n, 2 * n, 4 * n], [mFinest]);
    const cd = g.dq.map((r) => r[0]! / sref);
    return { mach: M, cd, converged: [plateau([cd[0]!, cd[1]!, cd[2]!]).converged] };
  });
}

/** The fast spanwise integral against the reference one, on random cuts of every configuration and variant. */
export function selfCheck(samples = 2000): { worstRelative: number; samples: number } {
  let worst = 0;
  let count = 0;
  let seed = 20261115;
  const rnd = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (const key of ["open-10.8", "open-35", "open-47", "47deg-t06", "47deg-t09", "47deg-root12-t06"]) {
    for (const v of [
      NOMINAL_GEOMETRY,
      { ...NOMINAL_GEOMETRY, nose: "rounded" as const },
      { ...NOMINAL_GEOMETRY, interpolation: "spline" as const },
      { ...NOMINAL_GEOMETRY, trailingEdge: "closed" as const },
      { ...NOMINAL_GEOMETRY, rootRule: "scaled" as const },
    ]) {
      const w = buildConfiguration(key, v).wing;
      for (let i = 0; i < samples / 10; i++) {
        const k = (rnd() * 2 - 1) * 1.3;
        const [a, b] = w.support(Math.abs(k));
        const X = a + (b - a) * rnd();
        const f = w.sPrimeHalf(X, k);
        const g = w.sPrimeHalfGeneral(X, k);
        worst = Math.max(worst, Math.abs(f - g) / Math.max(1e-3, Math.abs(g)));
        count++;
      }
    }
  }
  return { worstRelative: worst, samples: count };
}

export const NOSE_NS = [32, 64, 128, 256, 512, 1024, 2048, 4096];
const NOSE_CASES: [string, number][] = [
  ["open-10.8", 1.114],
  ["10.8deg-t04", 1.6],
  ["35deg-t04", 1.6],
  ["47deg-t04", 1.6],
];

export function noseCheck(m: number): NoseRow[] {
  const rows: NoseRow[] = [];
  for (const [key, M] of NOSE_CASES) {
    for (const nose of ["polygonal", "rounded"] as const) {
      const cfg = buildConfiguration(key, { ...NOMINAL_GEOMETRY, nose });
      const r = waveDragCD(cfg, M, NOSE_NS, [m]);
      const tanLE = cfg.lines[0]!.tan;
      rows.push({ config: key, mach: M, nose, normalMachLE: M * Math.cos(Math.atan(tanLE)), cd: r.total.map((row) => row[0]!) });
    }
  }
  return rows;
}

export function runVerification(): VerificationResult {
  const t0 = performance.now();
  const ns = N_CANDIDATES;
  const ms = M_CANDIDATES;
  const rows = [...bodyCases(ns, ms), ...ellipticCases(ns, ms), ...rectangularCases(ns, ms)];
  const passes = (iN: number, iM: number): boolean => rows.every((r) => Math.abs(r.relErr[iN]![iM]!) <= TOLERANCE);
  const finestM = ms.length - 1;
  let n0 = -1;
  for (let i = 0; i < ns.length && n0 < 0; i++) {
    if (!passes(i, finestM)) continue;
    const og = ogiveConvergence(ns[i]!, ms[finestM]!);
    if (og.every((o) => o.converged[0])) n0 = ns[i]!;
  }
  if (n0 < 0) throw new Error("no smoothing level passes the verification");
  const iN0 = ns.indexOf(n0);
  let m0 = -1;
  for (let j = 0; j < ms.length && m0 < 0; j++) if (passes(iN0, j)) m0 = ms[j]!;
  if (m0 < 0) throw new Error("no theta level passes the verification at N0");
  const ogive = ogiveConvergence(n0, ms[finestM]!);
  const nose = noseCheck(m0);
  return {
    ns,
    ms,
    rows,
    ogive,
    n0,
    m0,
    parabolicSeries: T.parabolicSeriesCheck(),
    selfCheck: selfCheck(),
    nose,
    noseNs: NOSE_NS,
    grading: { ...THETA_GRADING },
    seconds: (performance.now() - t0) / 1000,
  };
}
