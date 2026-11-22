/**
 * The working gas of the engine.
 *
 * Two models share one interface, so the cycle code does not know which it runs:
 *
 * - `combustionGas`: dry air plus the products of lean, complete combustion of a
 *   hydrocarbon fuel, with specific heats that vary with temperature (NASA Glenn
 *   coefficients, see glenn-coefficients.ts). No dissociation: above roughly
 *   1900 K the real gas absorbs heat that this model does not, so afterburner
 *   temperatures come out high. The study measures by how much.
 * - `perfectGas`: constant specific heat. It exists for the closed-form checks
 *   and to measure what variable specific heat buys.
 *
 * Conventions:
 * - f is the fuel-air ratio: kilograms of fuel burned per kilogram of air.
 * - Properties are per kilogram of mixture.
 * - Enthalpy is sensible enthalpy measured from 298.15 K at every f. The heat of
 *   reaction enters the energy balance as the heating value of the fuel, which
 *   is defined at that temperature. Fuel is taken to arrive at 298.15 K.
 */

import {
  GLENN_GAS_CONSTANT_J_MOL_K,
  GLENN_MAX_TEMPERATURE_K,
  GLENN_MIN_TEMPERATURE_K,
  GLENN_SPECIES,
  assertInFittedRange,
  type SpeciesName,
} from "./glenn-coefficients.ts";

/** Datum of sensible enthalpy and reference temperature of the heating value, K. */
export const ENTHALPY_DATUM_K = 298.15;

export interface GasModel {
  readonly id: string;
  /** Fuel-air ratio at which the fuel uses all the oxygen. Infinity for a gas without chemistry. */
  readonly stoichiometricFuelAirRatio: number;
  /** Temperatures the model accepts, K. */
  readonly minTemperature_K: number;
  readonly maxTemperature_K: number;
  /** Gas constant of the mixture, J/(kg K). */
  gasConstant(f: number): number;
  /** Specific heat at constant pressure, J/(kg K). */
  cp(temperature_K: number, f: number): number;
  /** Sensible enthalpy from 298.15 K, J/kg. */
  enthalpy(temperature_K: number, f: number): number;
  /**
   * Entropy function, the integral of Cp dT / T, J/(kg K). Between two states of the
   * same f joined by an isentropic change, its difference is R ln(p2 / p1).
   */
  entropyFunction(temperature_K: number, f: number): number;
  /**
   * Fuel-air ratio added by a burner that takes gas at `inlet_K` and fuel-air ratio
   * `fIn` to `outlet_K`, when each kilogram of fuel releases `heatRelease_J_kg`
   * (heating value times combustion efficiency). Energy balance, no iteration.
   */
  fuelAirRatioIncrement(inlet_K: number, fIn: number, outlet_K: number, heatRelease_J_kg: number): number;
}

/** Ratio of specific heats at a state. */
export function gamma(gas: GasModel, temperature_K: number, f: number): number {
  const cp = gas.cp(temperature_K, f);
  return cp / (cp - gas.gasConstant(f));
}

const NEWTON_STEPS = 40;
const NEWTON_TOLERANCE = 1e-12;

function clampTemperature(gas: GasModel, temperature_K: number): number {
  return Math.min(gas.maxTemperature_K, Math.max(gas.minTemperature_K, temperature_K));
}

/** Temperature at which the gas has a given sensible enthalpy. Newton's method on dh/dT = Cp. */
export function temperatureFromEnthalpy(gas: GasModel, enthalpy_J_kg: number, f: number, guess_K: number): number {
  let T = clampTemperature(gas, guess_K);
  for (let i = 0; i < NEWTON_STEPS; i++) {
    const next = clampTemperature(gas, T - (gas.enthalpy(T, f) - enthalpy_J_kg) / gas.cp(T, f));
    if (Math.abs(next - T) <= NEWTON_TOLERANCE * T) return next;
    T = next;
  }
  return T;
}

/** Temperature at which the entropy function has a given value. Newton's method on d(phi)/dT = Cp / T. */
export function temperatureFromEntropyFunction(gas: GasModel, phi_J_kg_K: number, f: number, guess_K: number): number {
  let T = clampTemperature(gas, guess_K);
  for (let i = 0; i < NEWTON_STEPS; i++) {
    const next = clampTemperature(gas, T - ((gas.entropyFunction(T, f) - phi_J_kg_K) * T) / gas.cp(T, f));
    if (Math.abs(next - T) <= NEWTON_TOLERANCE * T) return next;
    T = next;
  }
  return T;
}

/** A gas of constant specific heat and fixed gas constant, whatever it carries. */
export function perfectGas(options: { readonly gamma: number; readonly gasConstant_J_kg_K: number }): GasModel {
  const R = options.gasConstant_J_kg_K;
  const cp = (options.gamma * R) / (options.gamma - 1);
  return {
    id: `perfect-gamma-${options.gamma}`,
    stoichiometricFuelAirRatio: Number.POSITIVE_INFINITY,
    minTemperature_K: 1,
    maxTemperature_K: Number.MAX_VALUE,
    gasConstant: () => R,
    cp: () => cp,
    enthalpy: (T) => cp * (T - ENTHALPY_DATUM_K),
    entropyFunction: (T) => cp * Math.log(T),
    fuelAirRatioIncrement: (inlet_K, fIn, outlet_K, heatRelease_J_kg) =>
      ((1 + fIn) * cp * (outlet_K - inlet_K)) / (heatRelease_J_kg - cp * (outlet_K - ENTHALPY_DATUM_K)),
  };
}

/**
 * Composition of dry air in mole fractions: the `Air` record of NASA/TP-2002-211556
 * (PDF page 284), which credits Gordon, 1982. They add up to one.
 */
const DRY_AIR_MOLE_FRACTIONS: Readonly<Record<Exclude<SpeciesName, "H2O">, number>> = {
  N2: 0.78084,
  O2: 0.209476,
  Ar: 0.009365,
  CO2: 0.000319,
};

/** Atomic masses of carbon and hydrogen, g/mol, consistent with the molar masses of the report. */
const CARBON_G_MOL = GLENN_SPECIES.CO2.molarMass_g_mol - GLENN_SPECIES.O2.molarMass_g_mol;
const HYDROGEN_G_MOL = (GLENN_SPECIES.H2O.molarMass_g_mol - GLENN_SPECIES.O2.molarMass_g_mol / 2) / 2;

/** Moles of each species in a blend; a negative amount is a species consumed. */
type Moles = Partial<Record<SpeciesName, number>>;

/** One temperature interval of a blend: Cp, H and S in J/K, J and J/K for the stated moles. */
interface Blend {
  cp(T: number): number;
  enthalpy(T: number): number;
  entropy(T: number): number;
}

function blendCoefficients(moles: Moles, interval: "low" | "high"): readonly number[] {
  const sum = Array.from({ length: 9 }, () => 0);
  for (const [species, amount] of Object.entries(moles) as [SpeciesName, number][]) {
    GLENN_SPECIES[species][interval].forEach((value, k) => {
      sum[k] = (sum[k] ?? 0) + amount * value * GLENN_GAS_CONSTANT_J_MOL_K;
    });
  }
  return sum;
}

/**
 * Cp, H and S of one coefficient row, with the nine coefficients held as locals.
 * The expressions are those of cpOverR, enthalpyOverR and entropyOverR in
 * glenn-coefficients.ts, term for term; they are repeated here because reading
 * the coefficients out of an array on every call made the engine several times
 * slower than the flight model can afford (check 7 of brief 007).
 */
function row(c: readonly number[]): Blend {
  const a1 = c[0] ?? 0;
  const a2 = c[1] ?? 0;
  const a3 = c[2] ?? 0;
  const a4 = c[3] ?? 0;
  const a5 = c[4] ?? 0;
  const a6 = c[5] ?? 0;
  const a7 = c[6] ?? 0;
  const b1 = c[7] ?? 0;
  const b2 = c[8] ?? 0;
  return {
    cp: (T) => a1 / (T * T) + a2 / T + a3 + T * (a4 + T * (a5 + T * (a6 + T * a7))),
    enthalpy: (T) => -a1 / T + a2 * Math.log(T) + T * (a3 + T * (a4 / 2 + T * (a5 / 3 + T * (a6 / 4 + (T * a7) / 5)))) + b1,
    entropy: (T) =>
      -a1 / (2 * T * T) - a2 / T + a3 * Math.log(T) + T * (a4 + T * (a5 / 2 + T * (a6 / 3 + (T * a7) / 4))) + b2,
  };
}

/** Temperature at which the two fitted intervals of every species meet, K. */
const JOINT_TEMPERATURE_K = 1000;

/** Properties of a fixed blend of species over the whole fitted range. */
function blend(moles: Moles): Blend {
  const low = row(blendCoefficients(moles, "low"));
  const high = row(blendCoefficients(moles, "high"));
  return {
    cp: (T) => (T < JOINT_TEMPERATURE_K ? low.cp(T) : high.cp(T)),
    enthalpy: (T) => (T < JOINT_TEMPERATURE_K ? low.enthalpy(T) : high.enthalpy(T)),
    entropy: (T) => (T < JOINT_TEMPERATURE_K ? low.entropy(T) : high.entropy(T)),
  };
}

/**
 * Dry air plus the products of lean, complete combustion of a fuel made of carbon
 * and hydrogen. Burning adds CO2 and H2O and removes O2, so the composition, and
 * with it every property per kilogram of air, is linear in the fuel-air ratio:
 * two blends, the air and what a kilogram of fuel changes, describe every mixture.
 */
export function combustionGas(options: { readonly hydrogenMassFraction: number }): GasModel {
  const w = options.hydrogenMassFraction;
  if (!(w >= 0 && w <= 1)) throw new RangeError(`hydrogen mass fraction ${w} is not between 0 and 1`);

  // One kilogram of dry air, in moles of each species.
  const airMolarMass_kg_mol =
    (Object.entries(DRY_AIR_MOLE_FRACTIONS) as [SpeciesName, number][]).reduce(
      (sum, [species, x]) => sum + x * GLENN_SPECIES[species].molarMass_g_mol,
      0,
    ) / 1000;
  const airMoles: Moles = {};
  for (const [species, x] of Object.entries(DRY_AIR_MOLE_FRACTIONS) as [SpeciesName, number][]) {
    airMoles[species] = x / airMolarMass_kg_mol;
  }

  // What burning one kilogram of fuel changes: C + O2 -> CO2, 4 H + O2 -> 2 H2O.
  const carbonMoles = ((1 - w) * 1000) / CARBON_G_MOL;
  const hydrogenMoles = (w * 1000) / HYDROGEN_G_MOL;
  const oxygenUsed = carbonMoles + hydrogenMoles / 4;
  const fuelMoles: Moles = { CO2: carbonMoles, H2O: hydrogenMoles / 2, O2: -oxygenUsed };

  const air = blend(airMoles);
  const fuel = blend(fuelMoles);
  const airGasConstant = GLENN_GAS_CONSTANT_J_MOL_K / airMolarMass_kg_mol;
  const fuelGasConstant = (GLENN_GAS_CONSTANT_J_MOL_K * hydrogenMoles) / 4;
  const airDatum = air.enthalpy(ENTHALPY_DATUM_K);
  const fuelDatum = fuel.enthalpy(ENTHALPY_DATUM_K);
  const stoichiometric = (airMoles.O2 ?? 0) / oxygenUsed;

  const check = (T: number, f: number): void => {
    assertInFittedRange(T);
    if (!(f >= 0 && f <= stoichiometric * (1 + 1e-9))) {
      throw new RangeError(`fuel-air ratio ${f} is outside 0 to the stoichiometric ${stoichiometric}`);
    }
  };
  // Sensible enthalpy of the air and of the fuel's change, per kilogram of air and of fuel.
  const airEnthalpy = (T: number): number => air.enthalpy(T) - airDatum;
  const fuelEnthalpy = (T: number): number => fuel.enthalpy(T) - fuelDatum;

  return {
    id: `glenn-air-fuel-h${w}`,
    stoichiometricFuelAirRatio: stoichiometric,
    minTemperature_K: GLENN_MIN_TEMPERATURE_K,
    maxTemperature_K: GLENN_MAX_TEMPERATURE_K,
    gasConstant: (f) => (airGasConstant + f * fuelGasConstant) / (1 + f),
    cp: (T, f) => {
      check(T, f);
      return (air.cp(T) + f * fuel.cp(T)) / (1 + f);
    },
    enthalpy: (T, f) => {
      check(T, f);
      return (airEnthalpy(T) + f * fuelEnthalpy(T)) / (1 + f);
    },
    entropyFunction: (T, f) => {
      check(T, f);
      return (air.entropy(T) + f * fuel.entropy(T)) / (1 + f);
    },
    fuelAirRatioIncrement: (inlet_K, fIn, outlet_K, heatRelease_J_kg) => {
      check(inlet_K, fIn);
      assertInFittedRange(outlet_K);
      const heating =
        airEnthalpy(outlet_K) - airEnthalpy(inlet_K) + fIn * (fuelEnthalpy(outlet_K) - fuelEnthalpy(inlet_K));
      return heating / (heatRelease_J_kg - fuelEnthalpy(outlet_K));
    },
  };
}
