# Dataset card: NACA RM L52B08, digitized

`data/bielat-l52b08.csv` holds values read from the scanned figures of one NACA report, digitized twice. Nothing in it was measured by this project. The model is scored against it by `pnpm validate`, which writes `report/validation-report.md`.

## Source

R. P. Bielat, NACA Research Memorandum RM L52B08, 1952. Three swept wings on one body, Langley 8-foot transonic tunnel. The PDF is not stored in this repository; `tools/digitize/README.md` gives the NTRS download and the SHA-256 of the file that was read.

How to cite a value: the report, the figure number and the page, then this file and the row's `series` and `point_id`. Example: Bielat, NACA RM L52B08 (1952), figure 6(b), p. 23 (PDF page 25); digitized in jet-workshop, `fig06b-35deg-M0.900 p2`.

## Test conditions (from the report)

- Three wings on one body. Quarter-chord sweep 10.8, 35 and 47 deg. Aspect ratio 3.5, taper ratio 0.2, 4 percent thick streamwise, no twist, incidence or dihedral.
- Airfoil: NACA 65A thickness distribution; mean line = 1/3 of the NACA 230 series mean line plus the NACA 6-series uniform-load mean line (a = 1.0) for cli = 0.1.
- Mach number 0.50 to about 1.12 (figure 6(b) labels reach 1.13). No data between M 1.04 and 1.08 (reflected shocks); figure 9 is dashed there.
- Angle of attack -2 to 12 deg, limited at high subsonic and low supersonic Mach numbers by the balance pitching-moment load.
- Reynolds number 2.0 to 2.5 million on the mean aerodynamic chord (figure 4 gives it against Mach number; not digitized).
- Corrections stated: stream misalignment; drag referred to a base pressure equal to free-stream static pressure. No blockage or wake-buoyancy corrections (slotted throat).
- Declared accuracy (report p. 5): CL ±0.01, CD ±0.001, Cm ±0.004; angle of attack set within ±0.1 deg.

## Geometry and reference values (report figure 3)

| Quantity | Value |
| --- | --- |
| Wing reference area (trapezoid carried to the centreline) | 1.143 ft² |
| Span | 24.00 in |
| Root chord (at the centreline) | 11.430 in |
| Tip chord | 2.286 in |
| Mean aerodynamic chord | 7.874 in, at 4.667 in from the centreline |
| Body | cylinder 2.25 in in diameter, 25.15 in long, ogive nose 6.61 in long (20 in radius) |
| Body diameter / span | 0.094 |

Body-alone data are not in this report (they are in its reference 4).

## What each figure plots

| Figure | PDF page (printed) | Plots | Class in the CSV |
| --- | --- | --- | --- |
| 5(a), 6(a), 7(a) | 21 (19), 24 (22), 27 (25) | CL against angle of attack, one polar per Mach number, staggered origins | `measured` |
| 5(b), 6(b), 7(b) | 22 (20), 25 (23), 28 (26) | CL against CD, one polar per Mach number, staggered CL origins | `measured` |
| 9 | 31 (29) | CD at zero lift against Mach number, one faired curve per wing, no symbols | `naca_faired_crossplot` |

Figures 5 to 7 are the 10.8, 35 and 47 deg wings. Each hollow symbol is one test point, with a centre dot drawn by NACA. Figure 9 is a crossplot NACA faired by hand through its own polars: a NACA curve, never measured points. The app labels it "NACA faired curve (1952)".

## Coverage and counts

Five Mach numbers per wing covering the range (brief 001, Amendment 1, point 5), plus M 0.90 for the 35 deg wing from step 0. Mach numbers are the labels printed on each polar.

| Figure | Wing | Mach numbers | Points | Rows |
| --- | --- | --- | ---: | ---: |
| 5(a) | 10.8 deg | 0.50, 0.85, 0.95, 1.00, 1.10 | 37 | 74 |
| 5(b) | 10.8 deg | 0.50, 0.85, 0.95, 1.00, 1.10 | 39 | 78 |
| 6(a) | 35 deg | 0.50, 0.85, 0.90, 0.95, 1.00, 1.10 | 48 | 96 |
| 6(b) | 35 deg | 0.50, 0.85, 0.90, 0.95, 1.00, 1.10 | 45 | 90 |
| 7(a) | 47 deg | 0.500, 0.843, 0.941, 0.990, 1.112 | 32 | 64 |
| 7(b) | 47 deg | 0.500, 0.843, 0.941, 0.990, 1.112 | 32 | 64 |
| 9 | all three | each wing's test Mach numbers where the curve is solid | 36 | 36 |

Total: 116 drag-polar symbols, 117 lift symbols, 36 figure 9 samples; 502 rows.

The (a) and (b) symbols are not linked row by row. The report gives no run numbers, and the counts differ because symbols hide each other differently on the two figures.

## CSV schema

One row per point and variable. A symbol of figure (b) gives two rows (CL and CD), a symbol of figure (a) two rows (CL and alpha), a figure 9 sample one row (CD0).

| Column | Meaning |
| --- | --- |
| `document` | `NACA RM L52B08` |
| `figure_id`, `figure` | `fig06b`, `6(b)` |
| `pdf_page`, `printed_page` | page of the PDF file and page number printed on the report |
| `wing` | `10.8 deg`, `35 deg` or `47 deg` (quarter-chord sweep) |
| `mach` | Mach number label of the polar; for figure 9, the Mach number where the curve was sampled |
| `series` | `<figure>-<wing>deg-M<mach>`, for example `fig06b-35deg-M0.900`; figure 9: `fig09-35deg` |
| `point_id` | point within the series, in pass A's numbering; `A:p7\|B:p3` when the two passes numbered it differently |
| `variable` | `CL`, `CD`, `alpha` (deg) or `CD0` |
| `value_pass_a`, `value_pass_b` | the two independent readings |
| `value_adopted` | mean of the two passes |
| `pass_difference` | absolute difference between the passes |
| `u_pixel_floor` | one scan pixel along that axis, in data units (the larger of the two passes' calibrations) |
| `u_digitization` | max(`pass_difference`, `u_pixel_floor`) |
| `u_declared` | the report's declared accuracy for that variable (CL 0.01, CD and CD0 0.001, alpha 0.1 deg) |
| `u_total` | root-sum-square of `u_digitization` and `u_declared` |
| `data_class` | `measured` or `naca_faired_crossplot` |
| `method` | how the value was located |
| `flags` | `centre picked by eye (no dot snap)`; `within one line width of grid line` (figure 9 samples) |
| `note` | the readers' notes, pass A first, then pass B, separated by ` / ` |

The CSV is written by `tools/digitize/consolidate.py` from the committed specs and results in `tools/digitize/figures/`; it is never edited by hand.

## Method

`tools/digitize/README.md` describes the tools. In short: the embedded scan of each page at native resolution (about 300 dpi); a mesh calibration that traces every printed grid line; symbol centres snapped to NACA's centre dots; figure 9 samples centred on the inked line. Two passes: pass A in the main session, pass B by a fresh-context reader that could not see pass A, recalibrating on its own. Overlays of both passes on the scans are in `docs/cp/img/001/`.

## Uncertainty

Digitization uncertainty = max(pass difference, one pixel per axis) (brief 001, Amendment 2, point 4). The pass difference is near zero by construction where a centre dot exists (both passes snap to the same dot on the same traced grid), so it works as a gross-error control; the one-pixel floor keeps the reading resolution in the budget. Largest pass differences, all below the declared accuracy (stop rule not triggered on any figure):

| Figure | CL | CD or CD0 | alpha |
| --- | ---: | ---: | ---: |
| 5(a) | 0.0022 | | 0.027 deg |
| 5(b) | 0.0004 | 0.00005 | |
| 6(a) | 0.0035 | | 0.045 deg |
| 6(b) | 0.0039 | 0.00034 | |
| 7(a) | 0.0054 | | 0.019 deg |
| 7(b) | 0.0001 | 0.00000 | |
| 9 | | 0.000005 | |

The declared accuracy of the balance dominates `u_total`: about ±0.001 in CD and ±0.010 in CL for every point.

## Known limitations

- **Repeated points.** NACA drew some test points twice (two symbols almost on top of each other, for example two triangles at CL 0.147 on figures 5(a) and 5(b), M 0.95, with CD 0.0165 and 0.0174). Both are kept as separate rows. Where a repeat leaves fewer than three distinct CL levels below |CL| = 0.3, the parabola cross-check of the report is not evaluated.
- **Points not independent of pass B.** Pass A missed 12 overlapped symbols that pass B found (5(a): 1; 5(b): 2; 6(a): 5; 6(b): 4). Each was confirmed on the scan and added to pass A; its note says the pick is not independent of pass B.
- **Centres by eye.** 20 points (40 rows) have a centre placed by eye from the outline in at least one pass, because the centre dot is hidden by a line or another symbol; they are flagged.
- **Excluded point.** Pass B read one symbol on the 35 deg M 1.10 polar of figure 6(b) (its p3) that has the shape of the M 1.13 symbols; it is left out. Unmatched points never enter the CSV.
- **No (a) counterpart.** A second symbol of the M 1.00 polar on figure 5(b) has no counterpart on figure 5(a); it is kept.
- **Figure 9 gaps.** The dashed stretch near M 1.04 to 1.08 is not sampled; the 35 deg sample at M 1.085 falls in a gap and is not taken by either pass. Three figure 9 samples sit on a grid line and are flagged.
- **Not digitized.** Figure 4 (Reynolds number), figure 8 (faired lift-curve slope), pitching moment, and the polars at Mach numbers beyond the five per wing. Listed under Tickets in `docs/cp/001.md`.
- **Scan.** One scan (NTRS). An independent scan (UNT) agrees on figure 6(b) within one pixel on the 4 symbols whose dot survives it (`tools/digitize/figures/fig06b/unt-vs-pass-a.md`).

## License

License: not yet chosen. All rights reserved until a license is added. This covers the digitized values and this card, not the NACA report.
