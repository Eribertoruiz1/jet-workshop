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

## Second dataset: the body alone, NACA RM L51I04a

`data/bielat-l51i04a-body.csv` holds the drag of the same body tested without wings, read twice from one figure of a second report (brief 001, Amendment 3, point 2). It is a separate file and is never mixed with the wing-body data. `pnpm validate` compares the model's body term with it (report section 9).

### Source

R. P. Bielat, D. E. Harrison and D. A. Coppolino, NACA RM L51I04a, 1951: the 47 deg wing of the series at three thickness ratios and with a thickened root, Langley 8-foot high-speed tunnel, slotted test section, with body-alone data in its figure 16. The report is the reference 4 of NACA RM L52B08. Same tunnel, balance, models and corrections: the drag is referred to a base pressure equal to free-stream static pressure. Declared accuracy (p. 4): CL ±0.01, CD ±0.001, Cm ±0.004; angle of attack set within ±0.1 deg. Its figure 3 gives the same body (cylinder 2.25 in in diameter, ogive nose 6.61 in long with a 20 in radius, 25.15 in long) and the same wing area, 1.143 sq ft, on which the body's drag coefficient is given. The PDF is not stored here; `tools/digitize/README.md` gives the download and its SHA-256.

How to cite a value: Bielat, Harrison and Coppolino, NACA RM L51I04a (1951), figure 16(b), p. 37 (PDF page 38); digitized in jet-workshop, `fig16b-body-M0.700 p2`.

### What was read

Figure 16(b): drag coefficient against angle of attack, one polar per Mach number on a staggered CD scale (each Mach number has its own CD = 0, 0.004 apart on a common axis). The figure is printed sideways; the scan is turned a quarter turn to read it (lossless). Only the symbols at the nominal angles of attack of -2, 0 and +2 deg were read, at all 13 Mach numbers (0.50, 0.70, 0.85, 0.90, 0.925, 0.95, 0.975, 1.00, 1.02, 1.035, 1.085, 1.10, 1.13). Every Mach number has two symbols near zero angle of attack (a repeated test point, as near 6 deg), so 4 symbols per Mach number: 52 symbols, 104 rows (CD and alpha of each symbol), all `measured`.

### Schema

The columns are those of the wing-body file. `wing` is `body alone`; `series` is `fig16b-body-M<mach>`; the variables are `CD` (on the wing area) and `alpha` (deg, angle of attack of the body centre line, as plotted).

### Uncertainty

As for the wing-body file: digitization uncertainty = max(pass difference, one pixel), total = root-sum-square with the declared accuracy. One pixel is 0.000027 in CD and 0.013 deg in alpha. Largest pass differences: 0.00029 in CD and 0.13 deg in alpha, both at the doubled symbols near zero angle of attack at M 1.10. One point of 52 exceeds the declared accuracy, in alpha only (stop rule not triggered). Total uncertainty in CD: 0.0010 for every point.

### Known limitations

- **Doubled symbols.** At every Mach number there are two symbols near zero angle of attack; at 12 of the 13 (all but M 0.50) their outlines overlap. 17 symbols have a centre placed by eye in both passes (the same 17), because the centre dot is hidden or merged. The M 1.10 and 1.13 pairs are the least certain: the passes disagree on how the two outlines are offset, which the pass difference records.
- **Points not independent of pass B.** Pass A first read seven of these pairs as one symbol with a doubled outline. After pass B's report the second symbol was confirmed on the scan and added to pass A, and five first picks were moved; those 12 picks say in their note that they are not independent of pass B.
- **Not read:** the symbols above 2 deg, figure 16(a) (lift) and 16(c) (pitching moment), and the rest of the report (the thickness series of the 47 deg wing: Tickets, brief 002).

## Held-out datasets: NACA RM L51I04a and RM L51K16a

`data/heldout/l51i04a.csv` and `data/heldout/l51k16a.csv` are **held out** (brief 003, decision 0004): measurements that no method of the project has seen, against which lane C's sealed predictions are scored once. They stay off `main` until the owner confirms the predictions are merged. No model is run on them before that. The models, test conditions and reference values are in `docs/studies/heldout-geometry.md`.

### Sources

- R. P. Bielat, D. E. Harrison and D. A. Coppolino, NACA RM L51I04a (1951): the 47 deg wing at 4, 6 and 9 percent thickness and with a thickened root, Langley 8-foot high-speed tunnel, slotted test section, M 0.50 to about 1.12. Declared accuracy: CL ±0.01, CD ±0.001.
- R. B. Robinson and C. Driver, NACA RM L51K16a (1952): the six wing-body configurations at M 1.60, Langley 4- by 4-foot supersonic pressure tunnel. Declared accuracy: CL ±0.005, CD ±0.001 (the `u_declared` of its CL rows is 0.005).
- Downloads and SHA-256: `docs/studies/heldout-geometry.md`, Sources. The PDFs are not stored here.

### What was read

| File | Figure | Configuration | What | Class |
| --- | --- | --- | --- | --- |
| `l51i04a.csv` | 6(b) | `47deg-t04` | CD against CL, 5 Mach numbers (0.50, 0.843, 0.941, 0.990, 1.112) | measured |
| | 7(b) | `47deg-t06` | the same, M 0.50, 0.85, 0.95, 1.00, 1.10 | measured |
| | 8(b) | `47deg-t09` | the same, M 0.50, 0.843, 0.941, 0.990, 1.112 | measured |
| | 9(b) | `47deg-root12-t06` | the same, M 0.50, 0.85, 0.95, 1.00, 1.10 | measured |
| | 11 | the four wings | NACA's faired CD at zero lift against M, sampled at each wing's test Mach numbers as labelled on figures 6 to 9 | NACA faired |
| `l51k16a.csv` | 6(a) to 6(f), middle plot | the six configurations | CD against CL at M 1.60 | measured |

Every symbol of the polars read was read (repeated test points drawn as two or three symbols included); a symbol gives two rows, CL and CD. Figure 11 has two panels (upper: wings 1, 2, 3; lower: wings 2 and 4); wing 2 is taken from the upper panel, and its second drawing in the lower panel is read only as a check (`tools/digitize/heldout/l51i04a/fig11-lower/wing2-upper-vs-lower.md`).

**Replica, not blind.** Figure 6(b) of RM L51I04a is the same test as the open RM L52B08 figure 7(b) (gate 2, `docs/cp/003.md`): `47deg-t04` in the transonic range, here and in figure 11, is out of the blind scoring and serves as a check between the reports. Its M 1.60 point (RM L51K16a 6(c)) stays held out.

### Schema and configuration names

The columns are exactly those of the open file (CSV schema above). The reader accepts only a sweep in `wing`, so the configuration goes in `series` (owner's decision 4 at gate 1; a real `config` column is a Ticket for brief 005):

- `wing`: `10.8 deg`, `35 deg` or `47 deg` (quarter-chord sweep only; four configurations share `47 deg`).
- `series`, symbols: `<figure_id>-<config>-M<mach with 3 decimals>`, for example `fig07b-47deg-t06-M0.950` and `fig06d-drag-47deg-t06-M1.600`.
- `series`, figure 11 samples: `<figure_id>-<config>`, for example `fig11-upper-47deg-t09`, with the Mach number in `mach` and the sample id `M0.965` in `point_id`.
- `<config>` is one of `10.8deg-t04`, `35deg-t04`, `47deg-t04`, `47deg-t06`, `47deg-t09`, `47deg-root12-t06` (the IDs of the geometry sheet). `<figure_id>` is `fig06b` to `fig09b` and `fig11-upper` / `fig11-lower` for RM L51I04a, and `fig06a-drag` to `fig06f-drag` for RM L51K16a.
- `test/heldout.test.ts` checks that every row matches this pattern and one of the six configurations, and that the sweep in `wing` agrees with it.

Any consumer must key on the configuration in `series`, never on `wing` and `mach`. `assemble()` keeps `series` on polar points but **drops it on faired samples**: the four 47 deg curves of figure 11 are mixed in `Dataset.faired`, so read them from the rows (`parseRows`).

### Method and uncertainty

As for the open files: the tools of `tools/digitize/` (README), two independent passes (pass A in the main session, pass B by fresh-context subagents), digitization uncertainty = max(pass difference, one pixel), total = root-sum-square with the declared accuracy. RM L51K16a is a greyscale scan on fine-ruled graph paper with circles drawn without a centre dot: their centres come from a circle fitted to the outline (`snap: "ring"`). The comparison tables, overlays and the remaining doubts are in `tools/digitize/heldout/` and `docs/cp/003.md`.

### Known limitations

- **Overlapping symbols.** The RM L51I04a polars near and above M 1 are crowded: symbols of neighbouring Mach numbers overlap, and several test points are drawn twice or three times. Centres hidden under lines or other symbols were placed by eye from the outline (flagged). Points found by only one pass were checked on the scan: confirmed ones were added to the other pass with a note that they are not independent of it; two that could not be confirmed (a third stacked circle on figures 8(b) and 9(b)) are left out.
- **Figure 11.** Samples where two curves merge into one band are placed by eye (flagged); steep stretches are fitted along rows. Samples at M 1.085 and 1.088 fall at the end of the dashed stretch, where the report took no data (M 1.04 to 1.08). The two drawings of wing 2 differ by up to about 0.0006 in CD0 on the steep stretch: NACA's own drafting spread, below the declared accuracy.
- **Second scan.** The UNT copy of RM L51K16a is a 1-bit scan in which the graph-paper ruling cannot be told apart, so it cannot be calibrated on its own grid; its 8 ring centres on figure 6(c) agree with the NTRS reading within one pixel after an affine map between the scans (`tools/digitize/heldout/l51k16a/fig06c-drag/unt-vs-pass-a.md`). No UNT copy of RM L51I04a was found.
- **Not digitized** (Tickets in `docs/cp/003.md`): angle of attack (figures (a) of both reports), pitching moment, the other Mach numbers of RM L51I04a, figure 6(a) of RM L51I04a.

## License

License: not yet chosen. All rights reserved until a license is added. This covers the digitized values and this card, not the NACA report.
