"""Render pages of a PDF to PNG at a fixed resolution, and dump its text layer.

Usage:
    python -I tools/digitize/render_pages.py <pdf> <out_dir> --dpi 400 [--pages 1,2,5-9] [--text]

Page numbers are 1-based PDF page indices (not the printed page numbers).
"""

from __future__ import annotations

import argparse
from pathlib import Path

import pypdfium2 as pdfium


def parse_pages(spec: str | None, n: int) -> list[int]:
    if not spec:
        return list(range(1, n + 1))
    pages: list[int] = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            pages.extend(range(int(a), int(b) + 1))
        else:
            pages.append(int(part))
    return [p for p in pages if 1 <= p <= n]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("out_dir", type=Path)
    ap.add_argument("--dpi", type=int, default=400)
    ap.add_argument("--pages", type=str, default=None)
    ap.add_argument("--text", action="store_true", help="also write the text layer per page")
    args = ap.parse_args()

    doc = pdfium.PdfDocument(str(args.pdf))
    args.out_dir.mkdir(parents=True, exist_ok=True)
    scale = args.dpi / 72.0
    for p in parse_pages(args.pages, len(doc)):
        page = doc[p - 1]
        bitmap = page.render(scale=scale, grayscale=True)
        img = bitmap.to_pil()
        out = args.out_dir / f"p{p:02d}_{args.dpi}dpi.png"
        img.save(out)
        line = f"page {p}: {img.width}x{img.height} -> {out.name}"
        if args.text:
            text = page.get_textpage().get_text_range()
            (args.out_dir / f"p{p:02d}.txt").write_text(text, encoding="utf-8")
            line += f", text {len(text)} chars"
        print(line)


if __name__ == "__main__":
    main()
