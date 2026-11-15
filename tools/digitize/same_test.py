"""Compare two digitized datasets point by point, to tell whether two figures show the same test.

Brief 003 asks whether the 47 deg, 4 percent wing of NACA RM L51I04a (figure 6)
is the same test as the 47 deg wing of NACA RM L52B08 (figure 7), whose
digitized values are open data. This script pairs the symbols of the two CSV
files series by series (same Mach number label) and, within a series, one to one
by nearest neighbour in (CL, CD) scaled by the declared accuracy (0.01 in CL,
0.001 in CD), and prints every pair with its differences. It uses no model.

Usage:
    python -I tools/digitize/same_test.py <a.csv> <a_series_prefix> <b.csv> <b_series_prefix> [--md out.md]

Example: same_test.py heldout/l51i04a.csv fig06b-47deg-t04-M bielat-l52b08.csv fig07b-47deg-M
"""

from __future__ import annotations

import argparse
import csv
import math
from pathlib import Path

ACC = {"CL": 0.01, "CD": 0.001}


def load(path: Path, prefix: str) -> dict[str, list[dict]]:
    pts: dict[tuple[str, str], dict] = {}
    with path.open(encoding="utf-8", newline="") as f:
        for r in csv.DictReader(f):
            if not r["series"].startswith(prefix) or r["variable"] not in ACC:
                continue
            p = pts.setdefault((r["series"], r["point_id"]), {"series": r["series"], "point": r["point_id"],
                                                             "mach": r["series"][len(prefix):], "flags": set()})
            p[r["variable"]] = float(r["value_adopted"])
            p["u_" + r["variable"]] = float(r["u_total"])
            if r["flags"]:
                p["flags"].add(r["flags"])
    out: dict[str, list[dict]] = {}
    for p in pts.values():
        if "CL" in p and "CD" in p:
            out.setdefault(p["mach"], []).append(p)
    return out


def pair(a: list[dict], b: list[dict]) -> list[tuple[dict | None, dict | None]]:
    def dist(p: dict, q: dict) -> float:
        return math.hypot((p["CL"] - q["CL"]) / ACC["CL"], (p["CD"] - q["CD"]) / ACC["CD"])
    cand = sorted((dist(p, q), i, j) for i, p in enumerate(a) for j, q in enumerate(b))
    ua, ub, out = set(), set(), []
    for d, i, j in cand:
        if i in ua or j in ub or d > 5.0:
            continue
        ua.add(i)
        ub.add(j)
        out.append((a[i], b[j]))
    out += [(a[i], None) for i in range(len(a)) if i not in ua]
    out += [(None, b[j]) for j in range(len(b)) if j not in ub]
    return sorted(out, key=lambda t: (t[0] or t[1])["CL"])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("a", type=Path)
    ap.add_argument("a_prefix")
    ap.add_argument("b", type=Path)
    ap.add_argument("b_prefix")
    ap.add_argument("--md", type=Path, default=None)
    args = ap.parse_args()
    a, b = load(args.a, args.a_prefix), load(args.b, args.b_prefix)
    lines = ["| Mach | Point A | Point B | CL A | CL B | dCL | CD A | CD B | dCD | dCL / 0.01 | dCD / 0.001 |",
             "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
    dcl, dcd, single = [], [], []
    for mach in sorted(set(a) & set(b), key=float):
        for p, q in pair(a[mach], b[mach]):
            if p is None or q is None:
                s = p or q
                single.append(f"M {mach}: {'A ' + s['point'] if p else 'B ' + s['point']} has no partner "
                              f"(CL {s['CL']:.4f}, CD {s['CD']:.5f})")
                continue
            dl, dd = p["CL"] - q["CL"], p["CD"] - q["CD"]
            dcl.append(abs(dl))
            dcd.append(abs(dd))
            lines.append(f"| {mach} | {p['point']} | {q['point']} | {p['CL']:.4f} | {q['CL']:.4f} | {dl:+.4f} | "
                         f"{p['CD']:.5f} | {q['CD']:.5f} | {dd:+.5f} | {abs(dl) / ACC['CL']:.2f} | {abs(dd) / ACC['CD']:.2f} |")
    only = sorted(set(a) ^ set(b), key=float)
    lines += ["", f"Pairs: {len(dcl)}. Largest |dCL| {max(dcl, default=0):.4f}, median {sorted(dcl)[len(dcl) // 2] if dcl else 0:.4f}; "
              f"largest |dCD| {max(dcd, default=0):.5f}, median {sorted(dcd)[len(dcd) // 2] if dcd else 0:.5f}."]
    if single:
        lines += ["", "Without a partner:"] + [f"- {s}" for s in single]
    if only:
        lines += ["", f"Mach numbers in one file only: {', '.join(only)}"]
    text = "\n".join(lines) + "\n"
    if args.md:
        args.md.write_text(text, encoding="utf-8", newline="\n")
    print(text)


if __name__ == "__main__":
    main()
