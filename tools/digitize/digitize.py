"""Turn a figure spec (axis calibration picks + point picks, in scan pixels)
into data values, and write an auditable result file.

A spec is one digitization pass of one figure. It records:
- which scan it reads (PDF page, image size),
- the axis calibration: grid-line intersections, each with its pixel position
  and its two axis values,
- the series: either symbols picked by hand (pixel centre of each symbol), or
  samples of a drawn curve at given x values.

The script never invents data. It only:
1. refines picked grid intersections to the centre of the printed lines
   (ink profile across each line), when the pick asks for it;
2. fits an affine map pixel -> data by least squares over all calibration
   intersections (this absorbs scan skew and unequal axis scales) and reports
   the residual of every intersection;
3. for curve samples, finds the pixel column of the requested x value and
   locates the centre of the inked line nearest the reader's hint, by a local
   straight-line fit over the clean columns within +/- 8 px (columns crossed
   by a vertical grid line are skipped);
4. converts every refined pixel to data with the affine map.

Usage:
    python -I tools/digitize/digitize.py <spec.json> <scan.png> <result.json>
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image

INK = 170.0  # grey level (0 black, 255 white) below which a pixel counts as ink


def load_gray(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("L"), dtype=np.float64)


# --------------------------------------------------------------------------
# Calibration
# --------------------------------------------------------------------------


def _peak_centroid(coords: np.ndarray, profile: np.ndarray) -> float:
    """Ink-weighted centroid of the main peak of a darkness profile."""
    base = np.median(profile)
    p = np.clip(profile - base, 0.0, None)
    i = int(np.argmax(p))
    if p[i] <= 0:
        raise ValueError("no ink peak in profile")
    half = 0.5 * p[i]
    lo, hi = i, i
    while lo > 0 and p[lo - 1] >= half:
        lo -= 1
    while hi < len(p) - 1 and p[hi + 1] >= half:
        hi += 1
    w = p[lo : hi + 1]
    return float((coords[lo : hi + 1] * w).sum() / w.sum())


def snap_grid_intersection(g: np.ndarray, x: float, y: float, r: int = 14, core: int = 6) -> tuple[float, float]:
    """Refine a grid-line intersection to the centre of both printed lines.

    The vertical line's centre comes from a column profile taken above and
    below the crossing; the horizontal line's from a row profile taken left
    and right of it. The crossing itself (+/- core px) is left out.
    """
    xi, yi = int(round(x)), int(round(y))
    rows = np.r_[yi - r : yi - core, yi + core + 1 : yi + r + 1]
    cols = np.arange(xi - r, xi + r + 1)
    prof_v = (255.0 - g[np.ix_(rows, cols)]).mean(axis=0)
    xc = _peak_centroid(cols.astype(float), prof_v)
    rows2 = np.arange(yi - r, yi + r + 1)
    cols2 = np.r_[xi - r : xi - core, xi + core + 1 : xi + r + 1]
    prof_h = (255.0 - g[np.ix_(rows2, cols2)]).mean(axis=1)
    yc = _peak_centroid(rows2.astype(float), prof_h)
    return xc, yc


@dataclass
class Affine:
    """data = M @ [px, py, 1]; row 0 gives x, row 1 gives y."""

    m: np.ndarray  # shape (2, 3)

    def to_data(self, px: float, py: float) -> tuple[float, float]:
        v = self.m @ np.array([px, py, 1.0])
        return float(v[0]), float(v[1])

    def to_pixel(self, xv: float, yv: float) -> tuple[float, float]:
        a = self.m[:, :2]
        b = np.array([xv, yv]) - self.m[:, 2]
        px, py = np.linalg.solve(a, b)
        return float(px), float(py)

    def column_for_x(self, xv: float, py: float) -> float:
        """Pixel column where the data x equals xv, on scan row py."""
        a, b, c = self.m[0]
        return float((xv - b * py - c) / a)


def fit_affine(px: np.ndarray, xv: np.ndarray, yv: np.ndarray) -> Affine:
    p = np.c_[px[:, 0], px[:, 1], np.ones(len(px))]
    cx, *_ = np.linalg.lstsq(p, xv, rcond=None)
    cy, *_ = np.linalg.lstsq(p, yv, rcond=None)
    return Affine(np.vstack([cx, cy]))


def _interp_extrap(v: float, xp: np.ndarray, fp: np.ndarray) -> float:
    """Piecewise-linear interpolation, extended linearly beyond the end cells. xp increasing."""
    if v <= xp[0]:
        return float(fp[0] + (v - xp[0]) * (fp[1] - fp[0]) / (xp[1] - xp[0]))
    if v >= xp[-1]:
        return float(fp[-1] + (v - xp[-1]) * (fp[-1] - fp[-2]) / (xp[-1] - xp[-2]))
    return float(np.interp(v, xp, fp))


@dataclass
class Mesh:
    """Calibration on the printed grid itself.

    Every grid line is traced along its length and fitted with a cubic, so a
    warped or skewed scan is followed line by line. A pixel's x value comes
    from the two vertical lines that bracket it on its own row, and its y
    value from the two horizontal lines that bracket it in its own column,
    by linear interpolation inside that grid cell.
    """

    x_values: np.ndarray  # values of the vertical lines, increasing
    x_lines: list         # pixel column of each vertical line as a function of row
    y_values: np.ndarray  # values of the horizontal lines, increasing
    y_lines: list         # pixel row of each horizontal line as a function of column

    def to_data(self, px: float, py: float) -> tuple[float, float]:
        xs = np.array([f(py) for f in self.x_lines])
        ys = np.array([f(px) for f in self.y_lines])
        xv = _interp_extrap(px, xs, self.x_values)
        # Rows grow downward while values grow upward: flip to keep xp increasing.
        yv = _interp_extrap(py, ys[::-1], self.y_values[::-1])
        return xv, yv

    def column_for_x(self, xv: float, py: float) -> float:
        xs = np.array([f(py) for f in self.x_lines])
        return _interp_extrap(xv, self.x_values, xs)

    def row_for_y(self, yv: float, px: float) -> float:
        ys = np.array([f(px) for f in self.y_lines])
        return _interp_extrap(yv, self.y_values, ys)

    def to_pixel(self, xv: float, yv: float, start: tuple[float, float]) -> tuple[float, float]:
        """Inverse map by fixed-point iteration from a nearby starting pixel."""
        px, py = start
        for _ in range(6):
            px = self.column_for_x(xv, py)
            py = self.row_for_y(yv, px)
        return px, py


def _line_profile_peak(profile: np.ndarray, max_width: int) -> tuple[float, float] | None:
    """Centre (in profile index units) and contrast of a single printed line."""
    base = float(np.median(profile))
    p = profile - base
    i = int(np.argmax(p))
    if p[i] < 40.0:
        return None
    half = 0.5 * p[i]
    lo, hi = i, i
    while lo > 0 and p[lo - 1] >= half:
        lo -= 1
    while hi < len(p) - 1 and p[hi + 1] >= half:
        hi += 1
    if hi - lo + 1 > max_width or lo == 0 or hi == len(p) - 1:
        return None
    w = np.clip(p[lo : hi + 1], 0, None)
    return float((np.arange(lo, hi + 1) * w).sum() / w.sum()), float(p[i])


def _robust_cubic(t: np.ndarray, u: np.ndarray) -> tuple[np.polynomial.Polynomial, dict]:
    keep = np.ones(len(t), bool)
    fit = np.polynomial.Polynomial.fit(t, u, 3)
    for thr in (3.0, 1.5, 1.5):
        r = u - fit(t)
        keep = np.abs(r) < thr
        fit = np.polynomial.Polynomial.fit(t[keep], u[keep], 3)
    r = u[keep] - fit(t[keep])
    return fit, {"samples": int(len(t)), "used": int(keep.sum()), "rms_px": round(float(np.sqrt((r ** 2).mean())), 3)}


def build_mesh(g: np.ndarray, aff: Affine, grid: dict, step: int = 6, half_window: int = 9) -> tuple[Mesh, list[dict]]:
    xv = np.array([grid["x_lines"]["start"] + k * grid["x_lines"]["step"] for k in range(grid["x_lines"]["count"])])
    yv = np.array([grid["y_lines"]["start"] + k * grid["y_lines"]["step"] for k in range(grid["y_lines"]["count"])])
    report: list[dict] = []
    # Horizontal lines: row as a function of column.
    y_lines = []
    for v in yv:
        left = aff.to_pixel(xv[0], v)[0] + 8
        right = aff.to_pixel(xv[-1], v)[0] - 8
        cs, rs = [], []
        for c in np.arange(left, right, step):
            ci = int(round(c))
            a, b, cc = aff.m[1]
            py = (v - a * ci - cc) / b
            r0 = int(round(py)) - half_window
            prof = (255.0 - g[r0 : r0 + 2 * half_window + 1, ci - 2 : ci + 3]).mean(axis=1)
            hit = _line_profile_peak(prof, max_width=9)
            if hit is not None:
                cs.append(ci)
                rs.append(r0 + hit[0])
        fit, info = _robust_cubic(np.array(cs, float), np.array(rs))
        y_lines.append(fit)
        report.append({"line": "horizontal", "value": round(float(v), 6)} | info)
    # Vertical lines: column as a function of row.
    x_lines = []
    for v in xv:
        top = aff.to_pixel(v, yv[-1])[1] + 8
        bottom = aff.to_pixel(v, yv[0])[1] - 8
        rs, cs = [], []
        for r in np.arange(top, bottom, step):
            ri = int(round(r))
            a, b, cc = aff.m[0]
            px = (v - b * ri - cc) / a
            c0 = int(round(px)) - half_window
            prof = (255.0 - g[ri - 2 : ri + 3, c0 : c0 + 2 * half_window + 1]).mean(axis=0)
            hit = _line_profile_peak(prof, max_width=9)
            if hit is not None:
                rs.append(ri)
                cs.append(c0 + hit[0])
        fit, info = _robust_cubic(np.array(rs, float), np.array(cs))
        x_lines.append(fit)
        report.append({"line": "vertical", "value": round(float(v), 6)} | info)
    return Mesh(xv, x_lines, yv, y_lines), report


# --------------------------------------------------------------------------
# Curve sampling
# --------------------------------------------------------------------------


def _runs(mask: np.ndarray) -> list[tuple[int, int]]:
    """Inclusive (start, end) index pairs of consecutive True values."""
    out: list[tuple[int, int]] = []
    start = None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            out.append((start, i - 1))
            start = None
    if start is not None:
        out.append((start, len(mask) - 1))
    return out


def _column_hit(g: np.ndarray, c: int, y_pred: float, win: int) -> tuple[float, int] | None:
    """Centre (ink-weighted) and length of the inked run nearest y_pred in column c."""
    y0 = int(round(y_pred)) - win
    y1 = int(round(y_pred)) + win
    seg = g[y0 : y1 + 1, c]
    runs = _runs(seg < INK)
    if not runs:
        return None
    best = None
    for s, e in runs:
        w = 255.0 - seg[s : e + 1]
        yc = y0 + float((np.arange(s, e + 1) * w).sum() / w.sum())
        d = abs(yc - y_pred)
        if best is None or d < best[0]:
            best = (d, yc, e - s + 1)
    return best[1], best[2]


def _is_vertical_rule(g: np.ndarray, c: int, y: float, half_height: int = 30) -> bool:
    """True when column c sits on a printed vertical line (grid or axis)."""
    yi = int(round(y))
    seg = g[yi - half_height : yi + half_height + 1, c]
    return bool((seg < INK).mean() > 0.8)


def sample_curve(g: np.ndarray, aff: Affine, x_value: float, hint: tuple[float, float],
                 half: int = 8, win: int = 7, side: str = "both") -> dict:
    """Locate the inked curve through the reader's hint at data x = x_value.

    side: "both" uses clean columns on both sides of the target column;
    "right" or "left" uses one side only (for a curve that starts or ends at
    the target, where the other side holds other lines).
    """
    directions = {"both": (+1, -1), "right": (+1,), "left": (-1,)}[side]
    hy = float(hint[1])
    for _ in range(3):  # the column depends weakly on the row (skew): iterate
        c0 = aff.column_for_x(x_value, hy)
        ci = int(round(c0))
        cols: list[int] = []
        ys: list[float] = []
        widths: list[int] = []
        # Track outward from the centre column so steep curves are followed.
        for direction in directions:
            y_pred = hy
            local_c: list[int] = []
            local_y: list[float] = []
            rng = range(ci, ci + half + 1) if direction > 0 else range(ci - 1, ci - half - 1, -1)
            for c in rng:
                if _is_vertical_rule(g, c, y_pred):
                    continue
                hit = _column_hit(g, c, y_pred, win)
                if hit is None:
                    continue
                yc, length = hit
                local_c.append(c)
                local_y.append(yc)
                widths.append(length)
                if len(local_c) >= 2:
                    s = np.polyfit(local_c, local_y, 1)
                    y_pred = float(np.polyval(s, c + direction))
                else:
                    y_pred = yc
            cols += local_c
            ys += local_y
        if len(cols) < 3:
            return {"x_value": x_value, "hint": list(hint), "found": False,
                    "reason": "fewer than 3 clean columns with ink near the hint"}
        fit = np.polyfit(np.array(cols, float) - c0, np.array(ys), 1)
        y_at = float(fit[1])
        resid = np.array(ys) - np.polyval(fit, np.array(cols, float) - c0)
        hy = y_at
    xv, yv = aff.to_data(c0, y_at)
    return {
        "x_value": x_value,
        "hint": list(hint),
        "found": True,
        "side": side,
        "px": [round(c0, 2), round(y_at, 2)],
        "columns_used": len(cols),
        "line_width_px": float(np.median(widths)),
        "fit_rms_px": round(float(np.sqrt((resid ** 2).mean())), 3),
        "slope_px_per_px": round(float(fit[0]), 4),
        "data": [xv, yv],
    }


# --------------------------------------------------------------------------
# Symbol centres
# --------------------------------------------------------------------------


def snap_dot(g: np.ndarray, x: float, y: float, r: int = 5, level: float = 200.0) -> dict:
    """Refine a pick to the centre dot that NACA drew inside each data symbol.

    Looks for an isolated inked blob within r px of the pick: a connected
    group of pixels darker than `level` that does not reach the edge of the
    (2r+1)-px window (so outlines and lines passing through are rejected).
    Returns the ink-weighted centroid of the darkest such blob, or the pick
    itself with found=False when no isolated dot is there.
    """
    xi, yi = int(round(x)), int(round(y))
    win = g[yi - r : yi + r + 1, xi - r : xi + r + 1]
    mask = win < level
    seen = np.zeros_like(mask)
    best = None
    n = mask.shape[0]
    for sy in range(n):
        for sx in range(n):
            if not mask[sy, sx] or seen[sy, sx]:
                continue
            stack = [(sy, sx)]
            seen[sy, sx] = True
            comp = []
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < n and 0 <= nx < n and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            ys = np.array([c[0] for c in comp])
            xs = np.array([c[1] for c in comp])
            if ys.min() == 0 or xs.min() == 0 or ys.max() == n - 1 or xs.max() == n - 1:
                continue  # touches the window edge: part of an outline or a line
            w = 255.0 - win[ys, xs]
            ink = float(w.sum())
            if best is None or ink > best[0]:
                best = (ink, float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum()), len(comp))
    if best is None:
        return {"found": False, "px": [float(x), float(y)]}
    _, bx, by, size = best
    return {"found": True, "px": [round(xi - r + bx, 2), round(yi - r + by, 2)], "dot_pixels": size}


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------


def run(spec: dict, g: np.ndarray) -> dict:
    h, w = g.shape
    exp = spec["scan"]["size_px"]
    if [w, h] != exp:
        raise SystemExit(f"scan size {w}x{h} does not match spec {exp[0]}x{exp[1]}")

    cal_in = spec["calibration"]["points"]
    cal_px, cal_x, cal_y, cal_out = [], [], [], []
    for cp in cal_in:
        x, y = cp["px"]
        if cp.get("snap", "grid") == "grid":
            xs, ys = snap_grid_intersection(g, x, y)
        else:
            xs, ys = float(x), float(y)
        cal_px.append([xs, ys])
        cal_x.append(cp["x"])
        cal_y.append(cp["y"])
        cal_out.append({"picked_px": [x, y], "px": [round(xs, 2), round(ys, 2)], "x": cp["x"], "y": cp["y"]})
    cal_px_a = np.array(cal_px)
    aff = fit_affine(cal_px_a, np.array(cal_x, float), np.array(cal_y, float))
    for co, (xs, ys) in zip(cal_out, cal_px):
        fx, fy = aff.to_data(xs, ys)
        ex, ey = aff.to_pixel(co["x"], co["y"])
        co["residual_data"] = [fx - co["x"], fy - co["y"]]
        co["residual_px"] = [round(xs - ex, 2), round(ys - ey, 2)]
    # Scale of one pixel in data units along each axis, at the plot centre.
    cx, cy = cal_px_a.mean(axis=0)
    x0, y0 = aff.to_data(cx, cy)
    x1, _ = aff.to_data(cx + 1, cy)
    _, y1 = aff.to_data(cx, cy + 1)

    # Mesh calibration on the traced grid, when the spec describes the grid.
    mapper = aff
    mesh_report = None
    if "grid" in spec["calibration"]:
        mesh, mesh_report = build_mesh(g, aff, spec["calibration"]["grid"])
        mapper = mesh
        for co, (xs, ys) in zip(cal_out, cal_px):
            mx, my = mesh.to_data(xs, ys)
            co["mesh_residual_data"] = [mx - co["x"], my - co["y"]]

    def convert(px: float, py: float) -> dict:
        """Data value by the active calibration, plus the affine value for comparison."""
        ax, ay = aff.to_data(px, py)
        mx, my = mapper.to_data(px, py)
        return {"data": [mx, my], "affine_data": [ax, ay]}

    series_out = []
    for s in spec["series"]:
        offset = float(s.get("x_offset", 0.0))
        pts_out = []
        if s["kind"] == "curve_samples":
            for p in s["samples"]:
                r = sample_curve(g, mapper, float(p["x"]) + offset, tuple(p["hint_px"]),
                                 side=p.get("side", "both"))
                if r["found"]:
                    r["affine_data"] = convert(*r["px"])["affine_data"]
                r["id"] = p.get("id", f"x={p['x']}")
                if "note" in p:
                    r["note"] = p["note"]
                if r["found"]:
                    r["value"] = {s["x_variable"]: r["data"][0] - offset, s["y_variable"]: r["data"][1]}
                pts_out.append(r)
        elif s["kind"] == "symbols":
            for p in s["points"]:
                x, y = p["px"]
                snap = p.get("snap", "none")
                r = {"id": p["id"], "picked_px": [x, y], "snap": snap, "found": True}
                if snap == "dot":
                    d = snap_dot(g, float(x), float(y), r=int(p.get("dot_radius", 5)), level=float(p.get("dot_level", 200)))
                    if not d["found"]:
                        raise SystemExit(f"{s['id']} {p['id']}: no isolated centre dot within 5 px of {x},{y}; "
                                         "move the pick or use snap 'none' with a note")
                    x, y = d["px"]
                    r["dot_pixels"] = d["dot_pixels"]
                r["px"] = [x, y]
                conv = convert(float(x), float(y))
                xv, yv = conv["data"]
                r["data"] = conv["data"]
                r["affine_data"] = conv["affine_data"]
                r["value"] = {s["x_variable"]: xv - offset, s["y_variable"]: yv}
                if "note" in p:
                    r["note"] = p["note"]
                pts_out.append(r)
        else:
            raise SystemExit(f"unknown series kind {s['kind']}")
        series_out.append({k: v for k, v in s.items() if k not in ("samples", "points")} | {"points": pts_out})

    res = np.array([c["residual_data"] for c in cal_out])
    return {
        "source": spec["source"],
        "figure": spec["figure"],
        "pass": spec["pass"],
        "digitizer": spec.get("digitizer", ""),
        "scan": spec["scan"],
        "calibration": {
            "model": ("mesh: every grid line traced and fitted with a cubic, linear interpolation inside the grid cell "
                      "(affine fit over the picked intersections used only to predict line positions)")
                     if mesh_report is not None else "affine, least squares over grid intersections",
            "grid": spec["calibration"].get("grid"),
            "affine_matrix": aff.m.tolist(),
            "points": cal_out,
            "affine_rms_residual_data": [float(np.sqrt((res[:, 0] ** 2).mean())), float(np.sqrt((res[:, 1] ** 2).mean()))],
            "affine_max_abs_residual_data": [float(np.abs(res[:, 0]).max()), float(np.abs(res[:, 1]).max())],
            "data_per_px": [x1 - x0, y1 - y0],
            "grid_lines": mesh_report,
        },
        "series": series_out,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("spec", type=Path)
    ap.add_argument("scan", type=Path)
    ap.add_argument("out", type=Path)
    args = ap.parse_args()
    spec = json.loads(args.spec.read_text(encoding="utf-8"))
    g = load_gray(args.scan)
    result = run(spec, g)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(result, indent=2), encoding="utf-8")
    cal = result["calibration"]
    print(f"{spec['figure']['id']} pass {spec['pass']}: {len(cal['points'])} calibration points, "
          f"affine rms residual x {cal['affine_rms_residual_data'][0]:.5f}, y {cal['affine_rms_residual_data'][1]:.6f}; "
          f"1 px = {abs(cal['data_per_px'][0]):.5f} x, {abs(cal['data_per_px'][1]):.6f} y")
    if cal["grid_lines"]:
        worst = max(cal["grid_lines"], key=lambda r: r["rms_px"])
        sparse = [r for r in cal["grid_lines"] if r["used"] < 0.5 * r["samples"]]
        mres = np.array([c["mesh_residual_data"] for c in cal["points"]])
        print(f"  mesh: {len(cal['grid_lines'])} lines traced; worst line fit rms {worst['rms_px']} px "
              f"({worst['line']} {worst['value']}); lines with < 50% usable samples: "
              f"{[(r['line'][0], r['value']) for r in sparse] or 'none'}; "
              f"max |residual| at picked intersections x {np.abs(mres[:, 0]).max():.5f}, y {np.abs(mres[:, 1]).max():.6f}")
    for s in result["series"]:
        for p in s["points"]:
            if p.get("found"):
                vals = ", ".join(f"{k}={v:.5f}" for k, v in p["value"].items())
                extra = f" width {p['line_width_px']:.0f}px rms {p['fit_rms_px']}" if "line_width_px" in p else ""
                print(f"  {s['id']} {p['id']}: px {p['px']} -> {vals}{extra}")
            else:
                print(f"  {s['id']} {p['id']}: NOT FOUND ({p.get('reason')})")


if __name__ == "__main__":
    main()
