"""Compare the symbol centres of one plot found on two different scans.

When the second scan cannot be calibrated on its own grid (for example a
1-bit copy where the fine graph-paper ruling prints as black as the heavy
lines), the scans can still be compared through the symbols themselves: fit
an affine map from the centres found on scan A (a result file of
digitize.py) to the centres found on scan B (same points, same ids), and look
at what is left over. A residual is a symbol that sits elsewhere relative to
the others on one scan than on the other (local distortion, a different
reading of the centre); it is converted to data units with scan A's
calibration. It uses no model and no grid of scan B.

Usage:
    python -I tools/digitize/scan_check.py <scan-a.result.json> <scan-b.result.json> [--md out.md]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("a", type=Path)
    ap.add_argument("b", type=Path)
    ap.add_argument("--md", type=Path, default=None)
    args = ap.parse_args()
    ra = json.loads(args.a.read_text(encoding="utf-8"))
    rb = json.loads(args.b.read_text(encoding="utf-8"))
    pa = {(s["id"], p["id"]): p for s in ra["series"] for p in s["points"] if p.get("found")}
    pb = {(s["id"], p["id"]): p for s in rb["series"] for p in s["points"] if p.get("found")}
    keys = sorted(set(pa) & set(pb), key=lambda k: (k[0], int(k[1][1:]) if k[1][1:].isdigit() else k[1]))
    A = np.array([pa[k]["px"] for k in keys], float)
    B = np.array([pb[k]["px"] for k in keys], float)
    M = np.c_[A, np.ones(len(A))]
    coef, *_ = np.linalg.lstsq(M, B, rcond=None)
    res_b = B - M @ coef
    # back to scan A's pixel frame: solve the 2x2 linear part
    lin = coef[:2].T
    res_a = np.linalg.solve(lin, res_b.T).T
    dpx = ra["calibration"]["data_per_px"]
    xvar, yvar = ra["series"][0]["x_variable"], ra["series"][0]["y_variable"]
    lines = [f"Scan A: {ra['source'].get('url', '')} ({args.a.name}); scan B: {rb['source'].get('url', '')} ({args.b.name}).",
             "",
             f"Affine map from scan A to scan B fitted on {len(keys)} symbol centres (6 parameters). Residuals, in scan A pixels and in data units "
             f"(1 px = {abs(dpx[0]):.5f} {xvar}, {abs(dpx[1]):.6f} {yvar}):",
             "",
             f"| Series | Point | Residual x (px) | Residual y (px) | {xvar} | {yvar} |",
             "| --- | --- | ---: | ---: | ---: | ---: |"]
    for k, r in zip(keys, res_a):
        lines.append(f"| {k[0]} | {k[1]} | {r[0]:+.2f} | {r[1]:+.2f} | {r[0] * abs(dpx[0]):+.5f} | {r[1] * abs(dpx[1]):+.6f} |")
    rms = np.sqrt((res_a ** 2).mean(axis=0))
    mx = np.abs(res_a).max(axis=0)
    lines += ["", f"RMS residual: {rms[0]:.2f} px in x, {rms[1]:.2f} px in y; largest: {mx[0]:.2f} px ({mx[0] * abs(dpx[0]):.5f} {xvar}), "
              f"{mx[1]:.2f} px ({mx[1] * abs(dpx[1]):.6f} {yvar})."]
    text = "\n".join(lines) + "\n"
    if args.md:
        args.md.write_text(text, encoding="utf-8", newline="\n")
    print(text)


if __name__ == "__main__":
    main()
