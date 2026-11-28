import { describe, expect, it } from "vitest";
import {
  btuPerLbToJoulePerKg,
  fahrenheitToKelvin,
  feetToMetres,
  inchesToMetres,
  lbPerHourPerLbfToKgPerSecondPerNewton,
  lbPerHourToKgPerSecond,
  lbPerSecondToKgPerSecond,
  lbfToNewton,
  poundsToKilograms,
  psfToPascal,
  rankineToKelvin,
  squareInchesToSquareMetres,
} from "../../src/propulsion/units.ts";

// Expected values are worked by hand from the exact definitions:
// 1 lb = 0.45359237 kg, g0 = 9.80665 m/s2, 1 ft = 0.3048 m, 1 Btu(IT)/lb = 2326 J/kg.
describe("propulsion units: report units to SI", () => {
  it("converts pounds of thrust to newtons", () => {
    // 0.45359237 * 9.80665 = 4.4482216152605 N per lbf
    expect(lbfToNewton(1000)).toBeCloseTo(4448.2216152605, 9);
  });

  it("converts pounds per hour to kilograms per second", () => {
    expect(lbPerHourToKgPerSecond(3600)).toBeCloseTo(0.45359237, 12);
  });

  it("converts pounds per second to kilograms per second", () => {
    expect(lbPerSecondToKgPerSecond(100)).toBeCloseTo(45.359237, 10);
  });

  it("converts degrees Rankine to kelvin", () => {
    expect(rankineToKelvin(518.67)).toBeCloseTo(288.15, 10);
  });

  it("converts degrees Fahrenheit to kelvin", () => {
    expect(fahrenheitToKelvin(59)).toBeCloseTo(288.15, 10);
    expect(fahrenheitToKelvin(-459.67)).toBeCloseTo(0, 10);
  });

  it("converts feet to metres", () => {
    expect(feetToMetres(25000)).toBeCloseTo(7620, 9);
  });

  it("converts inches to metres", () => {
    expect(inchesToMetres(100)).toBeCloseTo(2.54, 12);
  });

  it("converts pounds of mass to kilograms", () => {
    expect(poundsToKilograms(2475)).toBeCloseTo(1122.64111575, 8);
  });

  it("converts pounds per square foot to pascals", () => {
    // 4.4482216152605 / 0.3048^2 = 47.88025898... Pa per psf; 101325 / 47.88025898 = 2116.21662 psf
    expect(psfToPascal(2116.21662)).toBeCloseTo(101325, 1);
    expect(psfToPascal(1)).toBeCloseTo(47.880259, 6);
  });

  it("converts square inches to square metres", () => {
    expect(squareInchesToSquareMetres(100)).toBeCloseTo(0.064516, 12);
  });

  it("converts Btu per pound to joules per kilogram", () => {
    expect(btuPerLbToJoulePerKg(18700)).toBeCloseTo(43496200, 3);
  });

  it("converts specific fuel consumption, lb/(h lbf), to kg/(s N)", () => {
    // 0.45359237 / 3600 / 4.4482216152605 = 2.832545e-5
    expect(lbPerHourPerLbfToKgPerSecondPerNewton(1)).toBeCloseTo(2.832545e-5, 10);
  });
});
