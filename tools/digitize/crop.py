"""Cut a region of a scan, enlarge it, and draw a pixel ruler on it.

This is the picking aid: the ruler labels are native scan pixel coordinates,
so a position read off the enlarged crop can be written straight into a
figure spec. Nothing here changes the data; it only helps a reader locate pixels.

Usage:
    python -I tools/digitize/crop.py <scan.png> <x0> <y0> <x1> <y1> <out.png>
        [--zoom 3] [--tick 10] [--label 50] [--mark x,y ...]

--tick   draw a faint ruler line every N native pixels
--label  print the coordinate every N native pixels (multiple of --tick)
--mark   draw a small cross at native pixel x,y (repeatable), for checking picks
--candidates  a candidates.json from candidates.py: draw each candidate inside the
         crop as a small red circle with its number
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

MARGIN = 44  # px of the output image reserved for labels on the top and left


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scan", type=Path)
    ap.add_argument("x0", type=int)
    ap.add_argument("y0", type=int)
    ap.add_argument("x1", type=int)
    ap.add_argument("y1", type=int)
    ap.add_argument("out", type=Path)
    ap.add_argument("--zoom", type=int, default=3)
    ap.add_argument("--tick", type=int, default=10)
    ap.add_argument("--label", type=int, default=50)
    ap.add_argument("--mark", action="append", default=[])
    ap.add_argument("--candidates", type=Path, default=None)
    args = ap.parse_args()

    src = Image.open(args.scan).convert("L")
    x0, y0 = max(0, args.x0), max(0, args.y0)
    x1, y1 = min(src.width, args.x1), min(src.height, args.y1)
    z = args.zoom
    region = src.crop((x0, y0, x1, y1)).resize(((x1 - x0) * z, (y1 - y0) * z), Image.NEAREST)

    out = Image.new("RGB", (region.width + MARGIN, region.height + MARGIN), "white")
    out.paste(region.convert("RGB"), (MARGIN, MARGIN))
    d = ImageDraw.Draw(out)
    font = ImageFont.load_default()

    def to_out(x: float, y: float) -> tuple[float, float]:
        # Centre of native pixel (x, y) in output coordinates.
        return MARGIN + (x - x0 + 0.5) * z, MARGIN + (y - y0 + 0.5) * z

    first_x = ((x0 + args.tick - 1) // args.tick) * args.tick
    for x in range(first_x, x1, args.tick):
        ox, _ = to_out(x, y0)
        major = x % args.label == 0
        d.line([(ox, MARGIN), (ox, out.height)], fill=(255, 120, 0) if major else (255, 200, 150), width=1)
        if major:
            d.text((ox - 12, 4), str(x), fill=(200, 60, 0), font=font)
    first_y = ((y0 + args.tick - 1) // args.tick) * args.tick
    for y in range(first_y, y1, args.tick):
        _, oy = to_out(x0, y)
        major = y % args.label == 0
        d.line([(MARGIN, oy), (out.width, oy)], fill=(0, 140, 255) if major else (150, 200, 255), width=1)
        if major:
            d.text((2, oy - 6), str(y), fill=(0, 80, 200), font=font)

    for m in args.mark:
        mx, my = (float(v) for v in m.split(","))
        ox, oy = to_out(mx, my)
        r = 2 * z
        d.line([(ox - r, oy), (ox + r, oy)], fill=(220, 0, 0), width=1)
        d.line([(ox, oy - r), (ox, oy + r)], fill=(220, 0, 0), width=1)

    if args.candidates:
        import json
        cands = json.loads(args.candidates.read_text(encoding="utf-8"))["candidates"]
        cfont = ImageFont.load_default(size=max(11, 5 * z))
        for c in cands:
            cx, cy = c["px"]
            if x0 <= cx < x1 and y0 <= cy < y1:
                ox, oy = to_out(cx - 0.5, cy - 0.5)
                r = max(3, z)
                d.ellipse([ox - r, oy - r, ox + r, oy + r], outline=(220, 0, 0), width=2)
                d.text((ox + 4 * z, oy - 9 * z), str(c["id"]), fill=(220, 0, 0), font=cfont)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out)
    print(f"{args.out.name}: native ({x0},{y0})-({x1},{y1}), zoom {z}, output {out.width}x{out.height}")


if __name__ == "__main__":
    main()
