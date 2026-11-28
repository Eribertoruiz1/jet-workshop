/**
 * The runs of NACA RM E9G09, table I, as data: parsing of the transcribed CSV
 * (packages/physics/data/engines/j47/rm-e9g09-table1.csv) and conversion of one
 * run to the SI conditions the model takes. No file access here: the caller
 * reads the file, so this module also runs in the browser.
 */

import {
  feetToMetres,
  lbPerHourToKgPerSecond,
  lbPerSecondToKgPerSecond,
  lbfToNewton,
  psfToPascal,
  rankineToKelvin,
} from "./units.ts";

/** One run of table I, in report units, as printed. */
export interface J47Run {
  readonly run: number;
  readonly altitude_ft: number;
  /** Engine-inlet total pressure over tunnel static pressure, P1/p0 */
  readonly ramPressureRatio: number;
  readonly flightMach: number;
  readonly tunnelStaticPressure_psf: number;
  readonly equivalentAmbientTemperature_R: number;
  readonly engineSpeed_rpm: number;
  readonly compressorInletIndicatedTemperature_R: number;
  /** Balance-scale thrust, lbf */
  readonly jetThrust_lbf: number;
  readonly netThrust_lbf: number;
  readonly airFlow_lb_s: number;
  readonly fuelFlow_lb_h: number;
  /** Based on net thrust, lb/(h lbf). null where the table prints dashes. */
  readonly sfc_lb_h_lbf: number | null;
  readonly fuelAirRatio: number;
  readonly exhaustGasTotalTemperature_R: number;
  readonly turbineOutletTotalPressure_psf: number;
  /** Nozzle total pressure over engine-inlet total pressure, P7/P1 */
  readonly engineTotalPressureRatio: number;
  readonly engineTotalTemperatureRatio: number;
  readonly dataClass: string;
}

const COLUMNS = [
  "run",
  "altitude_ft",
  "ram_pressure_ratio",
  "flight_mach",
  "tunnel_static_pressure_psf",
  "equivalent_ambient_temperature_R",
  "engine_speed_rpm",
  "compressor_inlet_indicated_temperature_R",
  "jet_thrust_lbf",
  "net_thrust_lbf",
  "air_flow_lb_s",
  "fuel_flow_lb_h",
  "sfc_lb_h_lbf",
  "fuel_air_ratio",
  "exhaust_gas_total_temperature_R",
  "turbine_outlet_total_pressure_psf",
  "engine_total_pressure_ratio",
  "engine_total_temperature_ratio",
  "data_class",
] as const;

/** Parses the transcribed table. Throws on a malformed file: it is a build-time input, not flight data. */
export function parseJ47Table(csv: string): J47Run[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines[0] !== COLUMNS.join(",")) throw new Error("unexpected header in the J47 table");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    if (cells.length !== COLUMNS.length) throw new Error(`expected ${COLUMNS.length} cells in "${line}"`);
    const cell = (name: (typeof COLUMNS)[number]): string => cells[COLUMNS.indexOf(name)] ?? "";
    const number = (name: (typeof COLUMNS)[number]): number => {
      const value = Number(cell(name));
      if (cell(name) === "" || !Number.isFinite(value)) throw new Error(`run ${cell("run")}: "${name}" is not a number`);
      return value;
    };
    return {
      run: number("run"),
      altitude_ft: number("altitude_ft"),
      ramPressureRatio: number("ram_pressure_ratio"),
      flightMach: number("flight_mach"),
      tunnelStaticPressure_psf: number("tunnel_static_pressure_psf"),
      equivalentAmbientTemperature_R: number("equivalent_ambient_temperature_R"),
      engineSpeed_rpm: number("engine_speed_rpm"),
      compressorInletIndicatedTemperature_R: number("compressor_inlet_indicated_temperature_R"),
      jetThrust_lbf: number("jet_thrust_lbf"),
      netThrust_lbf: number("net_thrust_lbf"),
      airFlow_lb_s: number("air_flow_lb_s"),
      fuelFlow_lb_h: number("fuel_flow_lb_h"),
      sfc_lb_h_lbf: cell("sfc_lb_h_lbf") === "" ? null : number("sfc_lb_h_lbf"),
      fuelAirRatio: number("fuel_air_ratio"),
      exhaustGasTotalTemperature_R: number("exhaust_gas_total_temperature_R"),
      turbineOutletTotalPressure_psf: number("turbine_outlet_total_pressure_psf"),
      engineTotalPressureRatio: number("engine_total_pressure_ratio"),
      engineTotalTemperatureRatio: number("engine_total_temperature_ratio"),
      dataClass: cell("data_class"),
    };
  });
}

/** Constants of the report's own reductions (RM E9G09, pages 11 to 13). */
const REPORT_GAMMA = 1.4;
const REPORT_GAS_CONSTANT_FT_LBF_PER_LB_R = 53.3;
const REPORT_GRAVITY_FT_S2 = 32.2;

/** One run in SI: what the tunnel set, and what was measured. */
export interface J47RunSI {
  readonly run: number;
  readonly speed_rpm: number;
  /** Tunnel static pressure, Pa */
  readonly ambientPressure_Pa: number;
  /** Equivalent ambient static temperature, K: what gives the measured inlet total temperature with full ram recovery */
  readonly ambientTemperature_K: number;
  /** Flight Mach number from the ram pressure ratio, equation 1 of the report */
  readonly mach: number;
  readonly inletTotalPressure_Pa: number;
  /** Engine-inlet total temperature, K, from the equivalent temperature and the ram ratio, equation 3 */
  readonly inletTotalTemperature_K: number;
  /** Equivalent free-stream velocity, m/s, as the report computes it for the ram drag */
  readonly flightSpeed_m_s: number;
  readonly jetThrust_N: number;
  readonly netThrust_N: number;
  readonly airflow_kg_s: number;
  readonly fuelFlow_kg_s: number;
  readonly exhaustGasTotalTemperature_K: number;
}

/**
 * Converts a run to SI and undoes the report's reductions with the report's
 * own definitions: gamma 1.4 and complete ram-pressure recovery (equations 1
 * and 3 of RM E9G09, page 13). The Mach number is recomputed from the ram
 * pressure ratio because the table prints it rounded to 0.005.
 */
export function j47RunToSI(run: J47Run): J47RunSI {
  const k = (REPORT_GAMMA - 1) / REPORT_GAMMA;
  const ramTemperatureRatio = run.ramPressureRatio ** k;
  const mach = Math.sqrt((2 / (REPORT_GAMMA - 1)) * Math.max(0, ramTemperatureRatio - 1));
  const speedOfSound_ft_s = Math.sqrt(
    REPORT_GAMMA * REPORT_GRAVITY_FT_S2 * REPORT_GAS_CONSTANT_FT_LBF_PER_LB_R * run.equivalentAmbientTemperature_R,
  );
  const ambientPressure_Pa = psfToPascal(run.tunnelStaticPressure_psf);
  return {
    run: run.run,
    speed_rpm: run.engineSpeed_rpm,
    ambientPressure_Pa,
    ambientTemperature_K: rankineToKelvin(run.equivalentAmbientTemperature_R),
    mach,
    inletTotalPressure_Pa: ambientPressure_Pa * run.ramPressureRatio,
    inletTotalTemperature_K: rankineToKelvin(run.equivalentAmbientTemperature_R * ramTemperatureRatio),
    flightSpeed_m_s: feetToMetres(mach * speedOfSound_ft_s),
    jetThrust_N: lbfToNewton(run.jetThrust_lbf),
    netThrust_N: lbfToNewton(run.netThrust_lbf),
    airflow_kg_s: lbPerSecondToKgPerSecond(run.airFlow_lb_s),
    fuelFlow_kg_s: lbPerHourToKgPerSecond(run.fuelFlow_lb_h),
    exhaustGasTotalTemperature_K: rankineToKelvin(run.exhaustGasTotalTemperature_R),
  };
}
