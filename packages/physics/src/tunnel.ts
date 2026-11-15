/**
 * Test conditions of the Langley 8-foot transonic tunnel for NACA RM L52B08.
 *
 * The report gives the Reynolds number, based on the mean aerodynamic chord
 * of 7.874 in, as 2.0 million at M 0.50 rising to 2.5 million at M 1.12, with
 * the full variation plotted in its figure 4.
 */

export const REYNOLDS_MAC_AT_M050 = 2.0e6;
export const REYNOLDS_MAC_AT_M112 = 2.5e6;
export const TESTED_MAC_IN = 7.874;

/** Reynolds number per inch of length at the test condition. */
export function reynoldsPerInch(mach: number): number {
  // UNVERIFIED: straight line between the two values stated in the text; check against the report's figure 4.
  const f = (mach - 0.5) / (1.12 - 0.5);
  const reMac = REYNOLDS_MAC_AT_M050 + f * (REYNOLDS_MAC_AT_M112 - REYNOLDS_MAC_AT_M050);
  return reMac / TESTED_MAC_IN;
}
