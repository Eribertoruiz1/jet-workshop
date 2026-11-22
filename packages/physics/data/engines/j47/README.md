# J47 turbojet: measured data and provenance

Data of the General Electric J47 turbojet tested in the NACA Lewis altitude wind tunnel in 1949. It is the open engine of brief 007: the engine model is anchored on one run of these tests and compared with the others.

Everything here is transcribed from printed tables. No curve was digitized.

## Sources

All four are NACA research memorandums on the same engine and test campaign, public on NTRS. The PDF files are not in the repository; they are downloaded to `.cache/sources/` (gitignored).

| Report | Authors, date | NTRS | SHA-256 of the file as downloaded |
| --- | --- | --- | --- |
| RM E9G09, "Altitude-wind-tunnel Investigation of J47 Turbojet-engine Performance" | Conrad and Sobolewski, 1949 | 19930093773 | `72d85df762ba11063895195e0183e71ee3c9015bcc9382197848aef16ad16e01` |
| RM E9G28, "Altitude-wind-tunnel Investigation of Compressor Performance on J47 Turbojet Engine" | Prince and Jansen, 1949 | 19930086062 | `c611795043026f9f98ac1480d2a0564b82177b453bff9d50884d9eb109e843cd` |
| RM E9L02, "Altitude-wind-tunnel Investigation of Combustion-chamber Performance on J47 Turbojet Engine" | Campbell, 1950 | 19930086104 | `66c4ada62dcbeee1990a168332bbf249300161283266c401e0fb6a89090b5b4f` |
| RM E9K10, "Altitude-wind-tunnel Investigation of Turbine Performance in J47 Turbojet Engine" | Thorman and McAulay, 1950 | 19930086035 | `dd185ac9b2ad83c684374389ee44e6fa5e49d0373ae2c3c48c8cc69d18cfd372` |

Download: `https://ntrs.nasa.gov/api/citations/<NTRS number>/downloads/<NTRS number>.pdf`. Each file starts with a 436-byte wrapper before `%PDF`; strip it before reading (`tail -c +437`). Page numbers in this folder and in the code are pages of the stripped PDF, not printed page numbers.

## The engine and the tests

- **Engine variant.** A J47 with a 12-stage axial compressor, eight combustion chambers, a single-stage turbine and a fixed exhaust nozzle. Rating in the report text: 5000 lb of thrust at sea-level static, 7900 rpm and a turbine-outlet temperature of 1275 °F, with about 94 lb/s of air and a compressor pressure ratio of about 5.1 (RM E9G09, page 3).
- **Nozzle.** The standard nozzle, outlet area 280 sq in cold; hot over cold area 1.01 at 1570 °R (RM E9G09, pages 3 and 11). The reports also tested 302 and 342 sq in nozzles; those runs are not transcribed.
- **Fuel.** AN-F-32, lower heating value 18 550 Btu/lb (RM E9G09, page 5), hydrogen-carbon ratio 0.155 (RM E9L02, page 14).
- **Intake.** Air came through a duct from the tunnel make-up system, throttled to the inlet total pressure of each flight condition. Complete ram-pressure recovery is assumed in the flight Mach number (RM E9G09, pages 4 and 13). No intake loss applies to these data.
- **Inlet temperature.** Held near the NACA standard value of each condition, except that temperatures below 439 °R could not be reached (RM E9G09, page 5). At high altitude and low Mach number the tests ran warmer than standard.

## Files

### `rm-e9g09-table1.csv`

RM E9G09, table I, "Engine performance data", PDF pages 17 and 18: all 97 runs, in report units, as printed. Data class of every row: `measured`.

**What `measured` means in this folder.** Test data as the report tabulates them. Not every column is the reading of an instrument: several are reductions the report makes from readings with the equations of its appendix, and the "Kind" column below says which. Net thrust is one of them, and it is one of the three quantities the comparison scores: balance-scale jet thrust minus air flow times the equivalent free-stream velocity. `computed` is kept for what a report obtains with a model and not from its instruments alone: the turbine-inlet temperature, which nobody measured, and what depends on it or on a thermodynamic chart. No column of this table is of that kind; several values of `component-tables-run1.csv` are.

| Column | Printed title | Unit | Kind | Note |
| --- | --- | --- | --- | --- |
| `run` | Run | | | |
| `altitude_ft` | Altitude | ft | nominal | Nominal altitude of the condition |
| `ram_pressure_ratio` | Ram-pressure ratio, P1/p0 | | ratio of two readings | Engine-inlet total pressure over tunnel static pressure |
| `flight_mach` | Flight Mach number, M | | reduction, equation 1 | From the ram pressure ratio, gamma 1.4, complete ram recovery assumed; printed to 0.005 |
| `tunnel_static_pressure_psf` | Tunnel static pressure, p0 | lb/sq ft abs | reading | |
| `equivalent_ambient_temperature_R` | Equivalent ambient temperature, te | °R | reduction, equation 3 | The ambient temperature that gives the measured inlet total temperature with full ram recovery |
| `engine_speed_rpm` | Engine speed, N | rpm | reading | Actual speed, not corrected |
| `compressor_inlet_indicated_temperature_R` | Compressor-inlet indicated temperature, Ti,1 | °R | reading | Indicated, before the recovery correction of equation 2 |
| `jet_thrust_lbf` | Jet thrust, Fj | lb | reduction, equation 5 | **Balance-scale** jet thrust: scale reading plus installation drag and the forces at the inlet slip joint |
| `net_thrust_lbf` | Net thrust, Fn | lb | reduction, equation 6 | Jet thrust minus air flow times equivalent free-stream velocity |
| `air_flow_lb_s` | Engine-inlet air flow, Wa,1 | lb/sec | reduction, equation 4 | From pressures and temperature at the engine inlet |
| `fuel_flow_lb_h` | Fuel flow, Wf | lb/hr | reading | Rotameter |
| `sfc_lb_h_lbf` | Specific fuel consumption based on net thrust, Wf/Fn | lb/(hr)(lb thrust) | ratio | **Referred to net thrust.** Empty where the table prints dashes (8 runs) |
| `fuel_air_ratio` | Fuel-air ratio, f/a | | ratio | |
| `exhaust_gas_total_temperature_R` | Exhaust-gas total temperature, T7 | °R | reduction, equation 2 | Station 7, one inch upstream of the nozzle outlet; total from indicated temperature |
| `turbine_outlet_total_pressure_psf` | Turbine-outlet total pressure, P6 | lb/sq ft abs | reading | |
| `engine_total_pressure_ratio` | Engine total-pressure ratio, P7/P1 | | ratio | |
| `engine_total_temperature_ratio` | Engine total-temperature ratio, T7/T1 | | ratio | |
| `data_class` | | | | `measured` |

Not transcribed: the seven "Corrected ..." columns of the table. The report derives them from the columns above with its factors delta and theta, and prints them only for the runs at Mach 0.21.

**Corrected quantities.** The model takes each run as measured: inlet total pressure `p0 * P1/p0`, inlet total temperature `te * (P1/p0)^((gamma-1)/gamma)` with gamma 1.4 (equation 3 undone), and for the ram drag the report's own equivalent velocity. `j47-data.ts` does this conversion; nothing is "corrected to sea level" on the way.

### `component-tables-run1.csv`

The first run of table I of each component report: 5000 ft, standard nozzle, 7895 rpm. It is the same run as run 1 of RM E9G09 (same altitude, ram pressure ratio, Mach number, static pressure, speed, air flow and fuel flow). It is the anchor of the model.

| Report | Table I pages | What is taken |
| --- | --- | --- |
| RM E9G28 | 14 and 15 | Engine-inlet and compressor-outlet total pressure and temperature, pressure ratio, efficiency |
| RM E9L02 | 18 and 19 | Combustion-chamber pressures and temperatures, fuel flow, efficiency, measured pressure loss |
| RM E9K10 | 18 and 19 | Turbine-inlet and outlet total pressures, outlet temperature, bleeds, efficiency |

Data class by row: `measured`, except `computed` for what the reports themselves calculate (turbine-inlet temperature, from a work balance, because no thermocouple was installed there; the three efficiencies; the turbine temperature ratio and corrected quantities) and `report text` for the nozzle area.

**Definitions the reports use, and what the model does with them.**

- Compressor efficiency (RM E9G28, pages 8 and 9): adiabatic, from temperatures, with constant specific heat. The model does not use it. It takes the measured pressures and temperatures and computes its own efficiency with its own gas.
- Turbine-inlet temperature (RM E9K10, page 16; RM E9L02, page 13): turbine power equals compressor power, accessory power and bearing friction neglected, with the measured bleeds taken out of the turbine gas flow. The model makes the same balance without bleed.
- Combustion efficiency (RM E9L02, page 14): actual over theoretical enthalpy rise, from a temperature-enthalpy chart. Declared accuracy about ±0.04 (page 6). The model computes its own from the measured fuel flow.
- Turbine efficiency (RM E9K10, page 17): adiabatic. Declared maximum error ±3 percent at high pressure levels to ±8 percent at low ones (page 5).
- Jet-velocity coefficient (RM E9G09, pages 4 and 11): scale jet thrust over the thrust computed from the nozzle survey rake. Figure 3 shows it as a scatter against nozzle pressure ratio; it is not tabulated by run.

**A discrepancy between reports.** The compressor-outlet total temperature of this run is 902 °R in RM E9G28 and RM E9K10, and 900 °R in RM E9L02. Both are transcribed as printed. The model uses 902.

### `passes/`

The two independent readings behind each file.

- `rm-e9g09-table1.pass-a.csv` and `.pass-b.csv`: table I of RM E9G09, 97 runs by 18 columns.
- `component-tables-run1.pass-a.csv` and `.pass-b.csv`: the first row of the three component tables. Pass B keeps the printed column titles and has every column of the row; pass A has the columns the dataset keeps.
- `pass-b-doubtful-readings.txt`: the readings pass B marked as hard to read, with their alternatives.

## How the tables were read

1. Each table page was extracted at the native resolution of the scan (`tools/digitize/extract_scan.py`, about 300 dpi) and cut into enlarged tiles with the run-number column pasted beside each (`studies/002-engine-cycle/tools/table_tiles.py`).
2. **Two independent passes.** Pass A was read by the building session. Pass B was read by a separate reader that received only the tiles and never saw pass A. Neither used the OCR text layer of the PDF.
3. The passes were compared cell by cell (`studies/002-engine-cycle/tools/compare-passes.mjs`): 1746 cells of table I, 0 differences. The 47 values of the component rows agree too. A test in `packages/physics/test/propulsion/j47.test.ts` checks that the dataset is the reading of both passes.
4. **Internal consistency.** Four columns the report derived from others were recomputed (`studies/002-engine-cycle/tools/check-table-consistency.mjs`): flight Mach number from the ram pressure ratio, specific fuel consumption, fuel-air ratio and engine total-temperature ratio. All 97 runs agree with the printed values within rounding.

Two passes that agree are a control of gross errors, not a measure of reading resolution: both read the same clean typescript. Pass B marked 10 readings of table I as doubtful (a faint 8 that could be a 6, an overstruck digit). In every one its reading equals pass A's, and the recomputed columns agree with the readings where they bear on them.

## Uncertainty

The values are printed numbers, so transcription adds no uncertainty. What the reports declare about the measurements:

| Quantity | Declared | Where |
| --- | --- | --- |
| Air flow | Three methods "agreed within 3 percent" (inlet, venturi, nozzle); RM E9G28 says about 1 percent between inlet and nozzle | RM E9G09, page 14; RM E9G28, page 8 |
| Thrust | Nothing declared | |
| Fuel flow | Nothing declared | |
| Combustion efficiency | About ±0.04 | RM E9L02, page 6 |
| Turbine efficiency | Maximum error ±3 to ±8 percent | RM E9K10, page 5 |

The uncertainties the comparison uses, and why, are in `docs/cp/007.md` ("Decisiones tomadas al leer los informes, antes de calcular") and in `packages/physics/src/propulsion/j47-comparison.ts`. Those of thrust and fuel flow are estimates of lane E, because the reports declare none.
