/**
 * Minimal SVG plots written by the script (no dependency): axes, lines, bands
 * and points with error bars. Colours meet contrast on white.
 */

export interface Series {
  label: string;
  color: string;
  kind: "line" | "points" | "band" | "hollow";
  points: { x: number; y: number; lo?: number; hi?: number }[];
  dash?: string;
}

export interface Plot {
  title: string;
  xLabel: string;
  yLabel: string;
  x: [number, number];
  y: [number, number];
  series: Series[];
  width?: number;
  height?: number;
  xTicks?: number[];
  yTicks?: number[];
  vSpan?: [number, number, string];
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function plotSvg(p: Plot): string {
  const W = p.width ?? 720;
  const H = p.height ?? 440;
  const m = { l: 70, r: 210, t: 36, b: 52 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const X = (x: number): number => m.l + ((x - p.x[0]) / (p.x[1] - p.x[0])) * pw;
  const Y = (y: number): number => m.t + ph - ((y - p.y[0]) / (p.y[1] - p.y[0])) * ph;
  const ticks = (r: [number, number], n: number): number[] => {
    const step = (r[1] - r[0]) / n;
    return Array.from({ length: n + 1 }, (_, i) => r[0] + i * step);
  };
  const xt = p.xTicks ?? ticks(p.x, 7);
  const yt = p.yTicks ?? ticks(p.y, 6);
  const out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Helvetica, Arial, sans-serif" font-size="12">`);
  out.push(`<rect width="${W}" height="${H}" fill="#ffffff"/>`);
  out.push(`<text x="${m.l}" y="20" font-size="14" font-weight="bold" fill="#111">${esc(p.title)}</text>`);
  if (p.vSpan) out.push(`<rect x="${X(p.vSpan[0])}" y="${m.t}" width="${X(p.vSpan[1]) - X(p.vSpan[0])}" height="${ph}" fill="#eeeeee"/><text x="${(X(p.vSpan[0]) + X(p.vSpan[1])) / 2}" y="${m.t + 14}" text-anchor="middle" fill="#555" font-size="10">${esc(p.vSpan[2])}</text>`);
  for (const t of xt) out.push(`<line x1="${X(t)}" y1="${m.t}" x2="${X(t)}" y2="${m.t + ph}" stroke="#e3e3e3"/><text x="${X(t)}" y="${m.t + ph + 16}" text-anchor="middle" fill="#333">${t.toFixed(2)}</text>`);
  for (const t of yt) out.push(`<line x1="${m.l}" y1="${Y(t)}" x2="${m.l + pw}" y2="${Y(t)}" stroke="#e3e3e3"/><text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end" fill="#333">${t.toFixed(4)}</text>`);
  out.push(`<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="#888"/>`);
  out.push(`<text x="${m.l + pw / 2}" y="${H - 12}" text-anchor="middle" fill="#111">${esc(p.xLabel)}</text>`);
  out.push(`<text transform="translate(16 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" fill="#111">${esc(p.yLabel)}</text>`);
  out.push(`<clipPath id="c"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath><g clip-path="url(#c)">`);
  for (const s of p.series) {
    const pts = s.points.filter((q) => Number.isFinite(q.y));
    if (s.kind === "band") {
      const up = pts.filter((q) => q.hi !== undefined).map((q) => `${X(q.x)},${Y(q.hi!)}`);
      const dn = pts.filter((q) => q.lo !== undefined).map((q) => `${X(q.x)},${Y(q.lo!)}`).reverse();
      out.push(`<polygon points="${[...up, ...dn].join(" ")}" fill="${s.color}" fill-opacity="0.18" stroke="none"/>`);
    } else if (s.kind === "line") {
      out.push(`<polyline points="${pts.map((q) => `${X(q.x)},${Y(q.y)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`);
    } else {
      for (const q of pts) {
        if (q.lo !== undefined && q.hi !== undefined) out.push(`<line x1="${X(q.x)}" y1="${Y(q.lo)}" x2="${X(q.x)}" y2="${Y(q.hi)}" stroke="${s.color}"/>`);
        out.push(s.kind === "points" ? `<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="3.5" fill="${s.color}"/>` : `<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="1.5"/>`);
      }
    }
  }
  out.push(`</g>`);
  p.series.forEach((s, i) => {
    const y = m.t + 10 + i * 20;
    const x = m.l + pw + 14;
    const mark =
      s.kind === "band"
        ? `<rect x="${x}" y="${y - 6}" width="18" height="10" fill="${s.color}" fill-opacity="0.25"/>`
        : s.kind === "line"
          ? `<line x1="${x}" y1="${y}" x2="${x + 18}" y2="${y}" stroke="${s.color}" stroke-width="2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ""}/>`
          : s.kind === "points"
            ? `<circle cx="${x + 9}" cy="${y}" r="3.5" fill="${s.color}"/>`
            : `<circle cx="${x + 9}" cy="${y}" r="3.5" fill="#fff" stroke="${s.color}" stroke-width="1.5"/>`;
    out.push(`${mark}<text x="${x + 24}" y="${y + 4}" fill="#111">${esc(s.label)}</text>`);
  });
  out.push(`</svg>`);
  return out.join("\n");
}
