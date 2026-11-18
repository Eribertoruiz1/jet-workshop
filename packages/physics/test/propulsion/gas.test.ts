import { describe, expect, it } from "vitest";
import {
  combustionGas,
  gamma,
  perfectGas,
  temperatureFromEnthalpy,
  temperatureFromEntropyFunction,
} from "../../src/propulsion/gas.ts";
import {
  speciesCp_J_mol_K,
  speciesEnthalpy_J_mol,
  speciesEntropy_J_mol_K,
  type SpeciesName,
} from "../../src/propulsion/glenn-coefficients.ts";

// Literal values below marked "Table B1" are read from the property table of
// NASA/TP-2002-211556 (Cp and S at 298.15 K, 1 bar) and from the species
// records (heat of formation at 298.15 K). They are not computed by this code.
describe("NASA Glenn species data", () => {
  const tableB1: readonly (readonly [SpeciesName, number, number, number])[] = [
    // species, Cp J/(mol K), S J/(mol K), Hf(298.15) J/mol
    ["N2", 29.124, 191.61, 0],
    ["O2", 29.378, 205.149, 0],
    ["Ar", 20.786, 154.847, 0],
    ["CO2", 37.135, 213.787, -393510],
    ["H2O", 33.588, 188.829, -241826],
  ];

  it.each(tableB1)("%s: Cp at 298.15 K matches Table B1", (species, cp) => {
    expect(speciesCp_J_mol_K(species, 298.15)).toBeCloseTo(cp, 2);
  });

  it.each(tableB1)("%s: entropy at 298.15 K matches Table B1", (species, _cp, entropy) => {
    expect(speciesEntropy_J_mol_K(species, 298.15)).toBeCloseTo(entropy, 2);
  });

  it.each(tableB1)("%s: enthalpy at 298.15 K is the heat of formation", (species, _cp, _s, hf) => {
    expect(Math.abs(speciesEnthalpy_J_mol(species, 298.15) - hf)).toBeLessThan(2);
  });

  it.each(tableB1)("%s: the two temperature intervals join at 1000 K", (species) => {
    const below = 1000 - 1e-6;
    const above = 1000 + 1e-6;
    expect(speciesCp_J_mol_K(species, above) / speciesCp_J_mol_K(species, below)).toBeCloseTo(1, 4);
    expect(Math.abs(speciesEnthalpy_J_mol(species, above) - speciesEnthalpy_J_mol(species, below))).toBeLessThan(5);
    expect(Math.abs(speciesEntropy_J_mol_K(species, above) - speciesEntropy_J_mol_K(species, below))).toBeLessThan(0.01);
  });

  it("refuses a temperature outside the fitted range instead of extrapolating", () => {
    expect(() => speciesCp_J_mol_K("N2", 150)).toThrow(/200/);
    expect(() => speciesCp_J_mol_K("N2", 6500)).toThrow(/6000/);
  });
});

describe("combustion gas: dry air and products of lean, complete combustion", () => {
  // Fuel taken as (CH2)n: hydrogen mass fraction 2*1.00794 / (12.0107 + 2*1.00794).
  const HYDROGEN_FRACTION_CH2 = 0.14371856860332313;
  const gas = combustionGas({ hydrogenMassFraction: HYDROGEN_FRACTION_CH2 });

  it("has the gas constant of dry air: 8.31451 / 0.0289651159 kg/mol", () => {
    expect(gas.gasConstant(0)).toBeCloseTo(287.05254, 3);
  });

  it("matches the Cp of the report's own Air species at 298.15 K", () => {
    // Table B1, Air: 29.102 J/(mol K) over 28.9651159 g/mol = 1004.726 J/(kg K).
    // Air there is a separate fit, so agreement is asked to 1 part in 10 000.
    expect(Math.abs(gas.cp(298.15, 0) - 1004.726)).toBeLessThan(0.1);
  });

  it("gives the hand-worked stoichiometric fuel-air ratio of CH2", () => {
    // O2 per kg of air: 0.209476 / 0.0289651159 = 7.23201 mol.
    // O2 per kg of CH2: 1.5 / 0.01402658 = 106.9398 mol. Ratio 0.0676269.
    expect(gas.stoichiometricFuelAirRatio).toBeCloseTo(0.0676269, 6);
  });

  it("gives the hand-worked gas constant of stoichiometric products", () => {
    // Burning 1 kg of CH2 adds 8.31451 * (mol H) / 4 = 296.384 J/K of gas constant.
    // (287.0525 + 0.0676269 * 296.384) / 1.0676269 = 287.6436 J/(kg K).
    expect(gas.gasConstant(0.0676269)).toBeCloseTo(287.6436, 3);
  });

  it("measures enthalpy from 298.15 K at every fuel-air ratio", () => {
    expect(gas.enthalpy(298.15, 0)).toBeCloseTo(0, 6);
    expect(gas.enthalpy(298.15, 0.03)).toBeCloseTo(0, 6);
  });

  const states: readonly (readonly [number, number])[] = [
    [250, 0],
    [600, 0],
    [999, 0],
    [1001, 0.02],
    [1400, 0.02],
    [2000, 0.06],
  ];

  it.each(states)("enthalpy changes with temperature at the rate Cp (T = %d K, f = %d)", (T, f) => {
    const dT = 0.01;
    const slope = (gas.enthalpy(T + dT, f) - gas.enthalpy(T - dT, f)) / (2 * dT);
    expect(slope / gas.cp(T, f)).toBeCloseTo(1, 6);
  });

  it.each(states)("the entropy function changes at the rate Cp / T (T = %d K, f = %d)", (T, f) => {
    const dT = 0.01;
    const slope = (gas.entropyFunction(T + dT, f) - gas.entropyFunction(T - dT, f)) / (2 * dT);
    expect((slope * T) / gas.cp(T, f)).toBeCloseTo(1, 6);
  });

  it("heats faster per kelvin when it carries combustion products", () => {
    // CO2 and H2O have more Cp per kilogram than the O2 they replace.
    expect(gas.cp(1200, 0.03)).toBeGreaterThan(gas.cp(1200, 0) * 1.02);
  });

  it("balances the burner: enthalpy in plus heat released equals enthalpy out", () => {
    const T3 = 520;
    const T4 = 1150;
    const heat = 0.98 * 43.5e6;
    const f = gas.fuelAirRatioIncrement(T3, 0, T4, heat);
    expect(f).toBeGreaterThan(0.01);
    expect(f).toBeLessThan(0.03);
    const residual = (1 + f) * gas.enthalpy(T4, f) - gas.enthalpy(T3, 0) - f * heat;
    expect(Math.abs(residual)).toBeLessThan(1e-6 * gas.enthalpy(T4, f));
  });

  it("balances a second burner fed with gas that already carries fuel", () => {
    const fIn = 0.018;
    const Tin = 900;
    const Tout = 1800;
    const heat = 0.9 * 43.5e6;
    const df = gas.fuelAirRatioIncrement(Tin, fIn, Tout, heat);
    const fOut = fIn + df;
    const residual = (1 + fOut) * gas.enthalpy(Tout, fOut) - (1 + fIn) * gas.enthalpy(Tin, fIn) - df * heat;
    expect(df).toBeGreaterThan(0);
    expect(Math.abs(residual)).toBeLessThan(1e-6 * gas.enthalpy(Tout, fOut));
  });

  it("refuses a fuel-air ratio richer than stoichiometric", () => {
    expect(() => gas.cp(1500, 0.08)).toThrow(/stoichiometric/);
  });

  it("recovers a temperature from its enthalpy", () => {
    const h = gas.enthalpy(1375, 0.021);
    expect(temperatureFromEnthalpy(gas, h, 0.021, 900)).toBeCloseTo(1375, 6);
  });

  it("recovers a temperature from its entropy function across the 1000 K joint", () => {
    const phi = gas.entropyFunction(1100, 0.02);
    expect(temperatureFromEntropyFunction(gas, phi, 0.02, 700)).toBeCloseTo(1100, 6);
  });
});

describe("perfect gas: constant specific heat", () => {
  const gas = perfectGas({ gamma: 1.4, gasConstant_J_kg_K: 287.05 });

  it("has Cp = gamma R / (gamma - 1) at any temperature and fuel-air ratio", () => {
    // 1.4 * 287.05 / 0.4 = 1004.675
    expect(gas.cp(300, 0)).toBeCloseTo(1004.675, 9);
    expect(gas.cp(1500, 0.02)).toBeCloseTo(1004.675, 9);
    expect(gamma(gas, 800, 0.01)).toBeCloseTo(1.4, 12);
  });

  it("measures enthalpy from 298.15 K", () => {
    // 1004.675 * (398.15 - 298.15)
    expect(gas.enthalpy(398.15, 0)).toBeCloseTo(100467.5, 6);
  });

  it("raises the entropy function by Cp when the temperature grows by a factor e", () => {
    expect(gas.entropyFunction(300 * Math.E, 0) - gas.entropyFunction(300, 0)).toBeCloseTo(1004.675, 9);
  });

  it("gives the closed-form burner fuel-air ratio", () => {
    // f = Cp (T4 - T3) / (q - Cp (T4 - 298.15))
    //   = 1004.675 * 600 / (43e6 - 1004.675 * 901.85) = 602805 / 42093933.85 = 0.01432047
    expect(gas.fuelAirRatioIncrement(600, 0, 1200, 43e6)).toBeCloseTo(0.01432047, 8);
  });
});
