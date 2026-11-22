/**
 * Thermodynamic data of the five species of the working gas, as NASA Glenn
 * least-squares coefficients.
 *
 * Source: McBride, Zehe and Gordon, "NASA Glenn Coefficients for Calculating
 * Thermodynamic Properties of Individual Species", NASA/TP-2002-211556 (2002),
 * NTRS 20020085330. Data class: computed (a published fit to thermodynamic
 * functions, not a measurement of an engine).
 *
 * Form, equations 1 to 3 of the report (PDF pages 10 and 51), with T in kelvin:
 *   Cp/R   =  a1/T^2 + a2/T + a3 + a4 T + a5 T^2 + a6 T^3 + a7 T^4
 *   H/(RT) = -a1/T^2 + a2 ln(T)/T + a3 + a4 T/2 + a5 T^2/3 + a6 T^3/4 + a7 T^4/5 + b1/T
 *   S/R    = -a1/(2 T^2) - a2/T + a3 ln(T) + a4 T + a5 T^2/2 + a6 T^3/3 + a7 T^4/4 + b2
 * H is the enthalpy with the heat of formation at 298.15 K included; S is at 1 bar.
 * Each row below is [a1, a2, a3, a4, a5, a6, a7, b1, b2] for one interval:
 * `low` from 200 to 1000 K, `high` from 1000 to 6000 K (PDF page 11).
 *
 * The block between the markers is generated from the text layer of the report by
 * studies/002-engine-cycle/tools/extract-glenn-coefficients.mjs. Do not edit it by hand.
 */

export type SpeciesName = "N2" | "O2" | "Ar" | "CO2" | "H2O";

interface SpeciesRecord {
  readonly molarMass_g_mol: number;
  readonly low: readonly number[];
  readonly high: readonly number[];
}

export const GLENN_SPECIES: Readonly<Record<SpeciesName, SpeciesRecord>> = {
  // BEGIN GENERATED
  N2: {
    molarMass_g_mol: 28.0134000,
    low: [2.210371497e+04, -3.818461820e+02, 6.082738360e+00, -8.530914410e-03, 1.384646189e-05, -9.625793620e-09, 2.519705809e-12, 7.108460860e+02, -1.076003744e+01],
    high: [5.877124060e+05, -2.239249073e+03, 6.066949220e+00, -6.139685500e-04, 1.491806679e-07, -1.923105485e-11, 1.061954386e-15, 1.283210415e+04, -1.586640027e+01],
  },
  O2: {
    molarMass_g_mol: 31.9988000,
    low: [-3.425563420e+04, 4.847000970e+02, 1.119010961e+00, 4.293889240e-03, -6.836300520e-07, -2.023372700e-09, 1.039040018e-12, -3.391454870e+03, 1.849699470e+01],
    high: [-1.037939022e+06, 2.344830282e+03, 1.819732036e+00, 1.267847582e-03, -2.188067988e-07, 2.053719572e-11, -8.193467050e-16, -1.689010929e+04, 1.738716506e+01],
  },
  Ar: {
    molarMass_g_mol: 39.9480000,
    low: [0.000000000e+00, 0.000000000e+00, 2.500000000e+00, 0.000000000e+00, 0.000000000e+00, 0.000000000e+00, 0.000000000e+00, -7.453750000e+02, 4.379674910e+00],
    high: [2.010538475e+01, -5.992661070e-02, 2.500069401e+00, -3.992141160e-08, 1.205272140e-11, -1.819015576e-15, 1.078576636e-19, -7.449939610e+02, 4.379180110e+00],
  },
  CO2: {
    molarMass_g_mol: 44.0095000,
    low: [4.943650540e+04, -6.264116010e+02, 5.301725240e+00, 2.503813816e-03, -2.127308728e-07, -7.689988780e-10, 2.849677801e-13, -4.528198460e+04, -7.048279440e+00],
    high: [1.176962419e+05, -1.788791477e+03, 8.291523190e+00, -9.223156780e-05, 4.863676880e-09, -1.891053312e-12, 6.330036590e-16, -3.908350590e+04, -2.652669281e+01],
  },
  H2O: {
    molarMass_g_mol: 18.0152800,
    low: [-3.947960830e+04, 5.755731020e+02, 9.317826530e-01, 7.222712860e-03, -7.342557370e-06, 4.955043490e-09, -1.336933246e-12, -3.303974310e+04, 1.724205775e+01],
    high: [1.034972096e+06, -2.412698562e+03, 4.646110780e+00, 2.291998307e-03, -6.836830480e-07, 9.426468930e-11, -4.822380530e-15, -1.384286509e+04, -7.978148510e+00],
  },
  // END GENERATED
};

/** Universal gas constant the report uses with its coefficients, J/(mol K) (PDF page 15). */
export const GLENN_GAS_CONSTANT_J_MOL_K = 8.31451;

/** Lower and upper ends of the fitted range, K. Nothing is extrapolated outside it. */
export const GLENN_MIN_TEMPERATURE_K = 200;
export const GLENN_MAX_TEMPERATURE_K = 6000;
const GLENN_JOINT_TEMPERATURE_K = 1000;

/** The nine coefficients of a species that apply at temperature T. */
export function glennCoefficients(species: SpeciesName, temperature_K: number): readonly number[] {
  assertInFittedRange(temperature_K);
  const record = GLENN_SPECIES[species];
  return temperature_K < GLENN_JOINT_TEMPERATURE_K ? record.low : record.high;
}

export function assertInFittedRange(temperature_K: number): void {
  if (!(temperature_K >= GLENN_MIN_TEMPERATURE_K && temperature_K <= GLENN_MAX_TEMPERATURE_K)) {
    throw new RangeError(
      `temperature ${temperature_K} K is outside the fitted range, ` +
        `${GLENN_MIN_TEMPERATURE_K} to ${GLENN_MAX_TEMPERATURE_K} K`,
    );
  }
}

/** Cp/R of a coefficient row at T. */
export function cpOverR(c: readonly number[], T: number): number {
  const [a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0, a7 = 0] = c;
  return a1 / (T * T) + a2 / T + a3 + T * (a4 + T * (a5 + T * (a6 + T * a7)));
}

/** H/R of a coefficient row at T, in kelvin. */
export function enthalpyOverR(c: readonly number[], T: number): number {
  const [a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0, a7 = 0, b1 = 0] = c;
  return -a1 / T + a2 * Math.log(T) + T * (a3 + T * (a4 / 2 + T * (a5 / 3 + T * (a6 / 4 + (T * a7) / 5)))) + b1;
}

/** S/R of a coefficient row at T. */
export function entropyOverR(c: readonly number[], T: number): number {
  const [a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0, a7 = 0, , b2 = 0] = c;
  return (
    -a1 / (2 * T * T) - a2 / T + a3 * Math.log(T) + T * (a4 + T * (a5 / 2 + T * (a6 / 3 + (T * a7) / 4))) + b2
  );
}

/** Molar heat capacity at constant pressure, J/(mol K). */
export function speciesCp_J_mol_K(species: SpeciesName, temperature_K: number): number {
  return GLENN_GAS_CONSTANT_J_MOL_K * cpOverR(glennCoefficients(species, temperature_K), temperature_K);
}

/** Molar enthalpy, heat of formation at 298.15 K included, J/mol. */
export function speciesEnthalpy_J_mol(species: SpeciesName, temperature_K: number): number {
  return GLENN_GAS_CONSTANT_J_MOL_K * enthalpyOverR(glennCoefficients(species, temperature_K), temperature_K);
}

/** Molar entropy at 1 bar, J/(mol K). */
export function speciesEntropy_J_mol_K(species: SpeciesName, temperature_K: number): number {
  return GLENN_GAS_CONSTANT_J_MOL_K * entropyOverR(glennCoefficients(species, temperature_K), temperature_K);
}
