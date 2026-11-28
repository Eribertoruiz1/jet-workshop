import { describe, expect, it } from "vitest";
import { convergentNozzle } from "../../src/propulsion/cycle.ts";
import { combustionGas, perfectGas } from "../../src/propulsion/gas.ts";
import {
  buildHardware,
  solveOperatingPoint,
  type EngineHardware,
  type HardwareReference,
  type OperatingConditions,
  type OperatingPoint,
  type Technology,
} from "../../src/propulsion/offdesign.ts";

const SEA_LEVEL_Pa = 101325;
const SEA_LEVEL_K = 288.15;

function hardware(technology: Technology, reference: HardwareReference): EngineHardware {
  const built = buildHardware(technology, reference);
  if (!built.ok) throw new Error(built.reason);
  return built.hardware;
}

function run(hw: EngineHardware, conditions: OperatingConditions): OperatingPoint {
  const solved = solveOperatingPoint(hw, conditions);
  if (!solved.ok) throw new Error(solved.reason);
  return solved.point;
}

const staticSeaLevel: OperatingConditions = {
  ambientPressure_Pa: SEA_LEVEL_Pa,
  inletTotalPressure_Pa: SEA_LEVEL_Pa,
  inletTotalTemperature_K: SEA_LEVEL_K,
  flightSpeed_m_s: 0,
  speedFraction: 1,
};

describe("ideal engine with both throats choked, against its closed form", () => {
  // Perfect gas, gamma 1.4, no losses. The heating value is so large that the fuel
  // has no mass, which makes the closed form below exact.
  const GAMMA = 1.4;
  const ideal = perfectGas({ gamma: GAMMA, gasConstant_J_kg_K: 287.05 });
  const technology: Technology = {
    gas: ideal,
    fuelHeatingValue_J_kg: 1e16,
    compressorPolytropicEfficiency: 1,
    turbinePolytropicEfficiency: 1,
    burnerEfficiency: 1,
    mechanicalEfficiency: 1,
    nozzleThrustCoefficient: 1,
  };
  // Pressure ratio 8 at 1150 K: the turbine expands to 0.45 of its inlet pressure, below the
  // critical ratio 0.528, so its throat is choked at the reference point.
  const PRESSURE_RATIO = 8;
  const T4 = 1150;
  const hw = hardware(technology, {
    ambientPressure_Pa: SEA_LEVEL_Pa,
    inletTotalPressure_Pa: SEA_LEVEL_Pa,
    inletTotalTemperature_K: SEA_LEVEL_K,
    airflow_kg_s: 40,
    pressureRatio: PRESSURE_RATIO,
    turbineInletTemperature_K: T4,
    burnerPressureLoss: 0,
    tailpipePressureLoss: 0,
  });
  // Reference: T3 = T1 PR^(2/7); the turbine gives back the compressor's temperature rise.
  const T3 = SEA_LEVEL_K * PRESSURE_RATIO ** (2 / 7);
  const turbineTemperatureRatio = (T4 - (T3 - SEA_LEVEL_K)) / T4;

  it("is choked in the turbine and in the nozzle at its reference point", () => {
    const point = run(hw, staticSeaLevel);
    expect(point.nozzle.choked).toBe(true);
    expect(point.turbinePressureRatio).toBeLessThan((2 / (GAMMA + 1)) ** 3.5);
  });

  it("keeps the turbine temperature ratio, so T4 goes with the speed squared", () => {
    // With two choked throats in series the turbine expansion ratio is fixed by the two
    // areas. Work goes with n^2, so T4 = n^2 T4ref, at any altitude and flight speed.
    const n = 0.95;
    const point = run(hw, {
      ambientPressure_Pa: 30000,
      inletTotalPressure_Pa: 40000,
      inletTotalTemperature_K: 250,
      flightSpeed_m_s: 200,
      speedFraction: n,
    });
    expect(point.nozzle.choked).toBe(true);
    expect(point.turbineOutletTemperature_K / point.turbineInletTemperature_K).toBeCloseTo(turbineTemperatureRatio, 9);
    expect(point.turbineInletTemperature_K).toBeCloseTo(n * n * T4, 6);
  });

  it("gives the pressure ratio of the work it does and the air flow of the choked turbine", () => {
    const n = 0.95;
    const T1 = 250;
    const P1 = 40000;
    const point = run(hw, {
      ambientPressure_Pa: 30000,
      inletTotalPressure_Pa: P1,
      inletTotalTemperature_K: T1,
      flightSpeed_m_s: 200,
      speedFraction: n,
    });
    // T3 = T1 + n^2 (T3ref - T1ref), and the pressure ratio is (T3 / T1)^3.5.
    const T3off = T1 + n * n * (T3 - SEA_LEVEL_K);
    const pressureRatio = (T3off / T1) ** 3.5;
    expect(point.compressorOutletTemperature_K).toBeCloseTo(T3off, 8);
    expect(point.pressureRatio).toBeCloseTo(pressureRatio, 9);
    // Choked turbine: W sqrt(T4) / P4 is constant, so W = Wref (P4 / P4ref) sqrt(T4ref / T4).
    const airflow = 40 * ((P1 * pressureRatio) / (SEA_LEVEL_Pa * PRESSURE_RATIO)) * (1 / n);
    expect(point.airflow_kg_s).toBeCloseTo(airflow, 6);
  });

  it("gives the jet thrust of a choked convergent nozzle and subtracts the ram drag", () => {
    const point = run(hw, { ...staticSeaLevel, ambientPressure_Pa: 80000, flightSpeed_m_s: 150 });
    // Exit: T = 2 T5 / (gamma + 1), V = sqrt(gamma R T), p = P7 (2 / (gamma + 1))^3.5.
    const T5 = T4 * turbineTemperatureRatio;
    const P7 = SEA_LEVEL_Pa * PRESSURE_RATIO * turbineTemperatureRatio ** 3.5;
    const exitT = (2 * T5) / (GAMMA + 1);
    const exitV = Math.sqrt(GAMMA * 287.05 * exitT);
    const exitP = P7 * (2 / (GAMMA + 1)) ** 3.5;
    const area = 40 / ((exitP / (287.05 * exitT)) * exitV);
    const gross = 40 * exitV + (exitP - 80000) * area;
    expect(point.grossThrust_N / gross).toBeCloseTo(1, 8);
    expect(point.grossThrust_N - point.netThrust_N).toBeCloseTo(40 * 150, 4);
  });

  it("keeps the same corrected point when temperature and speed squared change together", () => {
    // Same n^2 / T1: same pressure ratio, T4 in proportion to T1, air flow as 1 / sqrt(T1).
    const k = 0.81;
    const cold = run(hw, { ...staticSeaLevel, inletTotalTemperature_K: SEA_LEVEL_K * k, speedFraction: Math.sqrt(k) });
    const reference = run(hw, staticSeaLevel);
    expect(cold.pressureRatio).toBeCloseTo(reference.pressureRatio, 9);
    expect(cold.turbineInletTemperature_K).toBeCloseTo(reference.turbineInletTemperature_K * k, 6);
    expect(cold.airflow_kg_s).toBeCloseTo(reference.airflow_kg_s / Math.sqrt(k), 6);
  });
});

describe("engine with losses, on the combustion gas", () => {
  const gas = combustionGas({ hydrogenMassFraction: 0.14 });
  const technology: Technology = {
    gas,
    fuelHeatingValue_J_kg: 43e6,
    compressorPolytropicEfficiency: 0.85,
    turbinePolytropicEfficiency: 0.83,
    burnerEfficiency: 0.96,
    mechanicalEfficiency: 0.99,
    nozzleThrustCoefficient: 0.98,
  };
  const reference: HardwareReference = {
    ambientPressure_Pa: SEA_LEVEL_Pa,
    inletTotalPressure_Pa: SEA_LEVEL_Pa,
    inletTotalTemperature_K: SEA_LEVEL_K,
    airflow_kg_s: 40,
    pressureRatio: 5,
    turbineInletTemperature_K: 1150,
    burnerPressureLoss: 0.04,
    tailpipePressureLoss: 0.03,
  };
  const built = buildHardware(technology, reference);
  if (!built.ok) throw new Error(built.reason);
  const hw = built.hardware;
  const h = (T: number, f: number): number => gas.enthalpy(T, f);

  it("reproduces its own reference point", () => {
    const point = run(hw, staticSeaLevel);
    const ref = built.point;
    expect(point.airflow_kg_s / ref.airflow_kg_s).toBeCloseTo(1, 8);
    expect(point.pressureRatio).toBeCloseTo(5, 8);
    expect(point.turbineInletTemperature_K).toBeCloseTo(1150, 5);
    expect(point.fuelFlow_kg_s / ref.fuelFlow_kg_s).toBeCloseTo(1, 8);
    expect(point.turbineOutletTemperature_K).toBeCloseTo(ref.turbineOutletTemperature_K, 5);
    expect(point.nozzleInletPressure_Pa / ref.nozzleInletPressure_Pa).toBeCloseTo(1, 8);
    expect(point.grossThrust_N / ref.grossThrust_N).toBeCloseTo(1, 8);
  });

  const offDesign: OperatingConditions = {
    ambientPressure_Pa: 37600,
    inletTotalPressure_Pa: 45600,
    inletTotalTemperature_K: 262,
    flightSpeed_m_s: 190,
    speedFraction: 0.9,
  };

  it("conserves energy in the burner and on the shaft away from the reference point", () => {
    const p = run(hw, offDesign);
    const f = p.fuelAirRatio;
    const burnerIn = h(p.compressorOutletTemperature_K, 0) + f * 0.96 * 43e6;
    const burnerOut = (1 + f) * h(p.turbineInletTemperature_K, f);
    expect(burnerOut / burnerIn).toBeCloseTo(1, 10);
    const compressorWork = h(p.compressorOutletTemperature_K, 0) - h(262, 0);
    const turbineWork = (1 + f) * (h(p.turbineInletTemperature_K, f) - h(p.turbineOutletTemperature_K, f));
    expect((turbineWork * 0.99) / compressorWork).toBeCloseTo(1, 10);
    expect(compressorWork).toBeCloseTo(hw.compressorWorkAtFullSpeed_J_kg * 0.81, 3);
  });

  it("passes the same gas flow through the turbine throat and through the nozzle", () => {
    const p = run(hw, offDesign);
    const f = p.fuelAirRatio;
    const turbine = convergentNozzle(gas, p.turbineInletTemperature_K, p.turbineInletPressure_Pa, f, p.turbineOutletPressure_Pa);
    expect((turbine.massFlux_kg_s_m2 * hw.turbineThroatArea_m2) / p.gasFlow_kg_s).toBeCloseTo(1, 8);
    expect((p.nozzle.massFlux_kg_s_m2 * hw.nozzleArea_m2) / p.gasFlow_kg_s).toBeCloseTo(1, 8);
    expect(p.gasFlow_kg_s).toBeCloseTo(p.airflow_kg_s * (1 + f), 10);
    expect(p.fuelFlow_kg_s).toBeCloseTo(p.airflow_kg_s * f, 12);
  });

  it("scales flow, fuel and thrust with pressure when every pressure doubles", () => {
    const single = run(hw, { ...offDesign, flightSpeed_m_s: 0 });
    const double = run(hw, {
      ...offDesign,
      flightSpeed_m_s: 0,
      ambientPressure_Pa: 2 * offDesign.ambientPressure_Pa,
      inletTotalPressure_Pa: 2 * offDesign.inletTotalPressure_Pa,
    });
    expect(double.airflow_kg_s / single.airflow_kg_s).toBeCloseTo(2, 8);
    expect(double.fuelFlow_kg_s / single.fuelFlow_kg_s).toBeCloseTo(2, 8);
    expect(double.grossThrust_N / single.grossThrust_N).toBeCloseTo(2, 8);
    expect(double.turbineInletTemperature_K).toBeCloseTo(single.turbineInletTemperature_K, 6);
  });

  it("has the reference pressure losses at the reference point", () => {
    const atReference = run(hw, staticSeaLevel);
    expect(1 - atReference.turbineInletPressure_Pa / atReference.compressorOutletPressure_Pa).toBeCloseTo(0.04, 8);
    expect(1 - atReference.nozzleInletPressure_Pa / atReference.turbineOutletPressure_Pa).toBeCloseTo(0.03, 8);
  });

  it("scales each pressure loss with the square of the corrected flow at its inlet", () => {
    // Loss fraction = reference loss * (W^2 T / P^2) / (W^2 T / P^2 at the reference point).
    const ref = built.point;
    const burnerFlow = (W: number, T: number, P: number): number => (W * W * T) / (P * P);
    const refBurner = burnerFlow(ref.airflow_kg_s, ref.compressorOutletTemperature_K, ref.compressorOutletPressure_Pa);
    const refTailpipe = burnerFlow(
      ref.airflow_kg_s * (1 + ref.fuelAirRatio),
      ref.turbineOutletTemperature_K,
      ref.turbineOutletPressure_Pa,
    );
    for (const n of [0.3, 0.5, 0.9]) {
      const p = run(hw, { ...offDesign, speedFraction: n });
      const burner = burnerFlow(p.airflow_kg_s, p.compressorOutletTemperature_K, p.compressorOutletPressure_Pa);
      const tailpipe = burnerFlow(p.gasFlow_kg_s, p.turbineOutletTemperature_K, p.turbineOutletPressure_Pa);
      expect(1 - p.turbineInletPressure_Pa / p.compressorOutletPressure_Pa).toBeCloseTo((0.04 * burner) / refBurner, 10);
      expect(1 - p.nozzleInletPressure_Pa / p.turbineOutletPressure_Pa).toBeCloseTo((0.03 * tailpipe) / refTailpipe, 10);
    }
  });

  it("unchokes the nozzle at low speed and still finds the running point", () => {
    const slow = run(hw, { ...staticSeaLevel, speedFraction: 0.5 });
    expect(slow.nozzle.choked).toBe(false);
    expect(slow.nozzle.exitPressure_Pa).toBeCloseTo(SEA_LEVEL_Pa, 6);
    expect(slow.netThrust_N).toBeGreaterThan(0);
    expect(slow.netThrust_N).toBeLessThan(0.25 * built.point.netThrust_N);
    expect((slow.nozzle.massFlux_kg_s_m2 * hw.nozzleArea_m2) / slow.gasFlow_kg_s).toBeCloseTo(1, 8);
  });

  it("windmills where ram pressure alone turns it: the flow is the turbine's and the thrust is continuous", () => {
    // Mach 0.8 at 10 km: total pressure 1.52 times ambient. Find the speed below which the engine windmills.
    const ram = { ...offDesign, ambientPressure_Pa: 26500, inletTotalPressure_Pa: 26500 * 1.524, inletTotalTemperature_K: 251.8, flightSpeed_m_s: 240 };
    const at = (n: number): OperatingPoint => run(hw, { ...ram, speedFraction: n });
    expect(at(1).windmilling).toBe(false);
    expect(at(0.2).windmilling).toBe(true);
    let low = 0.2;
    let high = 1;
    for (let i = 0; i < 40; i++) {
      const mid = 0.5 * (low + high);
      if (at(mid).windmilling) low = mid;
      else high = mid;
    }
    // On the two sides of the boundary the engine is the same to one part in a million.
    const below = at(low);
    const above = at(high);
    expect(below.windmilling).toBe(true);
    expect(above.windmilling).toBe(false);
    expect(below.netThrust_N).toBeCloseTo(above.netThrust_N, 0);
    expect(below.gasFlow_kg_s / above.gasFlow_kg_s).toBeCloseTo(1, 5);
    expect(below.fuelFlow_kg_s).toBeCloseTo(above.fuelFlow_kg_s, 6);
    // Windmilling: the nozzle could pass more than the turbine lets through.
    const slow = at(0.2);
    expect(slow.nozzle.massFlux_kg_s_m2 * hw.nozzleArea_m2).toBeGreaterThan(slow.gasFlow_kg_s);
    expect(slow.fuelAirRatio).toBeGreaterThan(0);
    expect(slow.fuelAirRatio).toBeLessThan(0.002);
  });

  it("with a choked nozzle while windmilling, counts the exit pressure on the area the jet fills", () => {
    // Total pressure three times ambient: the nozzle is choked even with the burner at its lowest.
    const p = run(hw, {
      ambientPressure_Pa: 20000,
      inletTotalPressure_Pa: 60000,
      inletTotalTemperature_K: 330,
      flightSpeed_m_s: 420,
      speedFraction: 0.2,
    });
    expect(p.windmilling).toBe(true);
    expect(p.nozzle.choked).toBe(true);
    // Jet: momentum plus the exit pressure above ambient on the area this flow needs, W / (rho V), times 0.98.
    const jetArea = p.gasFlow_kg_s / p.nozzle.massFlux_kg_s_m2;
    const gross = 0.98 * (p.gasFlow_kg_s * p.nozzle.exitVelocity_m_s + (p.nozzle.exitPressure_Pa - 20000) * jetArea);
    expect(p.grossThrust_N / gross).toBeCloseTo(1, 10);
    expect(jetArea).toBeLessThan(hw.nozzleArea_m2);
    expect(p.netThrust_N).toBeCloseTo(p.grossThrust_N - p.airflow_kg_s * 420, 6);
  });

  it("gives more thrust and a hotter turbine as the speed rises", () => {
    let previous = run(hw, { ...staticSeaLevel, speedFraction: 0.3 });
    for (const n of [0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.05]) {
      const point = run(hw, { ...staticSeaLevel, speedFraction: n });
      expect(point.grossThrust_N).toBeGreaterThan(previous.grossThrust_N);
      expect(point.airflow_kg_s).toBeGreaterThan(previous.airflow_kg_s);
      previous = point;
    }
    const full = run(hw, staticSeaLevel);
    const over = run(hw, { ...staticSeaLevel, speedFraction: 1.05 });
    expect(over.turbineInletTemperature_K).toBeGreaterThan(full.turbineInletTemperature_K);
  });

  it("agrees with itself when the iteration tolerance is tightened", () => {
    const loose = solveOperatingPoint(hw, offDesign, 1e-6);
    const tight = solveOperatingPoint(hw, offDesign, 1e-13);
    if (!loose.ok || !tight.ok) throw new Error("no running point");
    expect(loose.point.netThrust_N / tight.point.netThrust_N).toBeCloseTo(1, 5);
    expect(loose.point.fuelFlow_kg_s / tight.point.fuelFlow_kg_s).toBeCloseTo(1, 5);
  });

  it("reports that there is no running point instead of throwing", () => {
    // Inlet air so hot that the compressor outlet is above anything the burner can reach.
    expect(solveOperatingPoint(hw, { ...staticSeaLevel, inletTotalTemperature_K: 2100 })).toEqual({
      ok: false,
      reason: "no-running-point",
    });
    expect(solveOperatingPoint(hw, { ...staticSeaLevel, speedFraction: 0 })).toEqual({ ok: false, reason: "no-running-point" });
    // Standing still there is no ram pressure to windmill on: every running point has both flows in balance.
    for (const n of [0.26, 0.5, 1]) expect(run(hw, { ...staticSeaLevel, speedFraction: n }).windmilling).toBe(false);
  });

  it("never throws over a wide sweep of inlet conditions and speeds", () => {
    for (const T1 of [201, 216.65, 250, 288.15, 400, 700, 1500]) {
      for (const pressure of [500, 5000, 101325, 300000]) {
        for (const ram of [1, 1.3, 3, 30]) {
          for (const n of [0.05, 0.26, 0.5, 0.85, 1, 1.2, 2]) {
            const result = solveOperatingPoint(hw, {
              ambientPressure_Pa: pressure,
              inletTotalPressure_Pa: pressure * ram,
              inletTotalTemperature_K: T1,
              flightSpeed_m_s: 0,
              speedFraction: n,
            });
            if (result.ok) {
              expect(Number.isFinite(result.point.netThrust_N)).toBe(true);
              expect(Number.isFinite(result.point.fuelFlow_kg_s)).toBe(true);
              expect(result.point.fuelFlow_kg_s).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });
});

describe("designs the turbine cannot drive", () => {
  it("passes the reason of the reference solver on", () => {
    const built = buildHardware(
      {
        gas: perfectGas({ gamma: 1.4, gasConstant_J_kg_K: 287.05 }),
        fuelHeatingValue_J_kg: 43e6,
        compressorPolytropicEfficiency: 0.8,
        turbinePolytropicEfficiency: 0.8,
        burnerEfficiency: 1,
        mechanicalEfficiency: 1,
        nozzleThrustCoefficient: 1,
      },
      {
        ambientPressure_Pa: SEA_LEVEL_Pa,
        inletTotalPressure_Pa: SEA_LEVEL_Pa,
        inletTotalTemperature_K: SEA_LEVEL_K,
        airflow_kg_s: 40,
        pressureRatio: 16,
        turbineInletTemperature_K: 900,
        burnerPressureLoss: 0,
        tailpipePressureLoss: 0,
      },
    );
    expect(built).toEqual({ ok: false, reason: "turbine-cannot-drive-compressor" });
  });
});
