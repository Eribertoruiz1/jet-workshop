"""Cut a scanned table into reading tiles.

A reader transcribes a printed table more reliably from enlarged pieces than
from the whole page. Each tile is one band of columns and one band of rows,
with the strip that holds the run numbers pasted on its left, so every value
is read next to its run number. Nothing here reads or changes a value.

Usage:
    python -I studies/002-engine-cycle/tools/table_tiles.py <scan.png> <out_dir> <prefix>
        --strip x0,x1 --cols x0,x1[;x0,x1...] --rows y0,y1[;y0,y1...] [--zoom 2]

Coordinates are native pixels of the scan written by tools/digitize/extract_scan.py.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def spans(spec: str) -> list[tuple[int, int]]:
    out = []
    for part in spec.split(";"):
        a, b = part.split(",")
        out.append((int(a), int(b)))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("scan", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("prefix")
    ap.add_argument("--strip", required=True, help="x0,x1 of the run-number column")
    ap.add_argument("--cols", required=True)
    ap.add_argument("--rows", required=True)
    ap.add_argument("--zoom", type=float, default=2.0)
    args = ap.parse_args()

    src = Image.open(args.scan).convert("L")
    (sx0, sx1), = spans(args.strip)
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for ci, (x0, x1) in enumerate(spans(args.cols), start=1):
        for ri, (y0, y1) in enumerate(spans(args.rows), start=1):
            strip = src.crop((sx0, y0, sx1, y1))
            band = src.crop((x0, y0, x1, y1))
            gap = 12
            tile = Image.new("L", (strip.width + gap + band.width, band.height), 255)
            tile.paste(strip, (0, 0))
            tile.paste(band, (strip.width + gap, 0))
            z = args.zoom
            tile = tile.resize((round(tile.width * z), round(tile.height * z)), Image.LANCZOS)
            name = args.out_dir / f"{args.prefix}-c{ci}-r{ri}.png"
            tile.save(name)
            print(f"{name}: {tile.width}x{tile.height}")


if __name__ == "__main__":
    main()
