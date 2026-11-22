"""Build the published dataset from both passes of every figure.

For each folder under tools/digitize/figures/ that holds pass-a.result.json
and pass-b.result.json, compare the passes (compare.py), write the figure's
comparison.csv and comparison.md, and append its rows to the dataset CSV.

Usage:
    python -I tools/digitize/consolidate.py <figures_dir> <dataset.csv> [--summary summary.md]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from compare import compare_results, markdown, write_csv  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("figures", type=Path)
    ap.add_argument("dataset", type=Path)
    ap.add_argument("--summary", type=Path, default=None)
    args = ap.parse_args()

    all_rows: list[dict] = []
    summary = ["| Figure | Points compared | Above declared accuracy | Stop rule | Unmatched |", "| --- | ---: | ---: | --- | ---: |"]
    for folder in sorted(p for p in args.figures.iterdir() if p.is_dir()):
        fa, fb = folder / "pass-a.result.json", folder / "pass-b.result.json"
        if not (fa.exists() and fb.exists()):
            continue
        res = compare_results(json.loads(fa.read_text(encoding="utf-8")), json.loads(fb.read_text(encoding="utf-8")))
        write_csv(res["rows"], folder / "comparison.csv")
        (folder / "comparison.md").write_text(markdown(res), encoding="utf-8", newline="\n")
        all_rows += [r for r in res["rows"] if r["series"] not in res["check_series"]]
        frac = res["exceed"] / res["compared"] if res["compared"] else 0.0
        summary.append(f"| {res['figure']['number']} | {res['compared']} | {res['exceed']} ({100 * frac:.0f}%) | "
                       f"{'TRIGGERED' if frac > 0.10 else 'not triggered'} | {len(res['unmatched'])} |")
    write_csv(all_rows, args.dataset)
    text = "\n".join(summary) + "\n"
    if args.summary:
        args.summary.write_text(text, encoding="utf-8", newline="\n")
    print(text)
    print(f"{len(all_rows)} rows written to {args.dataset}")


if __name__ == "__main__":
    main()
