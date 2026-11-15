"""Draw the points of two digitization passes on top of the scanned figure.

Both passes are drawn with the same axis mapping: pass A's mesh calibration
(rebuilt from pass A's result file). Each pass's data values are mapped back
to scan pixels through that one mapping, so any disagreement between the
passes, in calibration or in picking, shows as an offset between the marks.

Marks: pass A = red circle with a centre cross; pass B = blue square with a
diagonal cross. The image has the whole plot on top and an enlarged inset
around every point below it.

Usage:
    python -I tools/digitize/overlay.py <scan.png> <pass-a.result.json> <pass-b.result.json> <out.png>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
from digitize import Affine, build_mesh, load_gray  # noqa: E402

RED = (215, 25, 28)
BLUE = (30, 90, 220)


def mark_a(d: ImageDraw.ImageDraw, x: float, y: float, r: float, w: int) -> None:
    d.ellipse([x - r, y - r, x + r, y + r], outline=RED, width=w)
    d.line([x - r / 2, y, x + r / 2, y], fill=RED, width=w)
    d.line([x, y - r / 2, x, y + r / 2], fill=RED, width=w)


def mark_b(d: ImageDraw.ImageDraw, x: float, y: float, r: float, w: int) -> None:
    d.rectangle([x - r, y - r, x + r, y + r], outline=BLUE, width=w)
    d.line([x - r * 0.7, y - r * 0.7, x + r * 0.7, y + r * 0.7], fill=BLUE, width=w)
    d.line([x - r * 0.7, y + r * 0.7, x + r * 0.7, y - r * 0.7], fill=BLUE, width=w)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scan", type=Path)
    ap.add_argument("pass_a", type=Path)
    ap.add_argument("pass_b", type=Path)
    ap.add_argument("out", type=Path)
    ap.add_argument("--inset", type=int, default=36, help="half size of each inset, native px")
    ap.add_argument("--zoom", type=int, default=4)
    ap.add_argument("--insets", choices=["all", "flagged", "none"], default="all",
                    help="flagged: only points picked by eye or where the passes differ by more than one pixel")
    args = ap.parse_args()

    ra = json.loads(args.pass_a.read_text(encoding="utf-8"))
    rb = json.loads(args.pass_b.read_text(encoding="utf-8"))
    g = load_gray(args.scan)
    aff = Affine(np.array(ra["calibration"]["affine_matrix"]))
    mesh, _ = build_mesh(g, aff, ra["calibration"]["grid"])

    def to_px(p: dict) -> tuple[float, float]:
        xv, yv = p["data"]
        return mesh.to_pixel(xv, yv, start=tuple(p["px"]))

    pts: list[tuple[str, str, tuple[float, float], dict]] = []
    for label, res in (("A", ra), ("B", rb)):
        for s in res["series"]:
            for p in s["points"]:
                if p.get("found"):
                    pts.append((label, f"{s['id']} {p['id']}", to_px(p), p))

    # Plot bounding box from the outer grid lines.
    xs = [f(np.mean([f2(0) for f2 in mesh.y_lines])) for f in (mesh.x_lines[0], mesh.x_lines[-1])]
    ys = [f(np.mean(xs)) for f in (mesh.y_lines[0], mesh.y_lines[-1])]
    x0, x1 = int(min(xs)) - 60, int(max(xs)) + 60
    y0, y1 = int(min(ys)) - 60, int(max(ys)) + 60

    base = Image.open(args.scan).convert("RGB")
    full = base.crop((x0, y0, x1, y1))
    d = ImageDraw.Draw(full)
    for label, _, (px, py), _ in pts:
        (mark_a if label == "A" else mark_b)(d, px - x0, py - y0, 14, 3)
    scale = 1800 / full.width
    full = full.resize((1800, int(full.height * scale)), Image.LANCZOS)

    # Insets: one per pass-A point (or per flagged point), with every mark that falls inside it.
    a_pts = [p for p in pts if p[0] == "A"]
    if args.insets != "all":
        b_by = [p for p in pts if p[0] == "B"]

        def flagged(item) -> bool:
            _, _, (ax, ay), pa = item
            if pa.get("snap") == "none" or pa.get("near_grid_line"):
                return True
            near = min(((bx - ax) ** 2 + (by - ay) ** 2 for _, _, (bx, by), _ in b_by), default=1e9)
            return near > 1.0

        a_pts = [p for p in a_pts if flagged(p)] if args.insets == "flagged" else []
    font = ImageFont.load_default(size=18)
    size = 2 * args.inset * args.zoom
    cols = max(1, 1800 // (size + 20))
    rows_n = (len(a_pts) + cols - 1) // cols
    sheet = Image.new("RGB", (1800, full.height + 70 + rows_n * (size + 60)), "white")
    sheet.paste(full, (0, 50))
    ds = ImageDraw.Draw(sheet)
    title = (f"{ra['source']['document']}, figure {ra['figure']['number']} (PDF page {ra['figure']['pdf_page']}). "
             f"Red circle: pass A. Blue square: pass B. Both mapped with pass A's grid calibration.")
    ds.text((10, 14), title, fill=(0, 0, 0), font=font)
    for k, (_, name, (cx, cy), p) in enumerate(a_pts):
        ox = 10 + (k % cols) * (size + 20)
        oy = full.height + 70 + (k // cols) * (size + 60)
        bx0, by0 = int(round(cx)) - args.inset, int(round(cy)) - args.inset
        inset = base.crop((bx0, by0, bx0 + 2 * args.inset, by0 + 2 * args.inset)).resize((size, size), Image.NEAREST)
        di = ImageDraw.Draw(inset)
        for label, _, (px, py), _ in pts:
            if bx0 <= px < bx0 + 2 * args.inset and by0 <= py < by0 + 2 * args.inset:
                (mark_a if label == "A" else mark_b)(di, (px - bx0 + 0.5) * args.zoom, (py - by0 + 0.5) * args.zoom,
                                                     3 * args.zoom, 2)
        sheet.paste(inset, (ox, oy + 40))
        vals = ", ".join(f"{k2} {v:.4f}" for k2, v in p["value"].items())
        ds.text((ox, oy + 2), name.split(" ", 1)[1], fill=(0, 0, 0), font=font)
        ds.text((ox, oy + 20), vals, fill=(60, 60, 60), font=ImageFont.load_default(size=14))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out)
    print(f"{args.out.name}: {sheet.width}x{sheet.height}, {len(a_pts)} pass-A points, "
          f"{len(pts) - len(a_pts)} pass-B points")


if __name__ == "__main__":
    main()
