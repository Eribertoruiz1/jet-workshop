/**
 * Test regions of the J47 and the rule that says when a flight condition falls
 * in one. The rule was written in docs/cp/007.md ("Regla de región") from the
 * list of tested conditions, before any comparison error was computed. This
 * file is that rule in code; change one and the other must change with it.
 */

import { J47_RATED_SPEED_RPM } from "./j47.ts";
import { j47RunToSI, type J47Run } from "./j47-data.ts";

/** Altitudes and flight Mach numbers of the tests. Report text: RM E9G09, page 5. */
export const J47_TESTED_CONDITIONS: readonly { readonly altitude_ft: number; readonly machs: readonly number[] }[] = [
  { altitude_ft: 5000, machs: [0.21] },
  { altitude_ft: 15000, machs: [0.21, 0.53] },
  { altitude_ft: 25000, machs: [0.21, 0.53, 0.72, 0.85, 0.97] },
  { altitude_ft: 35000, machs: [0.21, 0.53, 0.72] },
  { altitude_ft: 45000, machs: [0.21, 0.53] },
  { altitude_ft: 50000, machs: [0.21] },
];

/** A point counts as high speed above this fraction of rated speed, actual speed, not corrected. */
export const HIGH_SPEED_FRACTION = 0.85;
/** Tolerances of the rule: Mach number, relative ambient pressure, relative ambient temperature. */
export const REGION_MACH_TOLERANCE = 0.05;
export const REGION_PRESSURE_TOLERANCE = 0.1;
export const REGION_TEMPERATURE_TOLERANCE = 0.03;
/** Allowance above the highest speed tested in a region. */
export const REGION_SPEED_ALLOWANCE = 0.01;

export function isHighSpeed(speed_rpm: number): boolean {
  return speed_rpm > HIGH_SPEED_FRACTION * J47_RATED_SPEED_RPM;
}

/** Identifier of a region: altitude in feet and nominal Mach number, for example "25000-0.53". */
export function regionId(altitude_ft: number, nominalMach: number): string {
  return `${altitude_ft}-${nominalMach.toFixed(2)}`;
}

/**
 * The region a run belongs to: its altitude and the nearest nominal Mach number
 * of that altitude, if the measured Mach number is within the tolerance. null if
 * the run belongs to no region.
 */
export function regionOfRun(run: J47Run): { readonly altitude_ft: number; readonly nominalMach: number } | null {
  const tested = J47_TESTED_CONDITIONS.find((condition) => condition.altitude_ft === run.altitude_ft);
  if (!tested) return null;
  let nearest: number | null = null;
  for (const mach of tested.machs) {
    if (nearest === null || Math.abs(run.flightMach - mach) < Math.abs(run.flightMach - nearest)) nearest = mach;
  }
  if (nearest === null || Math.abs(run.flightMach - nearest) > REGION_MACH_TOLERANCE) return null;
  return { altitude_ft: run.altitude_ft, nominalMach: nearest };
}

export interface J47Region {
  readonly id: string;
  readonly altitude_ft: number;
  readonly nominalMach: number;
  /** Runs of the region above the high-speed fraction, in table order */
  readonly highSpeedRuns: readonly number[];
  /** Centre: means over the high-speed runs of three measured condition columns, in SI */
  readonly mach: number;
  readonly ambientPressure_Pa: number;
  readonly ambientTemperature_K: number;
  /** Highest speed tested in the region, as a fraction of rated speed */
  readonly maxSpeedFraction: number;
}

/** Builds the regions from the table. A region with no high-speed run has no centre and is left out. */
export function buildJ47Regions(runs: readonly J47Run[]): J47Region[] {
  const regions: J47Region[] = [];
  for (const tested of J47_TESTED_CONDITIONS) {
    for (const nominalMach of tested.machs) {
      const members = runs.filter((run) => {
        const region = regionOfRun(run);
        return (
          region !== null &&
          region.altitude_ft === tested.altitude_ft &&
          region.nominalMach === nominalMach &&
          isHighSpeed(run.engineSpeed_rpm)
        );
      });
      if (members.length === 0) continue;
      const mean = (value: (run: J47Run) => number): number =>
        members.reduce((sum, run) => sum + value(run), 0) / members.length;
      regions.push({
        id: regionId(tested.altitude_ft, nominalMach),
        altitude_ft: tested.altitude_ft,
        nominalMach,
        highSpeedRuns: members.map((run) => run.run),
        mach: mean((run) => run.flightMach),
        ambientPressure_Pa: mean((run) => j47RunToSI(run).ambientPressure_Pa),
        ambientTemperature_K: mean((run) => j47RunToSI(run).ambientTemperature_K),
        maxSpeedFraction: Math.max(...members.map((run) => run.engineSpeed_rpm)) / J47_RATED_SPEED_RPM,
      });
    }
  }
  return regions;
}

/** What the rule needs of a region; `J47Region` has it, and so does the generated list the engine carries. */
export interface RegionCentre {
  readonly id: string;
  readonly mach: number;
  readonly ambientPressure_Pa: number;
  readonly ambientTemperature_K: number;
  readonly maxSpeedFraction: number;
}

/**
 * The region a flight condition falls in, or null. All three must hold: Mach
 * number within 0.05, ambient pressure within 10 percent and ambient temperature
 * within 3 percent of the region's centre. If more than one region qualifies,
 * the nearest wins, each distance divided by its tolerance and added in quadrature.
 */
export function regionOfFlight<R extends RegionCentre>(
  regions: readonly R[],
  condition: { readonly mach: number; readonly ambientPressure_Pa: number; readonly ambientTemperature_K: number },
): R | null {
  let best: R | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    const mach = Math.abs(condition.mach - region.mach) / REGION_MACH_TOLERANCE;
    const pressure = Math.abs(condition.ambientPressure_Pa / region.ambientPressure_Pa - 1) / REGION_PRESSURE_TOLERANCE;
    const temperature =
      Math.abs(condition.ambientTemperature_K / region.ambientTemperature_K - 1) / REGION_TEMPERATURE_TOLERANCE;
    if (!(mach <= 1 && pressure <= 1 && temperature <= 1)) continue;
    const distance = Math.hypot(mach, pressure, temperature);
    if (distance < bestDistance) {
      best = region;
      bestDistance = distance;
    }
  }
  return best;
}

/** Whether a speed, as a fraction of rated speed, is inside what a region tested above the high-speed fraction. */
export function isSpeedTested(region: RegionCentre, speedFraction: number): boolean {
  return speedFraction > HIGH_SPEED_FRACTION && speedFraction <= region.maxSpeedFraction * (1 + REGION_SPEED_ALLOWANCE);
}
