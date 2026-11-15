"""Compare two independent digitization passes of one figure.

Writes one CSV row per point and variable, with both pass values, the
adopted value (mean of the two passes), the pass difference, the one-pixel
floor in data units, the digitization uncertainty, the report's declared
accuracy and the total uncertainty.

Digitization uncertainty = max(pass difference, one scan pixel along that
axis in data units) (brief 001, Amendment 2, point 4). Both passes share the
centre-dot snap and the traced grid, so their difference can be near zero by
construction; it then only guards against gross errors (wrong symbol, wrong
line, wrong axis origin), and the pixel floor carries the reading resolution.
Total uncertainty = root-sum-square of digitization uncertainty and declared
accuracy.

Prints a Markdown table and applies the stop rule of brief 001: if the passes
differ by more than the declared accuracy in more than 10% of a figure's
points, stop and report.

Curve samples are matched by sample id (both passes sample the same x values).
Symbols are matched one to one by nearest neighbour in data space, scaled by
the declared accuracy of each variable; a point found by only one pass is
reported, never dropped silently.

Usage:
    python -I tools/digitize/compare.py <pass-a.result.json> <pass-b.result.json> <out.csv> [--md out.md]
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path

# Declared accuracy of the balance data, NACA RM L52B08 p. 5 ("Measurements").
DECLARED = {"CL": 0.01, "CD": 0.001, "CD0": 0.001, "Cm": 0.004}

FIELDS = [
    "document", "figure", "pdf_page", "printed_page", "wing", "mach", "series", "point_id",
    "variable", "value_pass_a", "value_pass_b", "value_adopted", "pass_difference", "u_pixel_floor",
    "u_digitization", "u_declared", "u_total", "data_class", "method", "flags", "note",
]


def match_symbols(pa: list[dict], pb: list[dict], xvar: str, yvar: str) -> list[tuple[dict | None, dict | None]]:
    def dist(a: dict, b: dict) -> float:
        return math.hypot((a["value"][xvar] - b["value"][xvar]) / DECLARED[xvar],
                          (a["value"][yvar] - b["value"][yvar]) / DECLARED[yvar])
    pairs = sorted(((dist(a, b), i, j) for i, a in enumerate(pa) for j, b in enumerate(pb)), key=lambda t: t[0])
    used_a, used_b, out = set(), set(), []
    for d, i, j in pairs:
        if i in used_a or j in used_b or d > 5.0:
            continue
        used_a.add(i)
        used_b.add(j)
        out.append((pa[i], pb[j]))
    out += [(pa[i], None) for i in range(len(pa)) if i not in used_a]
    out += [(None, pb[j]) for j in range(len(pb)) if j not in used_b]
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pass_a", type=Path)
    ap.add_argument("pass_b", type=Path)
    ap.add_argument("out_csv", type=Path)
    ap.add_argument("--md", type=Path, default=None)
    args = ap.parse_args()
    ra = json.loads(args.pass_a.read_text(encoding="utf-8"))
    rb = json.loads(args.pass_b.read_text(encoding="utf-8"))
    fig = ra["figure"]
    if fig["id"] != rb["figure"]["id"]:
        raise SystemExit("the two results are for different figures")

    rows: list[dict] = []
    exceed = 0
    compared = 0
    unmatched: list[str] = []
    for sa in ra["series"]:
        sb = next((s for s in rb["series"] if s["id"] == sa["id"]), None)
        if sb is None:
            unmatched.append(f"series {sa['id']} only in pass A")
            continue
        xvar, yvar = sa["x_variable"], sa["y_variable"]
        if sa["kind"] == "curve_samples":
            by_id_b = {p["id"]: p for p in sb["points"]}
            pairs = [(p, by_id_b.get(p["id"])) for p in sa["points"]]
            pairs += [(None, p) for p in sb["points"] if p["id"] not in {q["id"] for q in sa["points"]}]
            variables = [yvar]
            data_class = "naca_faired_crossplot"
            method = "curve sampled at the stated x by the column-snap of tools/digitize/digitize.py"
        else:
            pairs = match_symbols([p for p in sa["points"] if p.get("found")],
                                  [p for p in sb["points"] if p.get("found")], xvar, yvar)
            variables = [xvar, yvar]
            data_class = "measured"
            method = "symbol centre dot located by tools/digitize/digitize.py (snap 'dot' unless noted)"
        for a, b in pairs:
            if a is None or b is None or not a.get("found") or not b.get("found"):
                which = "A" if (a is not None and a.get("found")) else "B"
                pid = (a or b)["id"]
                unmatched.append(f"{sa['id']} {pid}: found only in pass {which}")
                continue
            exceeded_here = False
            flags = []
            for label, p in (("A", a), ("B", b)):
                if p.get("near_grid_line"):
                    flags.append(f"pass {label}: within one line width of grid line {p['nearest_grid_line']['value']}")
                if p.get("snap") == "none":
                    flags.append(f"pass {label}: centre picked by eye (no dot snap)")
            for var in variables:
                va, vb = a["value"][var], b["value"][var]
                diff = abs(va - vb)
                axis = 0 if var == xvar else 1
                floor = max(abs(ra["calibration"]["data_per_px"][axis]), abs(rb["calibration"]["data_per_px"][axis]))
                u_dig = max(diff, floor)
                u_dec = DECLARED[var]
                if diff > u_dec:
                    exceeded_here = True
                mach = sa.get("mach")
                if mach is None and xvar == "M":
                    mach = a["value"]["M"]
                rows.append({
                    "document": ra["source"]["document"],
                    "figure": fig["number"],
                    "pdf_page": fig["pdf_page"],
                    "printed_page": fig["printed_page"],
                    "wing": f"{sa['wing']} deg",
                    "mach": f"{mach:.3f}",
                    "series": sa["id"],
                    "point_id": f"A:{a['id']}|B:{b['id']}" if a["id"] != b["id"] else a["id"],
                    "variable": var,
                    "value_pass_a": f"{va:.5f}",
                    "value_pass_b": f"{vb:.5f}",
                    "value_adopted": f"{(va + vb) / 2:.5f}",
                    "pass_difference": f"{diff:.6f}",
                    "u_pixel_floor": f"{floor:.6f}",
                    "u_digitization": f"{u_dig:.6f}",
                    "u_declared": f"{u_dec:.3f}",
                    "u_total": f"{math.hypot(u_dig, u_dec):.5f}",
                    "data_class": data_class,
                    "method": method,
                    "flags": "; ".join(flags),
                    "note": " / ".join(n for n in (a.get("note", ""), b.get("note", "")) if n),
                })
            compared += 1
            exceed += int(exceeded_here)

    args.out_csv.parent.mkdir(parents=True, exist_ok=True)
    with args.out_csv.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)

    frac = exceed / compared if compared else 0.0
    lines = [
        f"### Figure {fig['number']} (PDF page {fig['pdf_page']}, printed page {fig['printed_page']})",
        "",
        "| Series | Point | Variable | Pass A | Pass B | Pass difference | 1 px floor | Declared accuracy | Difference / accuracy | Flags |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for r in rows:
        ratio = float(r["pass_difference"]) / float(r["u_declared"])
        lines.append(f"| {r['series']} | {r['point_id']} | {r['variable']} | {r['value_pass_a']} | {r['value_pass_b']} | "
                     f"{r['pass_difference']} | {r['u_pixel_floor']} | {r['u_declared']} | {ratio:.2f} | {r['flags']} |")
    lines += [
        "",
        f"Points compared: {compared}. Points where the passes differ by more than the declared accuracy: {exceed} "
        f"({100 * frac:.0f}%). Stop rule (more than 10%): {'TRIGGERED' if frac > 0.10 else 'not triggered'}.",
    ]
    if unmatched:
        lines += ["", "Unmatched:"] + [f"- {u}" for u in unmatched]
    md = "\n".join(lines) + "\n"
    if args.md:
        args.md.write_text(md, encoding="utf-8")
    print(md)


if __name__ == "__main__":
    main()
