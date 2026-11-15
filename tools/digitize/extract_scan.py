"""Extract the embedded scan of a PDF page at its native resolution.

Every page of the NTRS copy of NACA RM L52B08 is a single scanned image
(about 300 dpi). Digitizing on the native pixels avoids resampling, and makes
pixel coordinates reproducible: they refer to the embedded image, turned by
the page's /Rotate value so that it reads upright, as a PDF viewer shows it.

Usage:
    python -I tools/digitize/extract_scan.py <pdf> <pdf_page> <out.png>

<pdf_page> is the 1-based page index in the PDF file (not the printed page number).
Prints the image size, the page rotation and the SHA-256 of the PDF.
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import pypdfium2 as pdfium
import pypdfium2.raw as pdfium_c
from PIL import Image


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def extract(pdf: Path, page_no: int) -> tuple[Image.Image, int]:
    doc = pdfium.PdfDocument(str(pdf))
    page = doc[page_no - 1]
    images = [o for o in page.get_objects() if o.type == pdfium_c.FPDF_PAGEOBJ_IMAGE]
    if len(images) != 1:
        raise SystemExit(f"page {page_no}: expected exactly one image object, found {len(images)}")
    img = images[0].get_bitmap(render=False).to_pil().convert("L")
    rotation = page.get_rotation()  # clockwise degrees, as in the PDF /Rotate key
    if rotation:
        # PIL rotates counter-clockwise for positive angles.
        img = img.rotate(-rotation, expand=True)
    return img, rotation


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("pdf_page", type=int)
    ap.add_argument("out", type=Path)
    args = ap.parse_args()
    img, rotation = extract(args.pdf, args.pdf_page)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    img.save(args.out)
    print(f"pdf page {args.pdf_page}: {img.width}x{img.height} px, rotation {rotation}, pdf sha256 {sha256(args.pdf)}")


if __name__ == "__main__":
    main()
