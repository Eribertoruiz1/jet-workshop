# Digitizer for NACA RM L52B08

Reproducible, auditable digitization of the scanned figures of R. P. Bielat, NACA RM L52B08 (1952). Python is allowed only in this folder.

Every figure is digitized twice, by two independent readers (pass A and pass B). The digitization uncertainty of each point is the larger of the pass difference and one scan pixel (see Uncertainty below).

## Setup

```bash
uv venv tools/digitize/.venv
uv pip install --python tools/digitize/.venv/Scripts/python.exe -r tools/digitize/requirements.txt
```

(On macOS or Linux the interpreter is `tools/digitize/.venv/bin/python`.) Run every script with `python -I`, so nothing from the working directory is imported.

## Source file

Download the report to `.cache/` (gitignored; the repository never stores the PDF):

```bash
curl -L -o .cache/NACA-RM-L52B08.pdf https://ntrs.nasa.gov/api/citations/19930087036/downloads/19930087036.pdf
```

The NTRS file starts with a 436-byte wrapper before `%PDF-1.6`. Strip it:

```bash
tail -c +437 .cache/NACA-RM-L52B08.pdf > .cache/bielat-L52B08.pdf
```

SHA-256 as downloaded: `e7ea320bad9c2ce07cb7cb61ca23f8a9ea4c15e6048bd61d905a8b5e6df73f25`. After stripping: `7c213cf56fb064b8547fac754adaa42b7dc4cd06826bd08547da589a4a245a53`.

### Second report: NACA RM L51I04a (body alone)

Bielat, Harrison and Coppolino, NACA RM L51I04a (1951), tested the same body without wings (brief 001, Amendment 3, point 2). Only figure 16(b), the body-alone drag, is digitized; its specs and results are in `figures-l51i04a/fig16b/`, apart from the wing-body figures, and its rows go to their own dataset, `packages/validation/data/bielat-l51i04a-body.csv`.

```bash
curl -L -o .cache/l51i04a/NACA-RM-L51I04a.ntrs.pdf https://ntrs.nasa.gov/api/citations/19930086979/downloads/19930086979.pdf
```

This NTRS file has no wrapper (it starts with `%PDF`) and is read as downloaded. SHA-256: `70c6278baa880d8ab15b4fca4944e0bab8021ab0ac4377f4c970ea8c3ab25e9f`.

Figure 16 is printed sideways on an upright page (the page has no /Rotate). `extract_scan.py --turn cw` turns the extracted image a quarter turn clockwise, which only moves pixels, so the figure reads upright and the grid lines run along the pixel axes as the mesh calibration expects:

```bash
python -I tools/digitize/extract_scan.py .cache/l51i04a/NACA-RM-L51I04a.ntrs.pdf 38 .cache/l51i04a/scans/p38-cw.png --turn cw
python -I tools/digitize/consolidate.py tools/digitize/figures-l51i04a packages/validation/data/bielat-l51i04a-body.csv
```

## Workflow

1. **Extract the scan** of a page at native resolution (about 300 dpi). Pixel coordinates everywhere refer to this image.

   ```bash
   python -I tools/digitize/extract_scan.py .cache/bielat-L52B08.pdf 31 .cache/scans/p31.png
   ```

2. **Look and pick.** `crop.py` cuts a region, enlarges it and draws a ruler labelled in native pixels. A reader uses it to find grid intersections, curve positions and symbol centres. `--mark x,y` draws a cross to check a pick.

   ```bash
   python -I tools/digitize/crop.py .cache/scans/p31.png 700 1100 1000 1260 .cache/look/a.png --zoom 4 --tick 5 --label 25
   ```

3. **Find candidate symbols** (figures with data symbols). `candidates.py` lists every small isolated ink blob with ink around it in most directions, which is what a NACA centre dot inside a hollow symbol looks like, and numbers them. It also finds decimal points and specks, and misses dots that touch a line: the reader keeps only real symbols and adds the missed ones by hand. `crop.py --candidates <candidates.json>` draws the numbers on any crop.

   ```bash
   python -I tools/digitize/candidates.py .cache/scans/p25.png tools/digitize/figures/fig06b/pass-a.json tools/digitize/figures/fig06b/candidates.json .cache/tiles/fig06b
   ```

   The candidates file is deterministic for a scan and committed, so both passes see the same numbers; they differ in which numbers they assign to which series.

4. **Write a spec** (one JSON file per figure and pass, format below) and run it:

   ```bash
   python -I tools/digitize/digitize.py tools/digitize/figures/fig09/pass-a.json .cache/scans/p31.png tools/digitize/figures/fig09/pass-a.result.json
   ```

5. **Compare the passes** and write the CSV rows:

   ```bash
   python -I tools/digitize/compare.py <pass-a.result.json> <pass-b.result.json> <out.csv> --md <out.md>
   ```

6. **Overlay** both passes on the scan, with the same axis mapping (pass A's calibration):

   ```bash
   python -I tools/digitize/overlay.py .cache/scans/p31.png <pass-a.result.json> <pass-b.result.json> <out.png>
   ```

## What the script does, and does not do

`digitize.py` never invents a value. It only refines and converts what the reader picked:

- **Grid intersections** are refined to the centre of both printed lines (ink profile across each line, with the crossing itself left out).
- **Mesh calibration.** When the spec describes the grid, every grid line is fitted along its whole length in two passes: a robust cubic through the printed line nearest the affine prediction at each step (a curve or symbol a few pixels away is rejected, not followed), then a smooth local correction for paper warping (running median of the residuals over about 250 px). Where a grid line is not printed (erased under a curve or a label), it is bridged. A pixel's x value comes from the two vertical lines around it on its own row; its y value from the two horizontal lines around it in its own column, by linear interpolation inside the cell. The picked intersections only seed the line search through an affine fit; the affine residuals and the mesh residuals at the intersections are both reported, and a large mesh residual means a bad pick. A grid line that cannot be used (for example the top of a label box with lettering against it) is listed under `skip` and the mesh interpolates across it.
- **Curve samples** (for faired curves without symbols): the reader gives the x value and a hint pixel near the intended line. The script finds the pixel column of that x value and the centre of the inked line nearest the hint, by a straight-line fit over clean columns within ±8 px. Columns on a vertical grid line are skipped. `side: "right"` or `"left"` uses one side only, for a curve that starts or ends there. The reader decides which line is which; the script only centres on it.
- **Steep stretches of a curve**: `"fit": "rows"` on a sample locates the line along rows instead of columns (within 12 rows of the hint), skips rows on a printed horizontal line and runs that touch a printed vertical line, fits a straight line x(y) and returns the row where it meets the sample's column. On a nearly vertical stretch a column cuts the line lengthwise, and where it crosses a horizontal grid line the column's run of ink takes in the grid line too; the row fit bridges the grid line. Where the sample's column is itself a vertical grid line, the column fit (which bridges that line from both sides) is the better choice.
- **Curves merged into one band**: `"snap": "none"` on a curve sample takes the hint's row as the line centre, placed by eye (its column still comes from the sample's x value). The spec says how in `note`; the CSV flags it ("line centre placed by eye").
- **Check-only series**: `"check_only": true` on a series (for example a curve drawn twice, read again only to compare the two drawings) keeps it in `comparison.md` and `comparison.csv`, but `consolidate.py` leaves its rows out of the dataset.
- **Symbols**: the reader names a candidate (`"candidate": 17`) or picks the symbol centre. With `snap: "dot"` (the default for candidates) the script moves the pick to the centre dot NACA drew inside each symbol (an isolated ink blob within `dot_radius`, default 5 px; outlines and lines through the symbol are rejected); `dot_level` changes the ink threshold for a faint dot or one a line touches. With `snap: "candidate"` the candidate's own centroid is used as is (for two dots a few pixels apart, which the dot snap would merge). With `snap: "none"` the pick is used as is, and the spec says why in `note` (for example a dot hidden under a line: the centre is then the outline centroid).
- **Circles without a centre dot** (NACA RM L51K16a: plain circles on fine-ruled graph paper): `snap: "ring"`. The script takes the pixels darker than `ring_level` (default 100; the printed graph-paper lines are lighter and mostly drop out) within `ring_window` px of the pick (default 26), searches centres within 6 px of the pick and radii from 8 to 18 px for the ring that holds the most dark pixels, then fits a circle by least squares, keeping only pixels within 2.5 px of the ring and refitting until the kept set stops changing (curve stubs and grid lines crossing the window drop out). The result file records the radius, the number of ring pixels, their rms distance from the ring and how many of 16 sectors around the centre they cover; the fit is refused below 12 of 16 sectors or above 1.5 px rms. Any pick inside the circle gives the same centre (tested: 25 picks spread over ±6 px around each of the 8 circles of figure 6(c), largest change 0.02 px).

## Spec format

```json
{
  "source": {"document": "NACA RM L52B08", "author": "R. P. Bielat", "year": 1952, "url": "...", "pdf_sha256_stripped": "..."},
  "figure": {"id": "fig09", "number": "9", "title": "...", "pdf_page": 31, "printed_page": 29,
             "x_axis": "...", "y_axis": "...", "content_note": "..."},
  "scan": {"pdf_page": 31, "size_px": [3062, 2342], "extraction": "tools/digitize/extract_scan.py ..."},
  "pass": "A",
  "digitizer": "who read it",
  "calibration": {
    "grid": {"x_lines": {"start": 0.40, "step": 0.05, "count": 17},
             "y_lines": {"start": 0.000, "step": 0.005, "count": 7}},
    "points": [{"px": [x, y], "x": 0.45, "y": 0.005}, "... at least 6, spread over the plot, away from curves, symbols and lettering"]
  },
  "series": [
    {"id": "fig09-35deg", "wing": "35", "kind": "curve_samples", "x_variable": "M", "y_variable": "CD0",
     "samples": [{"id": "M0.500", "x": 0.500, "hint_px": [x, y], "side": "both", "note": "..."}]},
    {"id": "fig06b-35deg-M0.90", "wing": "35", "mach": 0.90, "kind": "symbols", "symbol": "...",
     "x_offset": 0.0, "x_variable": "CL", "y_variable": "CD",
     "points": [{"id": "p1", "px": [x, y], "snap": "dot", "note": "..."}]}
  ]
}
```

- `grid` lists the values of the printed grid lines, from the lowest value upward, including the frame lines when they are on the grid. `"skip": [-3.0]` leaves out lines that are not usable.
- Staggered scales: some figures shift each curve's x origin along a common axis. Define the grid on the common axis, and give each series an `x_offset`: the common-axis value of that series' zero. The reported value is common-axis value minus offset.
- Result files keep the picked pixel, the refined pixel, the value by the mesh and by the affine fit, and the calibration residuals.

## Uncertainty

- **Pass difference**: absolute difference between pass A and pass B for each point and variable.
- **Why it can be near zero.** Both passes run the same script. A symbol picked within a few pixels of its centre dot snaps to the same dot; the mesh comes from the same printed grid lines, traced automatically; a curve sample centres on the same inked line. Two careful readers therefore land on almost the same pixel by construction. The pass difference stays as a control of gross errors: a wrong symbol, a wrong line where curves merge, a wrong origin on a staggered scale, a misread grid. It is not, on its own, a measure of reading resolution.
- **Pixel floor**: one scan pixel along each axis, in data units (from the calibration of each pass; the larger of the two). On figure 9 that is about 0.00035 in M and 0.000035 in CD0; on figure 6(b) about 0.0016 in CL and 0.00016 in CD.
- **Digitization uncertainty** = max(pass difference, pixel floor) (brief 001, Amendment 2, point 4).
- **Declared accuracy** of the balance data (report p. 5): CL ±0.01, CD ±0.001, Cm ±0.004. A report with other values states them in the `source` block of its specs as `"declared_accuracy"`, and `compare.py` uses them (NACA RM L51K16a: CL ±0.005, CD ±0.001, Cm ±0.001, angle of attack ±0.1 deg).
- **Total uncertainty**: root-sum-square of digitization uncertainty and declared accuracy.
- **Flags** in the CSV: curve samples whose line centre is within one line width of a horizontal grid line (the two inked lines touch or merge there), and symbols whose centre was picked by eye because no isolated dot was found.
- **Stop rule**: if the passes differ by more than the declared accuracy in more than 10% of a figure's points, stop and report.
