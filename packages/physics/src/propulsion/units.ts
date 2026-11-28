/**
 * Report units to SI. The NACA engine reports use pounds, feet, degrees
 * Rankine and Btu; the model works in SI throughout. Every conversion of
 * engine data goes through this file and nowhere else.
 *
 * All factors follow from exact definitions:
 *   1 lb = 0.45359237 kg, standard gravity 9.80665 m/s2, 1 ft = 0.3048 m,
 *   1 Btu/lb = 2326 J/kg (International Table Btu).
 * The reports do not say which Btu they use. The thermochemical one differs
 * by 0.07 percent, far below anything else in a comparison.
 */

const KG_PER_LB = 0.45359237;
const STANDARD_GRAVITY_M_S2 = 9.80665;
const M_PER_FT = 0.3048;
const N_PER_LBF = KG_PER_LB * STANDARD_GRAVITY_M_S2;
const J_PER_KG_PER_BTU_PER_LB = 2326;

/** Thrust: pounds-force to newtons. */
export function lbfToNewton(lbf: number): number {
  return lbf * N_PER_LBF;
}

/** Fuel flow: pounds per hour to kilograms per second. */
export function lbPerHourToKgPerSecond(lbPerHour: number): number {
  return (lbPerHour * KG_PER_LB) / 3600;
}

/** Air flow: pounds per second to kilograms per second. */
export function lbPerSecondToKgPerSecond(lbPerSecond: number): number {
  return lbPerSecond * KG_PER_LB;
}

/** Absolute temperature: degrees Rankine to kelvin. */
export function rankineToKelvin(rankine: number): number {
  return (rankine * 5) / 9;
}

/** Temperature: degrees Fahrenheit to kelvin. */
export function fahrenheitToKelvin(fahrenheit: number): number {
  return ((fahrenheit + 459.67) * 5) / 9;
}

/** Length or altitude: feet to metres. */
export function feetToMetres(feet: number): number {
  return feet * M_PER_FT;
}

/** Length: inches to metres. */
export function inchesToMetres(inches: number): number {
  return (inches * M_PER_FT) / 12;
}

/** Mass: pounds to kilograms. */
export function poundsToKilograms(pounds: number): number {
  return pounds * KG_PER_LB;
}

/** Pressure: pounds-force per square foot to pascals. */
export function psfToPascal(psf: number): number {
  return (psf * N_PER_LBF) / (M_PER_FT * M_PER_FT);
}

/** Area: square inches to square metres. */
export function squareInchesToSquareMetres(squareInches: number): number {
  const metresPerInch = M_PER_FT / 12;
  return squareInches * metresPerInch * metresPerInch;
}

/** Heating value: Btu per pound to joules per kilogram. */
export function btuPerLbToJoulePerKg(btuPerLb: number): number {
  return btuPerLb * J_PER_KG_PER_BTU_PER_LB;
}

/** Specific fuel consumption: lb/(h lbf) to kg/(s N). */
export function lbPerHourPerLbfToKgPerSecondPerNewton(sfc: number): number {
  return (sfc * KG_PER_LB) / 3600 / N_PER_LBF;
}
