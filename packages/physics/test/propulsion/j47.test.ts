import { describe, expect, it } from "vitest";
import componentsCsv from "../../data/engines/j47/component-tables-run1.csv?raw";
import componentsPassA from "../../data/engines/j47/passes/component-tables-run1.pass-a.csv?raw";
import componentsPassB from "../../data/engines/j47/passes/component-tables-run1.pass-b.csv?raw";
import tablePassA from "../../data/engines/j47/passes/rm-e9g09-table1.pass-a.csv?raw";
import tablePassB from "../../data/engines/j47/passes/rm-e9g09-table1.pass-b.csv?raw";
import tableCsv from "../../data/engines/j47/rm-e9g09-table1.csv?raw";
import {
  ANCHOR_RUN,
  HIT_FRACTION,
  MAX_MEDIAN_UVAL_FRACTION,
  MIN_HIT_FRACTION,
  MIN_SCORED_POINTS,
  QUANTITIES,
  compareJ47,
} from "../../src/propulsion/j47-comparison.ts";
import { J47_COMPARED_REGIONS } from "../../src/propulsion/j47-compared-regions.generated.ts";
import { j47RunToSI, parseJ47Table } from "../../src/propulsion/j47-data.ts";
import {
  J47_TESTED_CONDITIONS,
  REGION_MACH_TOLERANCE,
  REGION_PRESSURE_TOLERANCE,
  buildJ47Regions,
  isHighSpeed,
  isSpeedTested,
  regionOfFlight,
  regionOfRun,
} from "../../src/propulsion/j47-regions.ts";
import {
  J47_ANCHOR_REPORTED,
  J47_ANCHOR_REPORT_UNITS,
  J47_RATING,
  j47AnchorState,
  j47AtSeaLevelStatic,
  j47Engine,
  j47NozzleHotArea_m2,
  j47SpeedFraction,
} from "../../src/propulsion/j47.ts";
import { solveOperatingPoint } from "../../src/propulsion/offdesign.ts";
import { lbPerSecondToKgPerSecond, lbfToNewton, psfToPascal, rankineToKelvin } from "../../src/propulsion/units.ts";

const runs = parseJ47Table(tableCsv);

/** Rows of a CSV as objects keyed by its header. */
function table(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = (lines[0] ?? "").split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    return Object.fromEntries(header.map((name, i) => [name, cells[i] ?? ""]));
  });
}

describe("J47 data: RM E9G09 table I as transcribed", () => {
  it("has the 97 runs of the table, numbered in order, every one labelled measured", () => {
    expect(runs.map((run) => run.run)).toEqual(Array.from({ length: 97 }, (_, i) => i + 1));
    expect(runs.every((run) => run.dataClass === "measured")).toBe(true);
  });

  it("is the reading both independent passes agree on, cell by cell", () => {
    const dataset = table(tableCsv);
    const passA = table(tablePassA);
    const passB = table(tablePassB);
    expect(passA).toHaveLength(97);
    expect(passB).toHaveLength(97);
    let cells = 0;
    dataset.forEach((row, i) => {
      for (const [column, value] of Object.entries(row)) {
        if (column === "data_class") continue;
        cells += 1;
        // The same number in both passes: "1.210" and "1.21" are the same reading.
        const a = passA[i]?.[column] ?? "missing";
        const b = passB[i]?.[column] ?? "missing";
        expect(a === "" ? a : Number(a), `run ${row.run}, ${column}, pass A`).toEqual(value === "" ? value : Number(value));
        expect(b === "" ? b : Number(b), `run ${row.run}, ${column}, pass B`).toEqual(value === "" ? value : Number(value));
      }
    });
    expect(cells).toBe(97 * 18);
  });

  it("only tested the altitudes and Mach numbers the report lists", () => {
    for (const run of runs) {
      const tested = J47_TESTED_CONDITIONS.find((condition) => condition.altitude_ft === run.altitude_ft);
      expect(tested, `run ${run.run}`).toBeDefined();
      expect(regionOfRun(run), `run ${run.run}`).not.toBeNull();
    }
  });

  it("is consistent with itself: fuel-air ratio and specific fuel consumption follow from the flows and the thrust", () => {
    for (const run of runs) {
      expect(Math.abs(run.fuelAirRatio - run.fuelFlow_lb_h / 3600 / run.airFlow_lb_s), `run ${run.run}`).toBeLessThan(0.00011);
      if (run.sfc_lb_h_lbf !== null) {
        const sfc = run.fuelFlow_lb_h / run.netThrust_lbf;
        expect(Math.abs(run.sfc_lb_h_lbf / sfc - 1), `run ${run.run}`).toBeLessThan(0.01);
      }
    }
  });

  it("recovers the measured inlet state and the report's ram drag when a run is converted to SI", () => {
    // Run 1: P1 = 1.038 * 1740 = 1806.1 lb/sq ft, as RM E9G28 tabulates (1806); T1 = 507 * 1.038^(2/7) = 512.4 R (512).
    const first = runs[0];
    if (!first) throw new Error("no runs");
    const si = j47RunToSI(first);
    expect(si.inletTotalPressure_Pa).toBeCloseTo(psfToPascal(1806.12), 0);
    expect(si.inletTotalTemperature_K).toBeCloseTo(rankineToKelvin(512.43), 1);
    // Jet thrust minus net thrust is the ram drag: 4880 - 4237 = 643 lbf.
    expect(si.airflow_kg_s * si.flightSpeed_m_s).toBeCloseTo(lbfToNewton(643), -1);
  });
});

describe("J47 data: the anchor run in the component tables", () => {
  const components = table(componentsCsv);
  const value = (report: string, quantity: string): number => {
    const row = components.find((r) => r.report === report && r.quantity === quantity);
    if (!row) throw new Error(`${report} ${quantity} not in the component table`);
    return Number(row.value);
  };

  it("is the same reading in both passes", () => {
    const passA = table(componentsPassA);
    const passB = componentsPassB;
    expect(passA).toHaveLength(components.length);
    components.forEach((row, i) => {
      expect(Number(passA[i]?.value), `${row.report} ${row.quantity}, pass A`).toBe(Number(row.value));
    });
    // Pass B keeps the printed column titles, so its lines are matched by report, page and value.
    const linesB = passB.split(/\r?\n/);
    for (const row of components) {
      const found = linesB.some(
        (line) => line.startsWith(`${row.report},${row.pdf_page},`) && Number(line.slice(line.lastIndexOf(",") + 1)) === Number(row.value),
      );
      expect(found, `${row.report} page ${row.pdf_page} ${row.quantity} = ${row.value}, pass B`).toBe(true);
    }
  });

  it("holds every anchor value the model uses", () => {
    const a = J47_ANCHOR_REPORT_UNITS;
    const overall = runs.find((run) => run.run === ANCHOR_RUN);
    if (!overall) throw new Error("no anchor run");
    expect(a.tunnelStaticPressure_psf).toBe(overall.tunnelStaticPressure_psf);
    expect(a.flightMach).toBe(overall.flightMach);
    expect(a.equivalentAmbientTemperature_R).toBe(overall.equivalentAmbientTemperature_R);
    expect(a.engineSpeed_rpm).toBe(overall.engineSpeed_rpm);
    expect(a.airFlow_lb_s).toBe(overall.airFlow_lb_s);
    expect(a.fuelFlow_lb_h).toBe(overall.fuelFlow_lb_h);
    expect(a.jetThrust_lbf).toBe(overall.jetThrust_lbf);
    expect(a.engineTotalPressureRatio).toBe(overall.engineTotalPressureRatio);
    expect(a.engineInletTotalPressure_psf).toBe(value("E9G28", "engine_inlet_total_pressure"));
    expect(a.engineInletTotalTemperature_R).toBe(value("E9G28", "engine_inlet_total_temperature"));
    expect(a.compressorOutletTotalPressure_psf).toBe(value("E9G28", "compressor_outlet_total_pressure"));
    expect(a.compressorOutletTotalTemperature_R).toBe(value("E9G28", "compressor_outlet_total_temperature"));
    expect(a.turbineInletTotalPressure_psf).toBe(value("E9K10", "turbine_inlet_total_pressure"));
    expect(a.turbineOutletTotalPressure_psf).toBe(value("E9K10", "turbine_outlet_total_pressure"));
    expect(a.turbineOutletTotalTemperature_R).toBe(value("E9K10", "turbine_outlet_total_temperature"));
  });

  it("holds the tabulated figures the model is checked against", () => {
    const r = J47_ANCHOR_REPORTED;
    expect(r.compressorEfficiency_percent).toBe(value("E9G28", "compressor_efficiency"));
    expect(r.combustionEfficiency).toBe(value("E9L02", "combustion_efficiency"));
    expect(r.turbineEfficiency).toBe(value("E9K10", "adiabatic_turbine_efficiency"));
    expect(r.turbineInletTotalTemperature_R).toBe(value("E9K10", "turbine_inlet_total_temperature"));
    expect(r.compressorLeakageAirFlow_lb_s).toBe(value("E9K10", "compressor_leakage_air_flow"));
    expect(r.turbineCoolingAirFlow_lb_s).toBe(value("E9K10", "aft_turbine_cooling_air_flow"));
  });
});

describe("J47 anchored on run 1", () => {
  const engine = j47Engine();
  const state = j47AnchorState();
  const tech = engine.hardware.technology;

  it("reproduces every measured value it was anchored on", () => {
    const p = engine.point;
    expect(p.compressorOutletTemperature_K).toBeCloseTo(state.compressorOutletTemperature_K, 6);
    expect(p.compressorOutletPressure_Pa / state.compressorOutletPressure_Pa).toBeCloseTo(1, 10);
    expect(p.turbineInletPressure_Pa / state.turbineInletPressure_Pa).toBeCloseTo(1, 10);
    expect(p.turbineOutletTemperature_K).toBeCloseTo(state.turbineOutletTemperature_K, 6);
    expect(p.turbineOutletPressure_Pa / state.turbineOutletPressure_Pa).toBeCloseTo(1, 9);
    expect(p.nozzleInletPressure_Pa / state.nozzleInletPressure_Pa).toBeCloseTo(1, 9);
    expect(p.fuelFlow_kg_s / state.fuelFlow_kg_s).toBeCloseTo(1, 9);
    expect(p.grossThrust_N / state.jetThrust_N).toBeCloseTo(1, 9);
  });

  it("gives the same point through the off-design solver at the anchor conditions", () => {
    const solved = solveOperatingPoint(engine.hardware, {
      ambientPressure_Pa: state.ambientPressure_Pa,
      inletTotalPressure_Pa: state.inletTotalPressure_Pa,
      inletTotalTemperature_K: state.inletTotalTemperature_K,
      flightSpeed_m_s: 0,
      speedFraction: 1,
    });
    if (!solved.ok) throw new Error(solved.reason);
    expect(solved.point.airflow_kg_s / state.airflow_kg_s).toBeCloseTo(1, 8);
    expect(solved.point.fuelFlow_kg_s / state.fuelFlow_kg_s).toBeCloseTo(1, 8);
    expect(solved.point.grossThrust_N / state.jetThrust_N).toBeCloseTo(1, 8);
  });

  it("computes component figures close to the ones the reports tabulate, with a different gas and no bleed", () => {
    // The reports use constant specific heats or their own charts, and take the measured bleed out of
    // the turbine flow. The model does neither, so these agree to a few points and not exactly.
    expect(Math.abs(engine.compressorIsentropicEfficiency - J47_ANCHOR_REPORTED.compressorEfficiency_percent / 100)).toBeLessThan(0.015);
    expect(Math.abs(engine.turbineIsentropicEfficiency - J47_ANCHOR_REPORTED.turbineEfficiency)).toBeLessThan(0.04);
    expect(Math.abs(tech.burnerEfficiency - J47_ANCHOR_REPORTED.combustionEfficiency)).toBeLessThan(0.04);
    const reportedT4 = rankineToKelvin(J47_ANCHOR_REPORTED.turbineInletTotalTemperature_R);
    expect(Math.abs(engine.turbineInletTemperature_K - reportedT4)).toBeLessThan(10);
  });

  it("needs a nozzle flow area within 1 percent of the geometric area of the report", () => {
    expect(Math.abs(engine.hardware.nozzleArea_m2 / j47NozzleHotArea_m2() - 1)).toBeLessThan(0.01);
  });

  it("has a thrust coefficient between 0.97 and 1.01, the band of the report's figure 3 above a pressure ratio of 1.8", () => {
    expect(tech.nozzleThrustCoefficient).toBeGreaterThan(0.97);
    expect(tech.nozzleThrustCoefficient).toBeLessThan(1.01);
  });

  it("comes out at sea-level static near the air flow and pressure ratio of the rating in the report text", () => {
    const seaLevel = j47AtSeaLevelStatic();
    expect(Math.abs(seaLevel.airflow_kg_s / lbPerSecondToKgPerSecond(J47_RATING.airFlow_lb_s) - 1)).toBeLessThan(0.02);
    expect(Math.abs(seaLevel.pressureRatio / J47_RATING.pressureRatio - 1)).toBeLessThan(0.02);
  });

  it("maps the anchor speed to speed fraction 1", () => {
    expect(j47SpeedFraction(J47_ANCHOR_REPORT_UNITS.engineSpeed_rpm)).toBe(1);
  });
});

describe("region rule", () => {
  const regions = buildJ47Regions(runs);

  it("finds the 14 regions of the report, each with its runs above 85 percent of rated speed", () => {
    expect(regions).toHaveLength(14);
    expect(regions.map((region) => region.id)).toEqual(
      J47_TESTED_CONDITIONS.flatMap((c) => c.machs.map((mach) => `${c.altitude_ft}-${mach.toFixed(2)}`)),
    );
    // 5000 ft, Mach 0.21: runs 1 to 4, at 7895, 7692, 7500 and 6993 rpm. Run 5, at 6459 rpm, is below 6715.
    expect(regions[0]?.highSpeedRuns).toEqual([1, 2, 3, 4]);
    expect(isHighSpeed(6993)).toBe(true);
    expect(isHighSpeed(6459)).toBe(false);
  });

  it("puts the centre of a region at the mean of its high-speed runs", () => {
    // 5000 ft, Mach 0.21: Mach (0.230 + 0.225 + 0.230 + 0.220) / 4, pressure (1740 + 1756 + 1740 + 1742) / 4 lb/sq ft,
    // equivalent temperature (507 + 509 + 506 + 508) / 4 R, highest speed 7895 of 7900 rpm.
    const region = regions[0];
    if (!region) throw new Error("no regions");
    expect(region.mach).toBeCloseTo(0.22625, 12);
    expect(region.ambientPressure_Pa).toBeCloseTo(psfToPascal(1744.5), 6);
    expect(region.ambientTemperature_K).toBeCloseTo(rankineToKelvin(507.5), 9);
    expect(region.maxSpeedFraction).toBeCloseTo(7895 / 7900, 12);
  });

  it("keeps the regions apart: no flight condition can fall in two", () => {
    for (const a of regions) {
      for (const b of regions) {
        if (a.id >= b.id) continue;
        const machApart = Math.abs(a.mach - b.mach) > 2 * REGION_MACH_TOLERANCE;
        const ratio = Math.max(a.ambientPressure_Pa, b.ambientPressure_Pa) / Math.min(a.ambientPressure_Pa, b.ambientPressure_Pa);
        const pressureApart = ratio > (1 + REGION_PRESSURE_TOLERANCE) / (1 - REGION_PRESSURE_TOLERANCE);
        expect(machApart || pressureApart, `${a.id} and ${b.id}`).toBe(true);
      }
    }
  });

  it("places every high-speed run in its own region", () => {
    for (const run of runs.filter((r) => isHighSpeed(r.engineSpeed_rpm))) {
      const si = j47RunToSI(run);
      const expected = regionOfRun(run);
      const found = regionOfFlight(regions, {
        mach: run.flightMach,
        ambientPressure_Pa: si.ambientPressure_Pa,
        ambientTemperature_K: si.ambientTemperature_K,
      });
      expect(found?.id, `run ${run.run}`).toBe(`${expected?.altitude_ft}-${expected?.nominalMach.toFixed(2)}`);
    }
  });

  it("leaves out conditions away from the tests: sea level, between two regions, and a colder day", () => {
    const region = regions.find((r) => r.id === "25000-0.53");
    if (!region) throw new Error("no region");
    const centre = { mach: region.mach, ambientPressure_Pa: region.ambientPressure_Pa, ambientTemperature_K: region.ambientTemperature_K };
    expect(regionOfFlight(regions, centre)?.id).toBe("25000-0.53");
    // Take-off: sea level and standing still.
    expect(regionOfFlight(regions, { mach: 0, ambientPressure_Pa: 101325, ambientTemperature_K: 288.15 })).toBeNull();
    // Mach 0.62 is 0.09 from 0.53 and 0.10 from 0.72.
    expect(regionOfFlight(regions, { ...centre, mach: 0.62 })).toBeNull();
    // 11 percent less pressure, about 2500 ft higher.
    expect(regionOfFlight(regions, { ...centre, ambientPressure_Pa: 0.89 * centre.ambientPressure_Pa })).toBeNull();
    // 4 percent colder.
    expect(regionOfFlight(regions, { ...centre, ambientTemperature_K: 0.96 * centre.ambientTemperature_K })).toBeNull();
    // Just inside each tolerance.
    expect(regionOfFlight(regions, { ...centre, mach: region.mach + 0.049 })?.id).toBe("25000-0.53");
    expect(regionOfFlight(regions, { ...centre, ambientPressure_Pa: 1.099 * centre.ambientPressure_Pa })?.id).toBe("25000-0.53");
    expect(regionOfFlight(regions, { ...centre, ambientTemperature_K: 1.029 * centre.ambientTemperature_K })?.id).toBe("25000-0.53");
  });

  it("counts a speed as tested only between 85 percent and the highest speed of the region, plus 1 percent", () => {
    // 25 000 ft, Mach 0.21: the turbine-outlet temperature stopped the tests at 7692 rpm, 97.4 percent.
    const region = regions.find((r) => r.id === "25000-0.21");
    if (!region) throw new Error("no region");
    expect(region.maxSpeedFraction).toBeCloseTo(7692 / 7900, 12);
    expect(isSpeedTested(region, 0.85)).toBe(false);
    expect(isSpeedTested(region, 0.9)).toBe(true);
    expect(isSpeedTested(region, 0.98)).toBe(true);
    expect(isSpeedTested(region, 1)).toBe(false);
  });
});

describe("comparison with the J47 tests", () => {
  const comparison = compareJ47(runs);
  const scored = comparison.points.filter((point) => point.scored);

  it("scores the runs above 85 percent of rated speed, without the anchor run", () => {
    expect(scored).toHaveLength(43);
    expect(scored.some((point) => point.run === ANCHOR_RUN)).toBe(false);
    expect(scored.every((point) => isHighSpeed(point.speed_rpm) && point.regionId !== null)).toBe(true);
    expect(comparison.unassignedHighSpeedRuns).toEqual([]);
  });

  it("has no error left at the anchor run beyond the rounding of its inlet temperature", () => {
    // The table rounds the equivalent temperature to 1 R, so the inlet temperature of run 1 comes out
    // 0.4 R above the 512 R the model was anchored on. That moves each output by a few parts in a thousand.
    const anchor = comparison.points.find((point) => point.run === ANCHOR_RUN);
    if (!anchor?.error) throw new Error("no anchor point");
    for (const q of QUANTITIES) expect(Math.abs(anchor.error[q] / anchor.measured[q]), q).toBeLessThan(0.006);
  });

  it("computes E, u_val and the hit of a point as the plan defines them", () => {
    for (const point of scored) {
      if (!point.error || !point.model || !point.uVal || !point.uInput || !point.uNum || !point.hit) continue;
      for (const q of QUANTITIES) {
        expect(point.error[q]).toBe(point.model[q] - point.measured[q]);
        expect(point.uVal[q]).toBeCloseTo(Math.hypot(point.uD[q], point.uNum[q], point.uInput[q]), 12);
        const threshold = Math.max(point.uVal[q], HIT_FRACTION[q] * point.measured[q]);
        expect(point.hit[q]).toBe(Math.abs(point.error[q]) <= threshold);
      }
    }
  });

  it("takes u_D from the declared figures: 1.5 percent of air flow, 2 percent of fuel flow, and jet thrust with ram drag", () => {
    const point = scored.find((p) => p.run === 53);
    const run = runs.find((r) => r.run === 53);
    if (!point || !run) throw new Error("no run 53");
    // Run 53: jet thrust 4196 lbf, net 2647 lbf, so ram drag 1549 lbf. u = sqrt((0.015 * 4196)^2 + (0.015 * 1549)^2) lbf.
    expect(point.uD.airflow).toBeCloseTo(0.015 * point.measured.airflow, 12);
    expect(point.uD.fuelFlow).toBeCloseTo(0.02 * point.measured.fuelFlow, 12);
    expect(point.uD.netThrust / lbfToNewton(1)).toBeCloseTo(Math.hypot(0.015 * 4196, 0.015 * 1549), 0);
  });

  it("makes the numerical uncertainty negligible next to the others", () => {
    for (const point of scored) {
      for (const q of QUANTITIES) expect((point.uNum?.[q] ?? 1) / point.measured[q]).toBeLessThan(1e-4);
    }
  });

  it("decides compared and hit of a region by the three preregistered conditions", () => {
    for (const result of comparison.regions) {
      const enoughPoints = result.points.length >= MIN_SCORED_POINTS;
      const tightEnough =
        result.medianUvalFraction !== null && QUANTITIES.every((q) => (result.medianUvalFraction?.[q] ?? 1) <= MAX_MEDIAN_UVAL_FRACTION);
      expect(result.compared, result.region.id).toBe(enoughPoints && tightEnough);
      const hits = result.points.filter((point) => QUANTITIES.every((q) => point.hit?.[q])).length;
      expect(result.hits, result.region.id).toBe(hits);
      expect(result.hit, result.region.id).toBe(result.compared && hits >= MIN_HIT_FRACTION * result.points.length);
    }
  });

  it("does not count as compared the regions with fewer than 3 scored points", () => {
    const few = comparison.regions.filter((result) => result.points.length < MIN_SCORED_POINTS).map((result) => result.region.id);
    expect(few).toEqual(["15000-0.21", "45000-0.21", "50000-0.21"]);
    for (const result of comparison.regions) if (few.includes(result.region.id)) expect(result.compared).toBe(false);
  });

  it("is what the generated list of regions in the engine says", () => {
    expect(J47_COMPARED_REGIONS).toHaveLength(comparison.regions.length);
    comparison.regions.forEach((result, i) => {
      const generated = J47_COMPARED_REGIONS[i];
      expect(generated?.id).toBe(result.region.id);
      expect(generated?.mach).toBe(result.region.mach);
      expect(generated?.ambientPressure_Pa).toBe(result.region.ambientPressure_Pa);
      expect(generated?.ambientTemperature_K).toBe(result.region.ambientTemperature_K);
      expect(generated?.maxSpeedFraction).toBe(result.region.maxSpeedFraction);
      expect(generated?.scoredPoints).toBe(result.points.length);
      expect(generated?.compared).toBe(result.compared);
      expect(generated?.hit).toBe(result.hit);
    });
  });
});
