import { describe, expect, it } from "vitest";
import {
  compress,
  convergentNozzle,
  expandForWork,
  solveReferencePoint,
  sonicState,
  type ReferenceInputs,
} from "../../src/propulsion/cycle.ts";
import { combustionGas, perfectGas } from "../../src/propulsion/gas.ts";

// Perfect gas used for every closed-form check: gamma 1.4, R 287.05 J/(kg K), Cp 1004.675 J/(kg K).
const GAMMA = 1.4;
const R = 287.05;
const CP = 1004.675;
const ideal = perfectGas({ gamma: GAMMA, gasConstant_J_kg_K: R });

describe("compressor", () => {
  // Pressure ratio 2^3.5 doubles the temperature of a gamma 1.4 gas in an isentropic compression.
  const PRESSURE_RATIO = 2 ** 3.5;

  it("doubles the temperature at pressure ratio 2^3.5 when it has no losses", () => {
    const out = compress(ideal, 288.15, PRESSURE_RATIO, { kind: "isentropic", value: 1 });
    expect(out.outletTemperature_K).toBeCloseTo(576.3, 8);
    // 1004.675 * 288.15
    expect(out.specificWork_J_kg).toBeCloseTo(289497.10125, 4);
  });

  it("takes 1 / 0.8 of the ideal work at an isentropic efficiency of 0.8", () => {
    const out = compress(ideal, 288.15, PRESSURE_RATIO, { kind: "isentropic", value: 0.8 });
    // 288.15 + 288.15 / 0.8
    expect(out.outletTemperature_K).toBeCloseTo(648.3375, 8);
  });

  it("follows T2 * ratio^((gamma - 1) / (gamma e)) at a polytropic efficiency e", () => {
    const out = compress(ideal, 288.15, PRESSURE_RATIO, { kind: "polytropic", value: 0.9 });
    // 288.15 * 2^(1 / 0.9)
    expect(out.outletTemperature_K).toBeCloseTo(622.4384275, 6);
  });
});

describe("turbine", () => {
  it("drops the pressure to (T5 / T4)^3.5 when it has no losses", () => {
    const out = expandForWork(ideal, 1200, 0, CP * 300, { kind: "isentropic", value: 1 });
    expect(out.outletTemperature_K).toBeCloseTo(900, 8);
    // 0.75^3.5
    expect(out.pressureRatio).toBeCloseTo(0.3653544672, 9);
  });

  it("needs a larger pressure drop for the same work at an isentropic efficiency of 0.9", () => {
    const out = expandForWork(ideal, 1200, 0, CP * 300, { kind: "isentropic", value: 0.9 });
    expect(out.outletTemperature_K).toBeCloseTo(900, 8);
    // ((1200 - 300 / 0.9) / 1200)^3.5
    expect(out.pressureRatio).toBeCloseTo(0.3201459154, 9);
  });

  it("is the inverse of the compressor at the same polytropic efficiency of 1", () => {
    const up = compress(ideal, 400, 6, { kind: "polytropic", value: 1 });
    const down = expandForWork(ideal, up.outletTemperature_K, 0, up.specificWork_J_kg, { kind: "polytropic", value: 1 });
    expect(down.outletTemperature_K).toBeCloseTo(400, 8);
    expect(down.pressureRatio).toBeCloseTo(1 / 6, 10);
  });
});

describe("sonic state and convergent nozzle", () => {
  it("finds the sonic temperature 2 Tt / (gamma + 1) of a perfect gas", () => {
    const s = sonicState(ideal, 600, 0);
    expect(s.temperature_K).toBeCloseTo(500, 7);
    // sqrt(1.4 * 287.05 * 500)
    expect(s.velocity_m_s).toBeCloseTo(448.2577384, 6);
    // (2 / 2.4)^3.5
    expect(s.pressureRatio).toBeCloseTo(0.5282817877, 9);
  });

  it("passes the textbook choked mass flow, W sqrt(Tt) / (A pt) = 0.0404149 for gamma 1.4", () => {
    // sqrt(gamma / R) * (2 / (gamma + 1))^((gamma + 1) / (2 (gamma - 1)))
    const n = convergentNozzle(ideal, 600, 300000, 0, 100000);
    expect(n.choked).toBe(true);
    expect((n.massFlux_kg_s_m2 * Math.sqrt(600)) / 300000).toBeCloseTo(0.04041489959, 9);
    expect(n.exitPressure_Pa).toBeCloseTo(158484.5363, 3);
    expect(n.exitVelocity_m_s).toBeCloseTo(448.2577384, 6);
  });

  it("expands all the way to ambient pressure below the critical pressure ratio", () => {
    const n = convergentNozzle(ideal, 600, 150000, 0, 100000);
    expect(n.choked).toBe(false);
    expect(n.exitPressure_Pa).toBe(100000);
    // T9 = 600 * (1 / 1.5)^(0.4 / 1.4), V9 = sqrt(2 Cp (600 - T9)), flux = p0 / (R T9) * V9
    expect(n.exitTemperature_K).toBeCloseTo(534.366793, 6);
    expect(n.exitVelocity_m_s).toBeCloseTo(363.1529767, 6);
    expect(n.massFlux_kg_s_m2).toBeCloseTo(236.7514214, 6);
  });

  it("is continuous where the nozzle unchokes", () => {
    const critical = 100000 / 0.5282817877;
    const below = convergentNozzle(ideal, 600, critical * (1 - 1e-9), 0, 100000);
    const above = convergentNozzle(ideal, 600, critical * (1 + 1e-9), 0, 100000);
    expect(above.massFlux_kg_s_m2 / below.massFlux_kg_s_m2).toBeCloseTo(1, 6);
    expect(above.exitVelocity_m_s / below.exitVelocity_m_s).toBeCloseTo(1, 6);
  });
});

/** Reference point of an engine without any loss, on the perfect gas. */
function losslessInputs(overrides: Partial<ReferenceInputs>): ReferenceInputs {
  return {
    gas: ideal,
    ambientPressure_Pa: 101325,
    flightSpeed_m_s: 0,
    inletTotalTemperature_K: 288.15,
    inletTotalPressure_Pa: 101325,
    airflow_kg_s: 40,
    pressureRatio: 5,
    turbineInletTemperature_K: 1150,
    compressorEfficiency: { kind: "isentropic", value: 1 },
    turbineEfficiency: { kind: "isentropic", value: 1 },
    burnerEfficiency: 1,
    burnerPressureLoss: 0,
    mechanicalEfficiency: 1,
    tailpipePressureLoss: 0,
    nozzleThrustCoefficient: 1,
    fuelHeatingValue_J_kg: 43e6,
    ...overrides,
  };
}

/**
 * Closed form of the ideal turbojet, written out here from the conservation of mass
 * and energy and independent of the code under test. Fuel mass is carried. The
 * enthalpy datum of the burner balance is 298.15 K, as in the gas model.
 */
function idealTurbojet(c: {
  mach: number;
  ambientT: number;
  ambientP: number;
  pressureRatio: number;
  T4: number;
  heatingValue: number;
}): { f: number; T5: number; nozzlePressureRatio: number; specificThrust: number; choked: boolean } {
  const k = (GAMMA - 1) / GAMMA;
  const ram = 1 + ((GAMMA - 1) / 2) * c.mach ** 2;
  const Tt2 = c.ambientT * ram;
  const pt2 = c.ambientP * ram ** (1 / k);
  const Tt3 = Tt2 * c.pressureRatio ** k;
  const f = (CP * (c.T4 - Tt3)) / (c.heatingValue - CP * (c.T4 - 298.15));
  const T5 = c.T4 - (Tt3 - Tt2) / (1 + f);
  const pt5 = pt2 * c.pressureRatio * (T5 / c.T4) ** (1 / k);
  const nozzlePressureRatio = pt5 / c.ambientP;
  const flightSpeed = c.mach * Math.sqrt(GAMMA * R * c.ambientT);
  const choked = nozzlePressureRatio > ((GAMMA + 1) / 2) ** (1 / k);
  if (!choked) {
    const V9 = Math.sqrt(2 * CP * T5 * (1 - (c.ambientP / pt5) ** k));
    return { f, T5, nozzlePressureRatio, choked, specificThrust: (1 + f) * V9 - flightSpeed };
  }
  const T9 = (2 * T5) / (GAMMA + 1);
  const V9 = Math.sqrt(GAMMA * R * T9);
  const p9 = pt5 * (2 / (GAMMA + 1)) ** (1 / k);
  const areaPerMassFlow = (R * T9) / (p9 * V9);
  return {
    f,
    T5,
    nozzlePressureRatio,
    choked,
    specificThrust: (1 + f) * (V9 + (p9 - c.ambientP) * areaPerMassFlow) - flightSpeed,
  };
}

describe("ideal turbojet against its closed form", () => {
  it("matches with the nozzle unchoked: static, pressure ratio 2, 900 K", () => {
    const expected = idealTurbojet({
      mach: 0,
      ambientT: 288.15,
      ambientP: 101325,
      pressureRatio: 2,
      T4: 900,
      heatingValue: 43e6,
    });
    expect(expected.choked).toBe(false);

    const result = solveReferencePoint(losslessInputs({ pressureRatio: 2, turbineInletTemperature_K: 900 }));
    if (!result.ok) throw new Error(result.reason);
    const p = result.point;
    expect(p.nozzle.choked).toBe(false);
    expect(p.fuelAirRatio).toBeCloseTo(expected.f, 12);
    expect(p.turbineOutletTemperature_K).toBeCloseTo(expected.T5, 7);
    expect(p.netThrust_N / 40).toBeCloseTo(expected.specificThrust, 6);
    expect(p.fuelFlow_kg_s).toBeCloseTo(40 * expected.f, 10);
  });

  it("matches with the nozzle choked: Mach 0.8 at 216.65 K and 22 632 Pa, pressure ratio 5, 1150 K", () => {
    const flight = { mach: 0.8, ambientT: 216.65, ambientP: 22632 };
    const expected = idealTurbojet({ ...flight, pressureRatio: 5, T4: 1150, heatingValue: 43e6 });
    expect(expected.choked).toBe(true);

    const ram = 1 + 0.2 * 0.8 ** 2;
    const result = solveReferencePoint(
      losslessInputs({
        ambientPressure_Pa: flight.ambientP,
        flightSpeed_m_s: 0.8 * Math.sqrt(GAMMA * R * flight.ambientT),
        inletTotalTemperature_K: flight.ambientT * ram,
        inletTotalPressure_Pa: flight.ambientP * ram ** 3.5,
      }),
    );
    if (!result.ok) throw new Error(result.reason);
    const p = result.point;
    expect(p.nozzle.choked).toBe(true);
    expect(p.fuelAirRatio).toBeCloseTo(expected.f, 12);
    expect(p.turbineOutletTemperature_K).toBeCloseTo(expected.T5, 7);
    expect(p.nozzleInletPressure_Pa / flight.ambientP).toBeCloseTo(expected.nozzlePressureRatio, 9);
    expect(p.netThrust_N / 40).toBeCloseTo(expected.specificThrust, 6);
  });

  it("sizes the turbine throat with the choked mass flow function", () => {
    const result = solveReferencePoint(losslessInputs({}));
    if (!result.ok) throw new Error(result.reason);
    const p = result.point;
    const gasFlow = 40 * (1 + p.fuelAirRatio);
    // W sqrt(T4) / (A4 p4) = 0.0404149 for gamma 1.4, with p4 = 5 * 101325 Pa.
    expect((gasFlow * Math.sqrt(1150)) / (p.turbineThroatArea_m2 * 5 * 101325)).toBeCloseTo(0.04041489959, 9);
  });
});

describe("reference point with losses, on the combustion gas", () => {
  const gas = combustionGas({ hydrogenMassFraction: 0.14 });
  const inputs: ReferenceInputs = {
    gas,
    ambientPressure_Pa: 101325,
    flightSpeed_m_s: 0,
    inletTotalTemperature_K: 288.15,
    inletTotalPressure_Pa: 101325,
    airflow_kg_s: 40,
    pressureRatio: 5,
    turbineInletTemperature_K: 1150,
    compressorEfficiency: { kind: "isentropic", value: 0.82 },
    turbineEfficiency: { kind: "isentropic", value: 0.85 },
    burnerEfficiency: 0.97,
    burnerPressureLoss: 0.05,
    mechanicalEfficiency: 0.99,
    tailpipePressureLoss: 0.02,
    nozzleThrustCoefficient: 1,
    fuelHeatingValue_J_kg: 43e6,
  };
  const solved = solveReferencePoint(inputs);
  if (!solved.ok) throw new Error(solved.reason);
  const p = solved.point;
  const f = p.fuelAirRatio;
  const h = (T: number, ratio: number): number => gas.enthalpy(T, ratio);

  it("conserves energy in the burner: air enthalpy plus heat released equals gas enthalpy", () => {
    const into = h(p.compressorOutletTemperature_K, 0) + f * 0.97 * 43e6;
    const out = (1 + f) * h(1150, f);
    expect(out / into).toBeCloseTo(1, 10);
  });

  it("conserves energy on the shaft: the turbine delivers the compressor work over the mechanical efficiency", () => {
    const compressorWork = h(p.compressorOutletTemperature_K, 0) - h(288.15, 0);
    const turbineWork = (1 + f) * (h(1150, f) - h(p.turbineOutletTemperature_K, f));
    expect((turbineWork * 0.99) / compressorWork).toBeCloseTo(1, 10);
  });

  it("conserves energy in the nozzle: total enthalpy equals static enthalpy plus kinetic energy", () => {
    const total = h(p.turbineOutletTemperature_K, f);
    const atExit = h(p.nozzle.exitTemperature_K, f) + p.nozzle.exitVelocity_m_s ** 2 / 2;
    expect(atExit / total).toBeCloseTo(1, 9);
  });

  it("conserves mass: the gas flow through the nozzle is the air plus the fuel", () => {
    expect(p.nozzle.massFlux_kg_s_m2 * p.nozzleArea_m2).toBeCloseTo(40 * (1 + f), 8);
    expect(p.fuelFlow_kg_s).toBeCloseTo(40 * f, 12);
  });

  it("applies the pressure losses of the burner and the tailpipe", () => {
    expect(p.turbineInletPressure_Pa).toBeCloseTo(101325 * 5 * 0.95, 6);
    expect(p.nozzleInletPressure_Pa / p.turbineOutletPressure_Pa).toBeCloseTo(0.98, 12);
  });

  it("gives less thrust and burns more fuel than the same engine without losses", () => {
    const lossless = solveReferencePoint({
      ...inputs,
      compressorEfficiency: { kind: "isentropic", value: 1 },
      turbineEfficiency: { kind: "isentropic", value: 1 },
      burnerEfficiency: 1,
      burnerPressureLoss: 0,
      mechanicalEfficiency: 1,
      tailpipePressureLoss: 0,
    });
    if (!lossless.ok) throw new Error(lossless.reason);
    expect(p.netThrust_N).toBeLessThan(lossless.point.netThrust_N);
    expect(p.fuelFlow_kg_s / p.netThrust_N).toBeGreaterThan(lossless.point.fuelFlow_kg_s / lossless.point.netThrust_N);
  });

  it("subtracts the momentum of the incoming air from the gross thrust", () => {
    const moving = solveReferencePoint({ ...inputs, flightSpeed_m_s: 100 });
    if (!moving.ok) throw new Error(moving.reason);
    expect(moving.point.grossThrust_N - moving.point.netThrust_N).toBeCloseTo(40 * 100, 8);
  });
});

describe("designs that cannot run", () => {
  it("rejects a design whose turbine cannot drive the compressor", () => {
    // Perfect gas, pressure ratio 16 and 900 K with efficiencies 0.80 and 0.85: the turbine
    // would have to expand to (387.9 / 900)^3.5 = 0.053 of its inlet pressure, 0.84 of ambient.
    const result = solveReferencePoint(
      losslessInputs({
        pressureRatio: 16,
        turbineInletTemperature_K: 900,
        compressorEfficiency: { kind: "isentropic", value: 0.8 },
        turbineEfficiency: { kind: "isentropic", value: 0.85 },
      }),
    );
    expect(result).toEqual({ ok: false, reason: "turbine-cannot-drive-compressor" });
  });
});
