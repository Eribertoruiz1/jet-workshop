"""Find candidate data symbols on a scanned NACA figure by their centre dots.

NACA draftsmen drew a small dot at each data point and a hollow symbol
around it. This script finds every small, isolated ink blob inside the plot
that has ink around it in most directions (the symbol outline). It does not
decide which polar a candidate belongs to, or whether it is a data point at
all: the reader does that, looking at the numbered tiles this script draws,
and writes the chosen candidate numbers into the figure spec.

The output is deterministic for a given scan and parameters, so both passes
see the same candidates; they differ in which ones they assign to which
series, and in how they handle symbols whose dot was not found.

Usage:
    python -I tools/digitize/candidates.py <scan.png> <spec.json> <out.json> <tiles_dir>

The spec is a figure spec with at least its calibration (grid and picked
intersections); the plot area is taken from the traced grid.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from digitize import build_mesh, fit_affine, load_gray, snap_grid_intersection  # noqa: E402

LEVEL = 170.0       # grey below which a pixel is ink (dark enough to keep dots apart from faint halos)
MAX_DOT_AREA = 30   # px
MAX_DOT_SIZE = 7    # px, bounding box side
GAP = 2             # px of white required around the dot
RING = (6, 16)      # px, radius band searched for the symbol outline
SECTORS = 8
MIN_SECTORS = 5


def components(mask: np.ndarray) -> list[tuple[int, int, int, int, int, list]]:
    """8-connected components by run-length union-find.

    Returns (area, y0, x0, y1, x1, runs) per component; runs are (y, xs, xe) inclusive.
    """
    parent: list[int] = []

    def find(a: int) -> int:
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    runs_all: list[tuple[int, int, int]] = []
    prev: list[tuple[int, int, int]] = []  # (xs, xe, run index)
    for y in range(mask.shape[0]):
        row = mask[y]
        d = np.diff(np.r_[0, row.astype(np.int8), 0])
        starts = np.flatnonzero(d == 1)
        ends = np.flatnonzero(d == -1) - 1
        cur = []
        j = 0
        for xs, xe in zip(starts.tolist(), ends.tolist()):
            idx = len(runs_all)
            runs_all.append((y, xs, xe))
            parent.append(idx)
            while j < len(prev) and prev[j][1] < xs - 1:
                j += 1
            k = j
            while k < len(prev) and prev[k][0] <= xe + 1:
                ra, rb = find(idx), find(prev[k][2])
                if ra != rb:
                    parent[ra] = rb
                k += 1
            cur.append((xs, xe, idx))
        prev = cur
    comps: dict[int, list] = {}
    for i, r in enumerate(runs_all):
        comps.setdefault(find(i), []).append(r)
    out = []
    for runs in comps.values():
        area = sum(xe - xs + 1 for _, xs, xe in runs)
        ys = [r[0] for r in runs]
        out.append((area, min(ys), min(r[1] for r in runs), max(ys), max(r[2] for r in runs), runs))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scan", type=Path)
    ap.add_argument("spec", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("tiles", type=Path)
    ap.add_argument("--tile", type=int, default=600, help="tile size in native px")
    args = ap.parse_args()

    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    g = load_gray(args.scan)
    cal = spec["calibration"]
    px, xv, yv = [], [], []
    for cp in cal["points"]:
        x, y = snap_grid_intersection(g, *cp["px"])
        px.append([x, y]); xv.append(cp["x"]); yv.append(cp["y"])
    aff = fit_affine(np.array(px), np.array(xv, float), np.array(yv, float))
    mesh, _ = build_mesh(g, aff, cal["grid"])

    # Plot area from the outer grid lines, shrunk by a few px to drop the frame.
    yc = float(np.mean([f(1500.0) for f in mesh.y_lines]))
    xs_frame = [mesh.x_lines[0](yc), mesh.x_lines[-1](yc)]
    xc = float(np.mean(xs_frame))
    ys_frame = [mesh.y_lines[0](xc), mesh.y_lines[-1](xc)]
    x0, x1 = int(min(xs_frame)) + 4, int(max(xs_frame)) - 4
    # Symbols can sit on the top frame line; below the bottom frame there are only
    # labels, whose decimal points would look like dots.
    y0, y1 = int(min(ys_frame)) - 30, int(max(ys_frame)) - 3

    mask = g < LEVEL
    sub = mask[y0:y1, x0:x1]
    cands = []
    for area, cy0, cx0, cy1, cx1, runs in components(sub):
        if area > MAX_DOT_AREA or (cy1 - cy0 + 1) > MAX_DOT_SIZE or (cx1 - cx0 + 1) > MAX_DOT_SIZE:
            continue
        w = 0.0; sx = 0.0; sy = 0.0
        for y, a, b in runs:
            vals = 255.0 - g[y0 + y, x0 + a : x0 + b + 1]
            w += vals.sum(); sx += (vals * np.arange(x0 + a, x0 + b + 1)).sum(); sy += vals.sum() * (y0 + y)
        cx, cy = sx / w, sy / w
        r_dot = max(cx1 - cx0, cy1 - cy0) / 2 + 0.5
        # White gap around the dot.
        yy, xx = np.mgrid[-RING[1]:RING[1] + 1, -RING[1]:RING[1] + 1]
        rr = np.hypot(xx, yy)
        ix, iy = int(round(cx)), int(round(cy))
        if iy - RING[1] < 0 or ix - RING[1] < 0 or iy + RING[1] >= g.shape[0] or ix + RING[1] >= g.shape[1]:
            continue
        patch = mask[iy - RING[1] : iy + RING[1] + 1, ix - RING[1] : ix + RING[1] + 1]
        gap = (rr > r_dot + 0.5) & (rr <= r_dot + 0.5 + GAP)
        if patch[gap].mean() > 0.30:  # a grid line or curve may pass 2-3 px away
            continue
        # Outline around it in most directions.
        band = (rr >= RING[0]) & (rr <= RING[1])
        ang = (np.arctan2(yy, xx) + math.pi) / (2 * math.pi) * SECTORS
        hit = {int(a) % SECTORS for a in ang[band & patch]}
        if len(hit) < MIN_SECTORS:
            continue
        cands.append({"px": [round(float(cx), 2), round(float(cy), 2)], "area": int(area), "sectors": len(hit)})

    cands.sort(key=lambda c: (c["px"][0], c["px"][1]))
    for i, c in enumerate(cands, 1):
        c["id"] = i
        dx, dy = mesh.to_data(*c["px"])
        c["data"] = [round(dx, 5), round(dy, 5)]
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps({
        "scan": spec["scan"], "figure": spec["figure"],
        "parameters": {"level": LEVEL, "max_dot_area": MAX_DOT_AREA, "max_dot_size": MAX_DOT_SIZE,
                       "gap": GAP, "ring": RING, "min_sectors": MIN_SECTORS},
        "plot_box_px": [x0, y0, x1, y1],
        "candidates": cands}, indent=2) + "\n", encoding="utf-8", newline="\n")

    # Numbered tiles for the reader.
    base = Image.open(args.scan).convert("RGB")
    font = ImageFont.load_default(size=13)
    args.tiles.mkdir(parents=True, exist_ok=True)
    t = args.tile
    n = 0
    for ty in range(y0, y1, t):
        for tx in range(x0, x1, t):
            inside = [c for c in cands if tx <= c["px"][0] < tx + t and ty <= c["px"][1] < ty + t]
            if not inside:
                continue
            tile = base.crop((tx - 20, ty - 20, tx + t + 20, ty + t + 20)).resize(((t + 40) * 2, (t + 40) * 2), Image.LANCZOS)
            d = ImageDraw.Draw(tile)
            for c in inside:
                ox, oy = (c["px"][0] - tx + 20) * 2, (c["px"][1] - ty + 20) * 2
                d.ellipse([ox - 3, oy - 3, ox + 3, oy + 3], outline=(220, 0, 0), width=2)
                d.text((ox + 14, oy - 22), str(c["id"]), fill=(220, 0, 0), font=font)
            d.text((6, 4), f"native x {tx}-{tx + t}, y {ty}-{ty + t}", fill=(0, 90, 200), font=font)
            tile.save(args.tiles / f"tile_{ty:04d}_{tx:04d}.png")
            n += 1
    print(f"{len(cands)} candidates in plot box {x0},{y0}-{x1},{y1}; {n} tiles in {args.tiles}")


if __name__ == "__main__":
    main()
