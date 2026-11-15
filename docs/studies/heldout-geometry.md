# Held-out data: geometry and test conditions

Brief 003, rule 1 (decision `docs/decisions/0004`). This sheet describes the models and the test conditions of the two reserved NACA reports. It holds **no results**: no drag, lift or moment value, no curve shape and no comparison between configurations. Everything here is taken from the reports' text, tables and drawings, except where a value is marked `computed` (worked out here from the stated dimensions) or `read by eye`.

Lane C works from this sheet and never opens the two reports.

## Sources

| Report | Authors, date | Tunnel | NTRS | File read (SHA-256) |
| --- | --- | --- | --- | --- |
| NACA RM L51I04a | R. P. Bielat, D. E. Harrison, D. A. Coppolino; 31 October 1951 | Langley 8-foot high-speed tunnel, slotted test section | 19930086979 | as downloaded, no wrapper: `70c6278baa880d8ab15b4fca4944e0bab8021ab0ac4377f4c970ea8c3ab25e9f` |
| NACA RM L51K16a | R. B. Robinson, C. Driver; 10 January 1952 | Langley 4- by 4-foot supersonic pressure tunnel | 19930087888 | NTRS wrapper of 436 bytes stripped: `59bbdcb18699f38fa763f61d51e5ab1ab04ff7ba686ca7964e83c8b2041bb2c2` (as downloaded: `292d22d43283b2a2d0086e726b20ca43d5d23958b3973004254ae856be66a932`) |

Page references are given as PDF page (printed page). The PDFs are not stored in this repository; `tools/digitize/README.md` gives the downloads.

## Configurations

Six wing-body configurations. The IDs in the first column are the ones the held-out CSV files will use in their `series` names (for example `fig07b-47deg-t06-M0.900`), so predictions can be keyed to them.

| ID | Quarter-chord sweep | Streamwise thickness ratio | RM L51I04a (M 0.50 to about 1.12) | RM L51K16a (M 1.60) |
| --- | --- | --- | --- | --- |
| `10.8deg-t04` | 10.8 deg | 0.04, constant along the span | not tested | figure 6(a) |
| `35deg-t04` | 35 deg | 0.04, constant | not tested | figure 6(b) |
| `47deg-t04` | 47 deg | 0.04, constant | wing 1, figure 6 | figure 6(c) |
| `47deg-t06` | 47 deg | 0.06, constant | wing 2, figure 7 | figure 6(d) |
| `47deg-t09` | 47 deg | 0.09, constant | wing 3, figure 8 | figure 6(e) |
| `47deg-root12-t06` | 47 deg | 0.12 at the plane of symmetry, tapering linearly to 0.06 at 40 percent of the semispan, 0.06 outboard | wing 4, figure 9 | figure 6(f) |

- Thickened root: RM L51K16a (PDF pp. 2 (1) and 3 (2)) says the thickness "tapered linearly from 12 percent at the root to 6 percent at the 40-percent semispan station and were constant at 6 percent further outboard"; RM L51I04a (PDF p. 8 (7), and its Table I sketch) gives 6 percent at the 0.40-semispan station to 12 percent at the plane of symmetry, with the outboard coordinates the same as wing 2.
- The 10.8 and 35 deg wings at 4 percent are the planforms of the open dataset (RM L52B08, transonic). At M 1.60 they are held out like the rest.
- Not part of this family, so not digitized: in RM L51K16a, the 6 percent 47 deg wing with a horizontal canard (figures 7 and 8) and the body alone (figures 4 and 5).

## Planform (all six configurations)

From RM L51I04a figure 3, PDF p. 16 (15), and RM L51K16a figure 1, PDF pp. 11 to 12 (10 to 11); RM L51K16a prints some values rounded (in brackets).

| Quantity | Value |
| --- | --- |
| Aspect ratio | 3.5 |
| Taper ratio | 0.2 |
| Span | 24.00 in (semispan 12.00 in) |
| Wing area, the reference area of every wing-body coefficient | 1.143 ft² (trapezoid carried to the centre line) |
| Root chord, at the centre line | 11.430 in (11.43) |
| Tip chord | 2.286 in (2.29) |
| Mean aerodynamic chord, the reference length of the moments | 7.874 in, at 4.667 in (4.67) from the centre line |
| Twist, incidence, dihedral | 0 deg |
| Position | mid wing; sections streamwise (parallel to the plane of symmetry) |

Only the 47 deg wing is dimensioned in a drawing. For the 10.8 and 35 deg wings RM L51K16a gives the planform sketch, aspect ratio, taper ratio, span and area (figure 1(b)), so their root chord, tip chord and mean aerodynamic chord are the same as above.

## Body and wing position

| Quantity | RM L51I04a, figure 3 | RM L51K16a, figure 1(a) |
| --- | --- | --- |
| Shape | cylinder with an ogive nose | ogive-cylinder |
| Diameter | 2.25 in | 2.25 in; maximum cross-sectional area 0.0276 ft² (symbol list, PDF p. 3 (2)) |
| Nose | ogive, 6.61 in long, 20 in radius | ogive, 6.61 in long, 20 in radius |
| Body length | 25.15 in | 25.12 in |
| Station of the wing apex (leading edge carried to the centre line), 47 deg wing | 8.748 in from the nose | 8.75 in |
| Station where the leading edge meets the body, 47 deg wing | 10.15 in | 10.15 in |
| Moment reference | pitching moment about 0.25 of the mean aerodynamic chord (symbol list) | balance moment centre at 0.25 of the mean aerodynamic chord |
| Sting at the model base | 2.25 in in diameter | 2 1/4 in for 11 13/64 in behind the base, then a 9 in flare to 4 1/2 in (figure 2) |

- The two drawings differ in body length by 0.03 in (25.15 against 25.12); neither report comments on it.
- RM L51K16a (PDF p. 5 (4)): "The wings were positioned so that the quarter-chord point of the mean aerodynamic chord was always at the same body station."
- `computed` from the dimensions above (leading-edge sweep from the quarter-chord sweep, aspect ratio and taper ratio): for the 47 deg wing the quarter-chord point of the mean aerodynamic chord is at 16.61 in from the nose (8.748 + 5.894 + 1.969). With the quarter-chord point at 16.61 in, the apex of the 35 deg wing is at 10.49 in and that of the 10.8 deg wing at 12.86 in (leading-edge sweeps 41.69 and 20.87 deg). These two stations are not printed in either report.
- RM L51K16a figure 1(a), side view: the balance moment centre is dimensioned 6.47 in behind the line where the drawn wing section starts. If that line is the leading edge at the body side (10.15 in), the centre is at 16.62 in, which agrees with the computed 16.61 in. The drawing is not to scale, so this is a reading of the labels only.
- RM L51K16a figure 2: model centre line 26 in from the tunnel wall in the side view; the top view marks an angle of 5 deg at the sting.

## Airfoil sections

Thickness distribution NACA 65A series; mean line 1/3 of the NACA 230 series mean line plus the NACA 6-series uniform-load mean line (a = 1.0) for a design section lift coefficient of 0.1 (both reports). The sections are parallel to the plane of symmetry.

Table I of both reports lists the coordinates, in percent of the local chord: RM L51I04a PDF p. 13 (12), RM L51K16a PDF p. 9 (8). Transcribed below from RM L51K16a and checked value by value against the scans of both reports, which print the same values. Upper and lower ordinates are both printed as positive numbers: the upper surface above the chord line, the lower surface below it.

| x/c | t/c 0.04 upper | t/c 0.04 lower | t/c 0.06 upper | t/c 0.06 lower | t/c 0.09 upper | t/c 0.09 lower | root station (0.12) upper | root station (0.12) lower |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 0 | 0 | 0.061 | 0 | 0.156 | 0 | 0.301 | 0 |
| 0.5 | 0.411 | 0.245 | 0.577 | 0.376 | 0.846 | 0.574 | 1.120 | 0.754 |
| 0.75 | 0.499 | 0.271 | 0.717 | 0.446 | 1.021 | 0.680 | 1.335 | 0.904 |
| 1.25 | 0.665 | 0.289 | 0.919 | 0.534 | 1.283 | 0.846 | 1.658 | 1.141 |
| 2.5 | 0.962 | 0.324 | 1.304 | 0.621 | 1.789 | 1.069 | 2.261 | 1.507 |
| 5.0 | 1.435 | 0.367 | 1.872 | 0.761 | 2.537 | 1.400 | 3.208 | 2.024 |
| 7.5 | 1.776 | 0.429 | 2.318 | 0.857 | 3.111 | 1.662 | 3.919 | 2.433 |
| 10 | 2.039 | 0.472 | 2.668 | 0.980 | 3.577 | 1.896 | 4.500 | 2.799 |
| 15 | 2.423 | 0.577 | 3.150 | 1.269 | 4.244 | 2.352 | 5.362 | 3.445 |
| 20 | 2.642 | 0.682 | 3.482 | 1.496 | 4.705 | 2.751 | 5.965 | 3.984 |
| 25 | 2.800 | 0.787 | 3.701 | 1.697 | 5.045 | 3.052 | 6.395 | 4.414 |
| 30 | 2.887 | 0.892 | 3.858 | 1.846 | 5.288 | 3.276 | 6.718 | 4.716 |
| 35 | 2.983 | 0.997 | 3.946 | 1.960 | 5.415 | 3.441 | 6.912 | 4.910 |
| 40 | 2.992 | 1.006 | 3.981 | 2.021 | 5.473 | 3.529 | 6.977 | 5.017 |
| 45 | 2.940 | 1.041 | 3.937 | 2.030 | 5.424 | 3.519 | 6.912 | 4.996 |
| 50 | 2.852 | 1.006 | 3.823 | 1.977 | 5.249 | 3.422 | 6.675 | 4.823 |
| 55 | 2.712 | 0.945 | 3.613 | 1.872 | 4.967 | 3.208 | 6.288 | 4.522 |
| 60 | 2.511 | 0.857 | 3.342 | 1.697 | 4.579 | 2.916 | 5.771 | 4.113 |
| 65 | 2.265 | 0.761 | 3.018 | 1.487 | 4.102 | 2.566 | 5.168 | 3.618 |
| 70 | 1.986 | 0.674 | 2.651 | 1.277 | 3.568 | 2.197 | 4.457 | 3.101 |
| 75 | 1.680 | 0.577 | 2.231 | 1.059 | 2.975 | 1.837 | 3.725 | 2.584 |
| 80 | 1.356 | 0.481 | 1.785 | 0.849 | 2.382 | 1.468 | 2.929 | 2.067 |
| 85 | 1.041 | 0.385 | 1.339 | 0.639 | 1.789 | 1.098 | 2.239 | 1.550 |
| 90 | 0.726 | 0.289 | 0.892 | 0.420 | 1.186 | 0.739 | 1.486 | 1.034 |
| 95 | 0.402 | 0.201 | 0.446 | 0.210 | 0.593 | 0.369 | 0.732 | 0.517 |
| 100 | 0.105 | 0.105 | 0 | 0 | 0 | 0 | 0 | 0 |
| Leading-edge radius | 0.0016c | | 0.0024c | | 0.0056c | | 0.0099c | |

- The 4 percent section alone has a finite trailing edge (0.105 on each surface at x/c = 100) and a "tangent point" row: 80.00 (upper) and 60.00 (lower).
- Printed as is. Two values of the 4 percent section look irregular against their neighbours: the lower surface at x/c = 45 (1.041, between 1.006 and 1.006) and the upper surface at x/c = 95 (0.402). Both prints carry them; they are not corrected here.
- The thickened-root wing uses the 0.06 coordinates outboard of 40 percent of the semispan and the root-station coordinates at the plane of symmetry (RM L51I04a Table I sketch: "Coordinates same as for wing 2").

## Test conditions

| | RM L51I04a | RM L51K16a |
| --- | --- | --- |
| Tunnel | Langley 8-foot high-speed tunnel, slotted test section (longitudinal slots) | Langley 4- by 4-foot supersonic pressure tunnel; at M 1.60 the test section is 4.5 ft wide and 4.4 ft high, with a uniform-flow region 7 ft long |
| Mach number | 0.50 to about 1.12 | 1.60 only |
| Test Mach numbers, as labelled on the figures | `47deg-t04` (fig. 6) and `47deg-t09` (fig. 8): 0.50, 0.696, 0.843, 0.892, 0.916, 0.941, 0.965, 0.990, 1.010, 1.024, 1.088, 1.112, and for `47deg-t09` also 1.122. `47deg-t06` (fig. 7): 0.50, 0.70, 0.85, 0.90, 0.925, 0.95, 0.975, 1.00, 1.02, 1.035, 1.088, 1.10, 1.12. `47deg-root12-t06` (fig. 9): 0.50, 0.70, 0.85, 0.90, 0.925, 0.95, 0.975, 1.00, 1.02, 1.035, 1.085, 1.10, 1.121 | 1.60 for all six configurations |
| Gap | no data from M 1.04 to 1.08: reflected shock waves; the report estimates the nose shock reflection clears the model above M 1.08 | none |
| Flow uniformity | Mach number distributions along the test section in figure 1 | Mach number ±0.01; flow angle ±0.1 deg in the horizontal and in the vertical plane |
| Reynolds number on the mean aerodynamic chord | 2.0 million at M 0.50 to 2.5 million at M 1.12 (text, PDF p. 6 (5)); figure 5 gives it against Mach number | 2.7 million |
| Stagnation conditions | not stated | pressure 1 atm (the text says about 15 lb/sq in), temperature 110 °F, dew point below 25 °F |
| Angle of attack | -2 to 12 deg from M 0.50 to about 0.97; -2 to 4 deg from M 1.00 to about 1.12 (pitching-moment design load of the balance) | -2 to 13 deg |
| Angle setting | within ±0.1 deg (calibrated accelerometer in the sting) | estimated accuracy ±0.1 deg |
| Declared accuracy of the force data | CL ±0.01, CD ±0.001, Cm ±0.004 (PDF p. 5 (4)), "based on the design of the balance and the reproducibility of the data" | CL ±0.005, CD ±0.001, Cm ±0.001 (PDF p. 6 (5)), "estimated errors in the force data" |
| Balance and support | six-component internal strain-gage balance; sting pivoted about 66 in behind the 0.25-chord point of the mean aerodynamic chord, with a 15 deg coupling for angles from 6 to 12 deg | six-component internal strain-gage balance; sting support (figure 2) |
| Axes | changed from body axes to wind axes | lift and drag coefficients defined as Lift/qS and Drag/qS |

Reynolds number in RM L51I04a figure 5, `read by eye` once from the scan (about ±0.02 million; not digitized in two passes): 1.97 million at M 0.50, 2.18 at 0.60, 2.35 at 0.70, 2.50 at 0.80, 2.57 at 0.90, 2.59 at 1.00, 2.54 at 1.10; the curve ends near M 1.15 at about 2.48.

### Corrections

| | RM L51I04a | RM L51K16a |
| --- | --- | --- |
| Blockage, wake blockage, wake buoyancy | none; the slots make them unnecessary | not mentioned |
| Base pressure | drag corrected to a body base pressure equal to free-stream static pressure | base pressure measured; drag corrected to a base pressure equal to free-stream static pressure |
| Angle of attack | corrected for the elasticity of the sting support (static calibrations, figure 4) | corrected for balance deflection under lift and pitching moment (bench calibration, checked optically on the 9 percent 47 deg wing) |
| Wing twist from bending | not corrected; steel wings, bending judged not to change the data materially | not mentioned |
| Yaw | not mentioned | model yawed about -0.2 deg by misalignment; not corrected |
| Flow variations in the test section | not mentioned | not corrected |

### Boundary layer

- Neither report mentions a transition strip, grit or any other device to fix transition.
- RM L51K16a, PDF p. 6 (5): the body alone was run from a body-length Reynolds number of 2.5 to 9 million (stagnation pressure about 4 to 15 lb/sq in, figure 4); the authors concluded that the body boundary layer was primarily turbulent above 7 million, and ran every body and wing-body test at a stagnation pressure of about 15 lb/sq in for that reason. The body-alone values are not reproduced here.
- RM L51I04a says nothing about the boundary layer.

## Models

- RM L51I04a, PDF pp. 4 to 5 (3 to 4): "The models employed for the tests were supplied by a U. S. Air Force contractor. The models represented midwing configurations and were constructed of steel." "The only differences in the models were the wing thickness ratios and the spanwise thickness distribution. The hollow steel bodies were built integrally with each of the wings and represented cylindrical bodies having ogive nose sections."
- RM L51K16a, PDF p. 5 (4): "The models were designed to accommodate solid steel wings with integral cylindrical sections simulating corresponding sections of the body. This design permitted interchange of wings with minimum delay." "The models, balance, and indicating system were furnished by a U. S. Air Force contractor."
- **Same physical models?** Neither report says so. RM L51K16a cites RM L51I04a as part of the same research programme and wing series (its reference 1). RM L52B08, the open report, cites RM L51I04a for the 47 deg thickness series and the body alone (its reference 4) and says nothing about the models either. The two descriptions of the construction differ in wording (bodies built integrally with each wing; interchangeable wings with integral body sections), and the body lengths differ by 0.03 in.
- Test Mach numbers of `47deg-t04` in RM L51I04a (figure 6): the twelve labels are the same as those of the 47 deg wing of the open RM L52B08 (its figure 7: 0.50, 0.696, 0.843, 0.892, 0.916, 0.941, 0.965, 0.990, 1.010, 1.024, 1.088, 1.112). Both reports come from the same tunnel, with the same planform, section, body and balance. Whether figure 6 of RM L51I04a is the same test as figure 7 of RM L52B08 is a question about the data, so lane B answers it in its checkpoint, on the held-out branch.

## What the reports plot (no values)

| Report | Figures | Plots | Will be digitized as |
| --- | --- | --- | --- |
| RM L51I04a | 6, 7, 8, 9 (one per wing): (a) angle of attack against CL; (b) CD against CL; (c) Cm against CL | one polar per test Mach number, on staggered scales (each Mach number has its own origin) | (a) and (b): measured symbols, in five Mach numbers per wing first (brief 003) |
| RM L51I04a | 11 | CD at zero lift against Mach number, wings 1 to 4, faired by NACA | `NACA faired` crossplot, if reached (brief 003, scope 5) |
| RM L51I04a | 10, 12 to 15 | lift-curve slope, drag due to lift, maximum lift-drag ratio, its lift coefficient, and stability parameter against Mach number | not digitized (other quantities) |
| RM L51I04a | 16 | body alone; 16(b) is already open data (`packages/validation/data/bielat-l51i04a-body.csv`) | not changed |
| RM L51K16a | 6(a) to 6(f) (one per configuration) | Cm, CD and angle of attack against CL, one polar at M 1.60, common CL axis | CD and angle of attack: measured symbols |
| RM L51K16a | 9 to 11, Table II | NACA's own reductions, not digitized | |

## Held-out data files

`packages/validation/data/heldout/l51i04a.csv` and `l51k16a.csv` will follow the schema of `packages/validation/data/bielat-l52b08.csv` exactly (`packages/validation/README.md`). They stay off `main` until the owner confirms that lane C's predictions are merged (decision 0004).
