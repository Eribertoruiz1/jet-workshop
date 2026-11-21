/**
 * Candidate B: Sears-Haack level times E_WD, with the transonic shape of
 * AeroSandbox (PLAN.md, section 5, revision 2).
 *
 * Level: (D/q)_SH = (9 pi / 2)(A_max / l)^2 (Jones, Report 1284, eq. A3).
 * Shape: `approximate_CD_wave` in aerosandbox/library/aerodynamics/transonic.py
 * (AeroSandbox, MIT License, Copyright (c) 2019-2023 Peter Sharpe; master read
 * on 2026-11-15), reimplemented here from its source lines:
 *   mach_crit = soft-min(mach_crit, 1 - (0.1/80)^(1/3)) (log-sum-exp, hardness 50)
 *   mach_dd   = mach_crit + (0.1/80)^(1/3)
 *   f = 0                                       M < mach_crit
 *       20 (M - mach_crit)^4                    M < mach_dd
 *       cubic Hermite (mach_dd, 20 (0.1/80)^(4/3), slope 0.1) -> (1.05, 1, slope 8)   M < 1.05
 *       cubic Hermite (1.05, 1, slope 8) -> (1.2, 1, slope -4)                        M < 1.2
 *       blend(switch = 4*2*(M - 1.2)/(1.2 - 0.8), high 0.8, low 1.2)                  otherwise
 *   blend weight = 0.5 + 0.5 tanh(switch); the result is CD_wave_at_fully_supersonic * f.
 * Its source attributes the shape to Raymer; Raymer's text is not accessible here.
 */

import { dragDivergenceMach, MCRIT_OFFSET } from "../../../packages/physics/src/index.ts";
import type { Configuration } from "./config.ts";
import { obliqueArea } from "./body.ts";

const KORN_KA = 0.87;

function cubicHermite(x: number, xa: number, xb: number, fa: number, fb: number, da: number, db: number): number {
  const dx = xb - xa;
  const t = (x - xa) / dx;
  return t ** 3 * fb + t * t * (1 - t) * (3 * fb - db * dx) + t * (1 - t) ** 2 * (3 * fa + da * dx) + (1 - t) ** 3 * fa;
}

function softmax(a: number, b: number, hardness: number): number {
  const s = 1 / hardness;
  const m = Math.max(a / s, b / s);
  return (m + Math.log(Math.exp(a / s - m) + Math.exp(b / s - m))) * s;
}

/** AeroSandbox approximate_CD_wave, normalised (CD_wave_at_fully_supersonic = 1). */
export function aerosandboxShape(mach: number, machCritIn: number): number {
  const off = Math.cbrt(0.1 / 80);
  const machCritMax = 1 - off;
  const mc = -softmax(-machCritIn, -machCritMax, 50);
  const mdd = mc + off;
  if (mach < mc) return 0;
  if (mach < mdd) return 20 * (mach - mc) ** 4;
  if (mach < 1.05) return cubicHermite(mach, mdd, 1.05, 20 * Math.pow(0.1 / 80, 4 / 3), 1, 0.1, 8);
  if (mach < 1.2) return cubicHermite(mach, 1.05, 1.2, 1, 1, 8, -4);
  const sw = (4 * 2 * (mach - 1.2)) / (1.2 - 0.8);
  const wHigh = 0.5 + 0.5 * Math.tanh(sw);
  return 0.8 * wHigh + 1.2 * (1 - wHigh);
}

/** Korn-Mason critical Mach number at zero lift, kA = 0.87, mid-chord sweep (the current model's relation). */
export function kornMasonMcrit(thicknessRatio: number, midChordSweepDeg: number, kA = KORN_KA): number {
  return dragDivergenceMach(kA, thicknessRatio, 0, midChordSweepDeg) - MCRIT_OFFSET;
}

/** Largest normal cross-section of the configuration (body plus exposed wing), square inches. */
export function maxNormalArea(cfg: Configuration): { area: number; station: number; endOfVariation: number } {
  const w = cfg.wing;
  const [a, b] = w.support(0);
  let best = 0;
  let station = a;
  for (let i = 0; i <= 4000; i++) {
    const x = a + ((b - a) * i) / 4000;
    const s = obliqueArea(cfg.shape, x, 0) + w.area(x, 0);
    if (s > best) {
      best = s;
      station = x;
    }
  }
  const endOfVariation = Math.max(w.xTE(w.g.etaRoot), w.xTE(w.g.semispan));
  return { area: best, station, endOfVariation };
}

/** Sears-Haack wave drag on the reference area for a length l. */
export function searsHaackCD(aMax: number, length: number, refAreaIn2: number): number {
  return ((9 * Math.PI) / 2) * (aMax / length) ** 2 / refAreaIn2;
}
