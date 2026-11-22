import { describe, expect, it } from "vitest";
import type {
  DesignedEngine,
  EngineCommand,
  EngineDesign,
  EngineDesignRanges,
  EngineState,
  FlightCondition,
} from "../../src/propulsion/contract.ts";
import {
  ENGINE_DESIGN_RANGES,
  NEAR_J47_FRACTION,
  designBasis,
  designEngine,
  designEngineOn,
  engineId,
  evidenceRule,
  isNearJ47,
} from "../../src/propulsion/design.ts";
import { AFTERBURNER_V0, createEngineStepper, flightInlet, intakeRecovery } from "../../src/propulsion/engine.ts";
import { combustionGas } from "../../src/propulsion/gas.ts";
import { J47_COMPARED_REGIONS, type ComparedRegion } from "../../src/propulsion/j47-compared-regions.generated.ts";
import { j47AtSeaLevelStatic, j47Engine, j47SpeedFraction } from "../../src/propulsion/j47.ts";
import {
  DAMAGE_RULE_V0,
  GAS_MODEL_RANGE_LIMIT_ID,
  TURBINE_INLET_TEMPERATURE_LIMIT_ID,
  overheatAfter,
  turbineHasFailed,
  turbineLimitStatus,
} from "../../src/propulsion/limits.ts";
import { solveOperatingPoint } from "../../src/propulsion/offdesign.ts";
import * as publicApi from "../../src/propulsion/index.ts";

const SEA_LEVEL: FlightCondition = { ambient: { pressure_Pa: 101325, temperature_K: 288.15 }, mach: 0 };
/** 10 km of the standard atmosphere at Mach 0.8. */
const CRUISE: FlightCondition = { ambient: { pressure_Pa: 26500, temperature_K: 223.25 }, mach: 0.8 };
const DRY_FULL: EngineCommand = { throttle: 1, afterburner: false };
const DT = 1 / 120;

function design(overrides: Partial<EngineDesign> = {}): EngineDesign {
  return { ...designBasis().j47Design, ...overrides };
}

function build(overrides: Partial<EngineDesign> = {}): DesignedEngine {
  const result = designEngine(design(overrides));
  if (!result.ok) throw new Error(`rejected: ${JSON.stringify(result.rejections)}`);
  return result.engine;
}

describe("designEngine: the J47 as a design", () => {
  const basis = designBasis();
  const engine = build();

  it("is the same engine as the model anchored on the test run", () => {
    // The design point is the anchored J47 at sea-level static and rated speed, so sizing an engine
    // there with the same technology has to give the anchored engine back, at any condition.
    const anchored = j47Engine();
    for (const [condition, throttle] of [
      [SEA_LEVEL, 1],
      [CRUISE, 1],
      [CRUISE, 0.9],
      [SEA_LEVEL, 0.6],
    ] as const) {
      const inlet = flightInlet(anchored.gas, condition);
      if (!inlet) throw new Error("no inlet");
      const speed = basis.idleSpeedFraction + (1 - basis.idleSpeedFraction) * throttle;
      const reference = solveOperatingPoint(anchored.hardware, {
        ambientPressure_Pa: condition.ambient.pressure_Pa,
        inletTotalPressure_Pa: inlet.totalPressure_Pa,
        inletTotalTemperature_K: inlet.totalTemperature_K,
        flightSpeed_m_s: inlet.speed_m_s,
        speedFraction: speed * j47SpeedFraction(7900),
      });
      if (!reference.ok) throw new Error(reference.reason);
      const out = engine.step(engine.initialState(), { throttle, afterburner: false }, condition, DT).output;
      expect(out.thrust_N / reference.point.netThrust_N).toBeCloseTo(1, 6);
      expect(out.fuelFlow_kg_s / reference.point.fuelFlow_kg_s).toBeCloseTo(1, 6);
    }
  });

  it("carries the four decisions, an identifier that writes them in full, and the size of the J47", () => {
    expect(engine.design).toEqual(basis.j47Design);
    expect(engine.id).toBe(
      `tj-${basis.j47Design.designAirflow_kg_s}-${basis.j47Design.pressureRatio}-${basis.j47Design.turbineInletTemperature_K}-dry`,
    );
    // Report text, RM E9G09 page 3 and RM E9G28 page 5: 2475 lb, 143 in long, compressor blading 28.9 in across.
    expect(engine.mass_kg).toBeCloseTo(2475 * 0.45359237, 6);
    expect(engine.length_m).toBeCloseTo(143 * 0.0254, 9);
    expect(engine.diameter_m).toBeCloseTo(28.9 * 0.0254, 9);
    expect(engine.massEvidence).toBe("estimated");
    expect(engine.sizeEvidence).toBe("estimated");
  });

  it("gives its design air flow, pressure ratio and temperature at the design point", () => {
    const point = j47AtSeaLevelStatic();
    const out = engine.step(engine.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    expect(out.thrust_N / point.netThrust_N).toBeCloseTo(1, 6);
    expect(out.limits[0]?.value).toBeCloseTo(basis.j47Design.turbineInletTemperature_K, 3);
  });

  it("scales diameter with the square root of the air flow and mass with its power 1.5", () => {
    // 2.25 times the air flow: 1.5 times the diameter and the length, 1.5^3 = 3.375 times the mass.
    const big = build({ designAirflow_kg_s: 2.25 * basis.j47Design.designAirflow_kg_s });
    expect(big.diameter_m / engine.diameter_m).toBeCloseTo(1.5, 9);
    expect(big.length_m / engine.length_m).toBeCloseTo(1.5, 9);
    expect(big.mass_kg / engine.mass_kg).toBeCloseTo(3.375, 9);
    const fullBig = big.step(big.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    const full = engine.step(engine.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    expect(fullBig.thrust_N / full.thrust_N).toBeCloseTo(2.25, 6);
    expect(fullBig.fuelFlow_kg_s / full.fuelFlow_kg_s).toBeCloseTo(2.25, 6);
  });
});

describe("contract: the engine is pure and deterministic", () => {
  const engine = build();

  it("gives the same result for the same inputs", () => {
    const state = engine.initialState();
    const a = engine.step(state, { throttle: 0.8, afterburner: false }, CRUISE, DT);
    const b = engine.step(state, { throttle: 0.8, afterburner: false }, CRUISE, DT);
    expect(a).toEqual(b);
    // Two designs from the same decisions: the same figures and the same behaviour.
    const again = build();
    expect(JSON.stringify(again)).toBe(JSON.stringify(engine));
    expect(again.step(state, { throttle: 0.8, afterburner: false }, CRUISE, DT)).toEqual(a);
  });

  it("does not change its arguments", () => {
    const state = Object.freeze({ ...engine.initialState() });
    const command = Object.freeze({ throttle: 0.7, afterburner: true });
    const condition = Object.freeze({ ambient: Object.freeze({ pressure_Pa: 26500, temperature_K: 223.25 }), mach: 0.8 });
    const before = JSON.stringify([state, command, condition]);
    engine.step(state, command, condition, DT);
    expect(JSON.stringify([state, command, condition])).toBe(before);
    const decisions = Object.freeze(design());
    designEngine(decisions);
    expect(decisions).toEqual(design());
  });

  it("returns only numbers in its state", () => {
    const next = engine.step(engine.initialState(), DRY_FULL, SEA_LEVEL, DT).state;
    for (const value of Object.values(next)) expect(typeof value).toBe("number");
  });

  it("clamps the throttle to 0 to 1", () => {
    const state = engine.initialState();
    const at = (throttle: number) => engine.step(state, { throttle, afterburner: false }, SEA_LEVEL, DT).output;
    expect(at(2)).toEqual(at(1));
    expect(at(-1)).toEqual(at(0));
  });

  it("asks for shaft speed, not thrust: half throttle gives well under half the thrust", () => {
    const state = engine.initialState();
    const at = (throttle: number) => engine.step(state, { throttle, afterburner: false }, SEA_LEVEL, DT).output.thrust_N;
    expect(at(0)).toBeGreaterThan(0);
    expect(at(0.5)).toBeLessThan(0.3 * at(1));
    let previous = at(0);
    for (const throttle of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      const thrust = at(throttle);
      expect(thrust).toBeGreaterThan(previous);
      previous = thrust;
    }
  });

  it("returns net thrust: the same engine gives less at flight speed than standing still in the same air", () => {
    const state = engine.initialState();
    const still = engine.step(state, DRY_FULL, { ...CRUISE, mach: 0 }, DT).output;
    const flying = engine.step(state, DRY_FULL, { ...CRUISE, mach: 0.3 }, DT).output;
    expect(flying.thrust_N).toBeLessThan(still.thrust_N);
  });

  it("marks every output as estimated: no test region was compared with a hit", () => {
    expect(J47_COMPARED_REGIONS.some((region) => region.hit)).toBe(false);
    for (const region of J47_COMPARED_REGIONS) {
      const out = engine.step(
        engine.initialState(),
        { throttle: 0.95, afterburner: false },
        { ambient: { pressure_Pa: region.ambientPressure_Pa, temperature_K: region.ambientTemperature_K }, mach: region.mach },
        DT,
      ).output;
      expect(out.evidence, region.id).toBe("estimated");
    }
  });
});

describe("evidence rule", () => {
  const hitRegion: ComparedRegion = {
    id: "test",
    mach: 0.53,
    ambientPressure_Pa: 37200,
    ambientTemperature_K: 242.8,
    maxSpeedFraction: 0.974,
    scoredPoints: 4,
    compared: true,
    hit: true,
  };
  const inside: FlightCondition = { ambient: { pressure_Pa: 37200, temperature_K: 242.8 }, mach: 0.53 };

  it("gives validated only with all four conditions: design near the J47, afterburner out, a hit region, a tested speed", () => {
    const rule = evidenceRule([hitRegion], true);
    expect(rule(inside, 0.95, false)).toBe("validated");
    expect(rule(inside, 0.95, true)).toBe("estimated");
    expect(rule(inside, 0.8, false)).toBe("estimated");
    expect(rule(inside, 1, false)).toBe("estimated");
    expect(rule({ ...inside, mach: 0.7 }, 0.95, false)).toBe("estimated");
    expect(rule(SEA_LEVEL, 0.95, false)).toBe("estimated");
    expect(evidenceRule([hitRegion], false)(inside, 0.95, false)).toBe("estimated");
    expect(evidenceRule([{ ...hitRegion, hit: false }], true)(inside, 0.95, false)).toBe("estimated");
  });

  it("calls a design near the J47 when its three figures are within 5 percent and it has no afterburner", () => {
    const j47 = designBasis().j47Design;
    expect(NEAR_J47_FRACTION).toBe(0.05);
    expect(isNearJ47(j47, j47)).toBe(true);
    expect(isNearJ47({ ...j47, pressureRatio: j47.pressureRatio * 1.049 }, j47)).toBe(true);
    expect(isNearJ47({ ...j47, pressureRatio: j47.pressureRatio * 1.051 }, j47)).toBe(false);
    expect(isNearJ47({ ...j47, designAirflow_kg_s: j47.designAirflow_kg_s * 0.94 }, j47)).toBe(false);
    expect(isNearJ47({ ...j47, turbineInletTemperature_K: j47.turbineInletTemperature_K * 1.06 }, j47)).toBe(false);
    expect(isNearJ47({ ...j47, afterburner: true }, j47)).toBe(false);
  });

  it("reaches the engine: a J47-like design in a hit region is validated, a different design is not", () => {
    const j47 = designBasis().j47Design;
    const near = designEngineOn(j47, designBasis, ENGINE_DESIGN_RANGES, [hitRegion]);
    const far = designEngineOn({ ...j47, pressureRatio: 8 }, designBasis, ENGINE_DESIGN_RANGES, [hitRegion]);
    if (!near.ok || !far.ok) throw new Error("rejected");
    // Throttle 0.9 is 0.259 + 0.741 * 0.9 = 0.926 of rated speed, inside 0.85 to 0.974 * 1.01.
    const command = { throttle: 0.9, afterburner: false };
    expect(near.engine.step(near.engine.initialState(), command, inside, DT).output.evidence).toBe("validated");
    expect(far.engine.step(far.engine.initialState(), command, inside, DT).output.evidence).toBe("estimated");
    expect(near.engine.step(near.engine.initialState(), command, SEA_LEVEL, DT).output.evidence).toBe("estimated");
  });
});

describe("turbine inlet temperature limit", () => {
  const basis = designBasis();
  const limit = basis.turbineLimit;

  it("comes from the J47: its limiting turbine-outlet temperature, carried to the inlet with the anchor's ratio", () => {
    // 1275 F is 963.71 K. The anchor has 1148.7 K at the turbine inlet for 966.67 K (1740 R) at its outlet.
    const anchored = j47Engine();
    expect(limit.limit_K).toBeCloseTo((963.705556 * anchored.turbineInletTemperature_K) / 966.666667, 3);
    expect(limit.limit_K).toBeGreaterThan(1140);
    expect(limit.limit_K).toBeLessThan(1150);
  });

  it("reports the temperature, the limit and their ratio", () => {
    const engine = build();
    const out = engine.step(engine.initialState(), { throttle: 0.5, afterburner: false }, SEA_LEVEL, DT).output;
    expect(out.limits).toHaveLength(1);
    const status = out.limits[0];
    expect(status?.id).toBe(TURBINE_INLET_TEMPERATURE_LIMIT_ID);
    expect(status?.unit).toBe("K");
    expect(status?.limit).toBe(limit.limit_K);
    expect(status?.fraction).toBeCloseTo((status?.value ?? 0) / limit.limit_K, 12);
    expect(status?.fraction).toBeLessThan(1);
    expect(turbineLimitStatus(1200, limit).fraction).toBeCloseTo(1200 / limit.limit_K, 12);
  });

  it("accumulates excess temperature times time, and nothing below the limit", () => {
    expect(overheatAfter(0, limit.limit_K - 50, limit, 10)).toBe(0);
    expect(overheatAfter(100, limit.limit_K + 20, limit, 10)).toBeCloseTo(300, 9);
    expect(overheatAfter(100, limit.limit_K + 20, limit, -5)).toBe(100);
    expect(overheatAfter(100, limit.limit_K + 20, limit, Number.NaN)).toBe(100);
    expect(turbineHasFailed(DAMAGE_RULE_V0.overheatBudget_K_s - 1, limit.limit_K + 20, limit)).toBe(false);
    expect(turbineHasFailed(DAMAGE_RULE_V0.overheatBudget_K_s, limit.limit_K + 20, limit)).toBe(true);
    expect(turbineHasFailed(0, limit.limit_K + DAMAGE_RULE_V0.instantFailureExcess_K, limit)).toBe(true);
  });

  it("fails an engine designed 61 K hotter after the time its budget allows, naming the turbine", () => {
    // Acceptance test of the brief: raise the temperature for thrust, watch the limit come, cross it.
    const cool = build({ turbineInletTemperature_K: limit.limit_K - 40 });
    const hot = build({ turbineInletTemperature_K: limit.limit_K + 61 });
    const coolOut = cool.step(cool.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    const hotOut = hot.step(hot.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    expect(hotOut.thrust_N).toBeGreaterThan(coolOut.thrust_N);
    expect(coolOut.limits[0]?.fraction).toBeLessThan(1);
    expect(hotOut.limits[0]?.fraction).toBeGreaterThan(1);
    expect(hotOut.failure).toBeNull();

    // 61 K over the limit: 49 s use up 2989 K s and 50 s use up 3050, over the budget of 3000. Step in seconds.
    let state: EngineState = hot.initialState();
    let seconds = 0;
    let failedAt: number | null = null;
    while (seconds < 120 && failedAt === null) {
      const step = hot.step(state, DRY_FULL, SEA_LEVEL, 1);
      state = step.state;
      seconds += 1;
      if (step.output.failure !== null) {
        failedAt = seconds;
        expect(step.output.failure).toEqual({ limitId: TURBINE_INLET_TEMPERATURE_LIMIT_ID });
        expect(step.output.thrust_N).toBe(0);
        expect(step.output.fuelFlow_kg_s).toBe(0);
        expect(step.output.afterburnerLit).toBe(false);
      }
    }
    expect(failedAt).toBe(50);

    // Once failed it stays failed, even at idle and in cold air.
    const later = hot.step(state, { throttle: 0, afterburner: false }, CRUISE, 100);
    expect(later.output.failure).toEqual({ limitId: TURBINE_INLET_TEMPERATURE_LIMIT_ID });
    expect(later.output.thrust_N).toBe(0);
    expect(later.output.fuelFlow_kg_s).toBe(0);
    expect(later.state.failure).toBe(state.failure);
  });

  it("does not damage the same hot engine while it is run below the limit", () => {
    const hot = build({ turbineInletTemperature_K: limit.limit_K + 60 });
    let state: EngineState = hot.initialState();
    for (let i = 0; i < 600; i++) {
      const step = hot.step(state, { throttle: 0.9, afterburner: false }, SEA_LEVEL, 1);
      expect(step.output.limits[0]?.fraction).toBeLessThan(1);
      state = step.state;
    }
    expect(state.turbineOverheat_K_s).toBe(0);
    expect(hot.step(state, DRY_FULL, SEA_LEVEL, 1).output.failure).toBeNull();
  });

  it("fails at once an engine run 150 K or more over the limit", () => {
    const veryHot = build({ turbineInletTemperature_K: limit.limit_K + 160 });
    const out = veryHot.step(veryHot.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    expect(out.failure).toEqual({ limitId: TURBINE_INLET_TEMPERATURE_LIMIT_ID });
    expect(out.thrust_N).toBe(0);
    // The same engine runs at reduced throttle: it was accepted as a design.
    const reduced = veryHot.step(veryHot.initialState(), { throttle: 0.7, afterburner: false }, SEA_LEVEL, DT).output;
    expect(reduced.failure).toBeNull();
    expect(reduced.thrust_N).toBeGreaterThan(0);
  });
});

describe("afterburner", () => {
  const dry = build();
  const wet = build({ afterburner: true });

  it("is ignored by an engine that has none", () => {
    const state = dry.initialState();
    const asked = dry.step(state, { throttle: 1, afterburner: true }, SEA_LEVEL, DT).output;
    const notAsked = dry.step(state, DRY_FULL, SEA_LEVEL, DT).output;
    expect(asked).toEqual(notAsked);
    expect(asked.afterburnerLit).toBe(false);
  });

  it("leaves the dry engine unchanged while it is not asked for", () => {
    const a = wet.step(wet.initialState(), DRY_FULL, CRUISE, DT).output;
    const b = dry.step(dry.initialState(), DRY_FULL, CRUISE, DT).output;
    expect(a.thrust_N).toBe(b.thrust_N);
    expect(a.fuelFlow_kg_s).toBe(b.fuelFlow_kg_s);
    expect(a.afterburnerLit).toBe(false);
    expect(wet.id.endsWith("-ab")).toBe(true);
  });

  it("gives more thrust for much more fuel, and does not change the turbine temperature", () => {
    const off = wet.step(wet.initialState(), DRY_FULL, SEA_LEVEL, DT).output;
    const on = wet.step(wet.initialState(), { throttle: 1, afterburner: true }, SEA_LEVEL, DT).output;
    expect(on.afterburnerLit).toBe(true);
    expect(on.thrust_N).toBeGreaterThan(1.2 * off.thrust_N);
    expect(on.fuelFlow_kg_s / on.thrust_N).toBeGreaterThan(1.5 * (off.fuelFlow_kg_s / off.thrust_N));
    expect(on.limits[0]?.value).toBe(off.limits[0]?.value);
    expect(on.evidence).toBe("estimated");
  });

  it("gives less thrust the more total pressure the lit afterburner loses", () => {
    const basis = designBasis();
    const withLoss = (pressureLoss: number): number => {
      const stepper = createEngineStepper({
        hardware: j47Engine().hardware,
        idleSpeedFraction: basis.idleSpeedFraction,
        fullSpeedFraction: 1,
        turbineLimit: { ...basis.turbineLimit, limit_K: 2000 },
        afterburner: { ...AFTERBURNER_V0, pressureLoss },
        evidence: () => "estimated",
      });
      return stepper.step(stepper.initialState(), { throttle: 1, afterburner: true }, SEA_LEVEL, DT).output.thrust_N;
    };
    expect(withLoss(0.05)).toBeLessThan(withLoss(0));
    expect(withLoss(0.1)).toBeLessThan(withLoss(0.05));
  });

  it("burns what the energy balance asks to reach its outlet temperature", () => {
    const gas = j47Engine().gas;
    const basis = designBasis();
    const point = j47AtSeaLevelStatic();
    const on = wet.step(wet.initialState(), { throttle: 1, afterburner: true }, SEA_LEVEL, DT).output;
    const f = on.fuelFlow_kg_s / point.airflow_kg_s;
    // Enthalpy of the gas leaving the turbine plus the heat released equals that of the gas at 1900 K.
    const into =
      (1 + point.fuelAirRatio) * gas.enthalpy(point.turbineOutletTemperature_K, point.fuelAirRatio) +
      (f - point.fuelAirRatio) * AFTERBURNER_V0.efficiency * basis.technology.fuelHeatingValue_J_kg;
    const out = (1 + f) * gas.enthalpy(AFTERBURNER_V0.outletTemperature_K, f);
    expect(out / into).toBeCloseTo(1, 6);
  });
});

describe("designs that cannot exist are rejected with a reason", () => {
  it("rejects each decision outside its range, and names it", () => {
    for (const decision of ["designAirflow_kg_s", "pressureRatio", "turbineInletTemperature_K"] as const) {
      const range = ENGINE_DESIGN_RANGES[decision];
      for (const value of [range.min - 1e-9, range.max + 1e-9, Number.NaN, Number.POSITIVE_INFINITY, -1]) {
        const result = designEngine(design({ [decision]: value }));
        expect(result, `${decision} = ${value}`).toEqual({
          ok: false,
          rejections: [{ reasonId: "decision-out-of-range", decision, limit: null }],
        });
      }
      expect(designEngine(design({ [decision]: range.min })).ok || decision !== "designAirflow_kg_s").toBe(true);
    }
  });

  it("lists every decision that is out of range", () => {
    const result = designEngine({ designAirflow_kg_s: 0, pressureRatio: 99, turbineInletTemperature_K: 5000, afterburner: false });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections.map((r) => r.decision)).toEqual(["designAirflow_kg_s", "pressureRatio", "turbineInletTemperature_K"]);
  });

  it("rejects a design whose turbine cannot drive its compressor", () => {
    // Pressure ratio 16 at 900 K: the compressor takes more work than the gas holds above ambient pressure.
    const result = designEngine(design({ pressureRatio: 16, turbineInletTemperature_K: 900 }));
    expect(result).toEqual({
      ok: false,
      rejections: [{ reasonId: "turbine-cannot-drive-compressor", decision: "turbineInletTemperature_K", limit: null }],
    });
  });

  it("rejects a design that is over a limit even at idle, and carries the limit", () => {
    // With the J47 limit no design in the published ranges is that hot at idle, so the limit is lowered here.
    const basis = designBasis();
    const cold = { ...basis, turbineLimit: { ...basis.turbineLimit, limit_K: 500 } };
    const result = designEngineOn(design(), () => cold, ENGINE_DESIGN_RANGES, []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections).toHaveLength(1);
    const [only] = result.rejections;
    expect(only.reasonId).toBe("limit-exceeded-at-idle");
    expect(only.decision).toBe("turbineInletTemperature_K");
    expect(only.limit?.id).toBe(TURBINE_INLET_TEMPERATURE_LIMIT_ID);
    expect(only.limit?.limit).toBe(500);
    expect(only.limit?.fraction).toBeGreaterThan(1);
  });

  it("accepts a design hotter than the turbine limit: it runs at reduced throttle", () => {
    const basis = designBasis();
    const result = designEngine(design({ turbineInletTemperature_K: basis.turbineLimit.limit_K + 300 }));
    expect(result.ok).toBe(true);
  });

  it("gives different identifiers to different designs, however close", () => {
    expect(engineId(design({ pressureRatio: 5 }))).not.toBe(engineId(design({ pressureRatio: 5.000000001 })));
    expect(engineId(design({ afterburner: true }))).not.toBe(engineId(design({ afterburner: false })));
    expect(engineId({ designAirflow_kg_s: 45, pressureRatio: 5, turbineInletTemperature_K: 1150, afterburner: false })).toBe(
      "tj-45-5-1150-dry",
    );
    expect(engineId({ designAirflow_kg_s: 44.6, pressureRatio: 5, turbineInletTemperature_K: 1150, afterburner: true })).toBe(
      "tj-44.6-5-1150-ab",
    );
  });
});

describe("no exception ever leaves the engine (PM's condition of 21 November)", () => {
  const engine = build({ afterburner: true });
  const NASTY = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 0, 1e-300, 1e300];

  it("shows that the gas model itself does throw outside its range", () => {
    const gas = combustionGas({ hydrogenMassFraction: 0.134 });
    expect(() => gas.enthalpy(150, 0)).toThrow(RangeError);
    expect(() => gas.enthalpy(6500, 0)).toThrow(RangeError);
    expect(() => gas.enthalpy(1000, 0.2)).toThrow(RangeError);
  });

  it("turns air colder than the gas model covers into a failure with its identifier, and keeps it", () => {
    const tooCold: FlightCondition = { ambient: { pressure_Pa: 1000, temperature_K: 150 }, mach: 0.5 };
    const step = engine.step(engine.initialState(), DRY_FULL, tooCold, DT);
    expect(step.output.failure).toEqual({ limitId: GAS_MODEL_RANGE_LIMIT_ID });
    expect(step.output.thrust_N).toBe(0);
    expect(step.output.fuelFlow_kg_s).toBe(0);
    expect(step.output.evidence).toBe("estimated");
    const after = engine.step(step.state, DRY_FULL, SEA_LEVEL, DT);
    expect(after.output.failure).toEqual({ limitId: GAS_MODEL_RANGE_LIMIT_ID });
    expect(after.output.thrust_N).toBe(0);
  });

  it("turns a flight speed that heats the air beyond the gas model into the same failure", () => {
    // Mach 25 in air at 223 K: the stagnation enthalpy is above that of air at 6000 K, the top of the gas model.
    const step = engine.step(engine.initialState(), DRY_FULL, { ...CRUISE, mach: 25 }, DT);
    expect(step.output.failure).toEqual({ limitId: GAS_MODEL_RANGE_LIMIT_ID });
    // Mach 12 is still inside the gas model. The engine has no running point there: no thrust, and no failure.
    const fast = engine.step(engine.initialState(), DRY_FULL, { ...CRUISE, mach: 12 }, DT);
    expect(fast.output.failure).toBeNull();
    expect(fast.output.thrust_N).toBe(0);
  });

  it("never throws and always returns finite numbers, whatever numbers it is given", () => {
    const values = [...NASTY, 0.5, 250, 26500];
    let calls = 0;
    for (const pressure_Pa of values) {
      for (const temperature_K of values) {
        for (const mach of [...NASTY, 0.8, 3]) {
          for (const throttle of [Number.NaN, -3, 0, 1, Number.POSITIVE_INFINITY]) {
            for (const dt of [Number.NaN, -1, 0, DT, 1e9]) {
              const condition = { ambient: { pressure_Pa, temperature_K }, mach };
              const step = engine.step(engine.initialState(), { throttle, afterburner: calls % 2 === 0 }, condition, dt);
              calls += 1;
              expect(Number.isFinite(step.output.thrust_N)).toBe(true);
              expect(Number.isFinite(step.output.fuelFlow_kg_s)).toBe(true);
              expect(step.output.fuelFlow_kg_s).toBeGreaterThanOrEqual(0);
              for (const value of Object.values(step.state)) expect(Number.isFinite(value)).toBe(true);
              if (step.output.failure !== null) {
                expect(step.output.thrust_N).toBe(0);
                expect([GAS_MODEL_RANGE_LIMIT_ID, TURBINE_INLET_TEMPERATURE_LIMIT_ID]).toContain(step.output.failure.limitId);
              }
            }
          }
        }
      }
    }
    expect(calls).toBeGreaterThan(10000);
  });

  it("never throws on a state, a command or a condition that is not what the contract says", () => {
    const garbage = [undefined, null, {}, { failure: Number.NaN, turbineOverheat_K_s: "x" }, { failure: 7 }, 42, "state"];
    for (const state of garbage) {
      for (const command of garbage) {
        const step = engine.step(state as unknown as EngineState, command as unknown as EngineCommand, SEA_LEVEL, DT);
        expect(Number.isFinite(step.output.thrust_N)).toBe(true);
      }
      const noCondition = engine.step(state as unknown as EngineState, DRY_FULL, undefined as unknown as FlightCondition, DT);
      expect(noCondition.output.failure).toEqual({ limitId: GAS_MODEL_RANGE_LIMIT_ID });
      const noAmbient = engine.step(state as unknown as EngineState, DRY_FULL, { mach: 0.5 } as unknown as FlightCondition, DT);
      expect(noAmbient.output.failure).toEqual({ limitId: GAS_MODEL_RANGE_LIMIT_ID });
    }
  });

  it("designEngine never throws: what is not a design is a rejection", () => {
    const garbage = [undefined, null, {}, 42, "design", { designAirflow_kg_s: "40" }, { afterburner: "yes" }];
    for (const input of garbage) {
      const result = designEngine(input as unknown as EngineDesign);
      expect(result.ok, JSON.stringify(input)).toBe(false);
      if (!result.ok) expect(result.rejections.every((r) => r.reasonId === "decision-out-of-range")).toBe(true);
    }
  });

  it("turns a design the gas model refuses into a rejection, not an exception", () => {
    // Ranges opened on purpose: 7000 K is above the 6000 K the gas model covers, and it throws there.
    const wide: EngineDesignRanges = {
      ...ENGINE_DESIGN_RANGES,
      turbineInletTemperature_K: { min: 900, max: 10000, unit: "K" },
    };
    const result = designEngineOn(design({ turbineInletTemperature_K: 7000 }), designBasis, wide, []);
    expect(result).toEqual({ ok: false, rejections: [{ reasonId: "decision-out-of-range", decision: null, limit: null }] });
    // The same with a basis that cannot be computed at all.
    const broken = designEngineOn(
      design(),
      () => {
        throw new RangeError("no basis");
      },
      ENGINE_DESIGN_RANGES,
      [],
    );
    expect(broken).toEqual({ ok: false, rejections: [{ reasonId: "decision-out-of-range", decision: null, limit: null }] });
  });

  it("gives no thrust and no failure where the engine has no running point", () => {
    // Idle at Mach 0.8 and 10 km: the ram pressure pushes more air through the nozzle than the turbine passes.
    const step = engine.step(engine.initialState(), { throttle: 0, afterburner: false }, CRUISE, DT);
    expect(step.output.failure).toBeNull();
    expect(step.output.thrust_N).toBe(0);
    expect(step.output.fuelFlow_kg_s).toBe(0);
    // And it comes back when the throttle is opened.
    const again = engine.step(step.state, DRY_FULL, CRUISE, DT);
    expect(again.output.thrust_N).toBeGreaterThan(0);
  });
});

describe("intake", () => {
  const gas = combustionGas({ hydrogenMassFraction: 0.134 });

  it("recovers all the total pressure below Mach 1 and less above it", () => {
    expect(intakeRecovery(0)).toBe(1);
    expect(intakeRecovery(1)).toBe(1);
    // 1 - 0.075 * 1^1.35
    expect(intakeRecovery(2)).toBeCloseTo(0.925, 12);
    expect(intakeRecovery(100)).toBe(0.01);
  });

  it("gives the total conditions of the air at flight speed", () => {
    // Mach 0.8 at 223.25 K: close to the gamma 1.4 values, 223.25 * 1.128 = 251.83 K and a pressure ratio of 1.5243.
    const inlet = flightInlet(gas, CRUISE);
    if (!inlet) throw new Error("no inlet");
    expect(inlet.totalTemperature_K).toBeCloseTo(251.83, 0);
    expect(inlet.totalPressure_Pa / CRUISE.ambient.pressure_Pa).toBeCloseTo(1.5243, 2);
    expect(inlet.speed_m_s).toBeCloseTo(0.8 * Math.sqrt(1.4 * 287.05 * 223.25), 0);
    // Energy: total enthalpy is static enthalpy plus kinetic energy.
    expect(gas.enthalpy(inlet.totalTemperature_K, 0)).toBeCloseTo(gas.enthalpy(223.25, 0) + inlet.speed_m_s ** 2 / 2, 3);
  });

  it("treats a negative Mach number as standing still", () => {
    expect(flightInlet(gas, { ...CRUISE, mach: -0.3 })).toEqual(flightInlet(gas, { ...CRUISE, mach: 0 }));
  });
});

describe("public interface of @jet-workshop/physics/propulsion", () => {
  it("exports the design function, its ranges and the J47 as a design", () => {
    expect(publicApi.designEngine).toBe(designEngine);
    expect(publicApi.ENGINE_DESIGN_RANGES).toBe(ENGINE_DESIGN_RANGES);
    expect(publicApi.j47Design()).toEqual(designBasis().j47Design);
    expect(publicApi.TURBINE_INLET_TEMPERATURE_LIMIT_ID).toBe("turbine-inlet-temperature");
    expect(publicApi.GAS_MODEL_RANGE_LIMIT_ID).toBe("gas-model-range");
    const j47 = publicApi.j47Design();
    for (const decision of ["designAirflow_kg_s", "pressureRatio", "turbineInletTemperature_K"] as const) {
      expect(j47[decision]).toBeGreaterThan(ENGINE_DESIGN_RANGES[decision].min);
      expect(j47[decision]).toBeLessThan(ENGINE_DESIGN_RANGES[decision].max);
    }
  });
});
