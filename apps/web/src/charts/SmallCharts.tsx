import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import type { LiftPoint, PolarPoint } from "@jet-workshop/validation";
import { CHART_TEXT, HatchPattern, MeasuredMark, XAxis, YAxis, bandRuns, niceTicks, xAxisHeight, yLabelHeight, type BandSample, type MarkShape, type MarkTone } from "./axes.tsx";
import { spreadLabels, textWidth, wrapText } from "./useWidth.ts";

const M = { l: 44, r: 12 };

/** Plot height for a chart width: wide enough to read, never squat. */
const plotHeight = (w: number): number => Math.round(Math.min(240, Math.max(170, (w - M.l - M.r) * 0.62)));

function frame(width: number, xLabel: string, yLabel: string, rightRoom = M.r) {
  const plotW = width - M.l - rightRoom;
  const yLines = wrapText(yLabel, width - 8, CHART_TEXT).length;
  const xLines = wrapText(xLabel, plotW, CHART_TEXT).length;
  const top = yLabelHeight(yLines) + 4;
  const plotH = plotHeight(width);
  const bottom = top + plotH;
  return { top, bottom, plotW, plotH, H: bottom + xAxisHeight(xLines) };
}

export interface PolarBandPoint extends BandSample {
  cl: number;
}

interface PolarText {
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
  machLabel: string;
  markTitle: (p: PolarPoint) => string;
}

/** Drag polar at one Mach number: CL against CD, the model as a band. */
export function PolarChart({ width, band, measured, modelNote, text }: { width: number; band: PolarBandPoint[]; measured: PolarPoint[]; modelNote: string | null; text: PolarText }) {
  const uid = useId().replace(/:/g, "");
  const f = frame(width, text.xLabel, text.yLabel);
  const cdMax = Math.max(0.04, ...measured.map((p) => p.cd + p.uCd), ...band.filter((c) => c.valid).map((c) => c.max));
  const x = scaleLinear().domain([0, Math.ceil((cdMax * 1.1) / 0.01) * 0.01]).range([M.l, width - M.r]);
  const clLo = Math.min(-0.2, ...measured.map((p) => p.cl - 0.05));
  const clHi = Math.max(0.6, ...measured.map((p) => p.cl + 0.05));
  const y = scaleLinear().domain([clLo, clHi]).range([f.bottom, f.top]);
  const xMax = x.domain()[1]! * 1.5;
  const fill = area<PolarBandPoint>().y((d) => y(d.cl)).x0((d) => x(Math.min(d.min, xMax))).x1((d) => x(Math.min(d.max, xMax)));
  const edge = (key: "min" | "max") => line<PolarBandPoint>().y((d) => y(d.cl)).x((d) => x(Math.min(d[key], xMax)));
  const runs = bandRuns(band);
  const noteLines = modelNote ? wrapText(modelNote, f.plotW - 16, CHART_TEXT) : [];
  return (
    <svg viewBox={`0 0 ${width} ${f.H}`} width={width} height={f.H} role="img" aria-label={text.ariaLabel}>
      <defs>
        <clipPath id={`plot-${uid}`}><rect x={M.l} y={f.top} width={f.plotW} height={f.plotH} /></clipPath>
        <HatchPattern id={`hatch-${uid}`} />
      </defs>
      <XAxis scale={x} ticks={niceTicks(x.domain()[0]!, x.domain()[1]!, width < 360 ? 4 : 5)} format={(v) => v.toFixed(2)} at={f.bottom} gridFrom={f.top} gridTo={f.bottom} label={text.xLabel} />
      <YAxis scale={y} ticks={niceTicks(clLo, clHi, 6)} format={tickFormat} at={M.l} gridFrom={M.l} gridTo={width - M.r} label={text.yLabel} labelWidth={width - 8} />
      <g clipPath={`url(#plot-${uid})`}>
        {runs.map((r, i) =>
          r.valid ? (
            <g key={i}>
              <path d={fill(r.points) ?? ""} fill="var(--accent)" fillOpacity={0.18} stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
            </g>
          ) : (
            <g key={i}>
              <path d={fill(r.points) ?? ""} fill={`url(#hatch-${uid})`} stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
            </g>
          ),
        )}
        {measured.map((p) => (
          <MeasuredMark key={`${p.series}-${p.pointId}`} x={x(p.cd)} y={y(p.cl)} ex0={x(p.cd - p.uCd)} ex1={x(p.cd + p.uCd)} ey0={y(p.cl - p.uCl)} ey1={y(p.cl + p.uCl)} title={text.markTitle(p)} />
        ))}
      </g>
      <text x={width - M.r} y={f.top + 14} textAnchor="end" className="num">{text.machLabel}</text>
      {noteLines.length > 0 && (
        <text x={M.l + 8} y={f.top + 30} className="ink">
          {noteLines.map((l, i) => <tspan key={i} x={M.l + 8} dy={i ? "1.25em" : 0}>{l}</tspan>)}
        </text>
      )}
    </svg>
  );
}

export interface LiftCurvePoint {
  alpha: number;
  cl: number;
  /** Inside the lift model's range (below its Mach limit, attached flow) */
  valid: boolean;
}

/** A set of measured lift symbols drawn alike, with an optional direct label at its last symbol. */
export interface LiftGroup {
  id: string;
  points: LiftPoint[];
  shape: MarkShape;
  tone: MarkTone;
  label?: string;
}

interface LiftText {
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
  /** Mach number shown at the top right; omitted, nothing is shown */
  machLabel?: string;
  markTitle: (p: LiftPoint) => string;
}

/** Lift curve at one Mach number: CL against angle of attack; the model dashed red where it is outside its range. */
export function LiftChart({ width, curve = [], groups, modelNote = null, errorBars = true, text, maxAlpha }: { width: number; curve?: LiftCurvePoint[]; groups: LiftGroup[]; modelNote?: string | null; errorBars?: boolean; text: LiftText; maxAlpha?: number }) {
  const all = groups.flatMap((g) => g.points);
  const labelRoom = groups.some((g) => g.label) ? Math.max(...groups.map((g) => textWidth(g.label ?? "", CHART_TEXT))) + 12 : M.r;
  const f = frame(width, text.xLabel, text.yLabel, labelRoom);
  const aLo = Math.min(-3, ...all.map((p) => p.alpha - 0.5));
  const aHi = maxAlpha ?? Math.max(14, ...all.map((p) => p.alpha + 0.5));
  const x = scaleLinear().domain([aLo, aHi]).range([M.l, width - labelRoom]);
  const clLo = Math.min(-0.3, ...all.map((p) => p.cl - 0.05));
  const clHi = Math.max(1.0, ...all.filter((p) => p.alpha <= aHi).map((p) => p.cl + 0.05));
  const y = scaleLinear().domain([clLo, clHi]).range([f.bottom, f.top]);
  const path = line<LiftCurvePoint>().x((d) => x(d.alpha)).y((d) => y(d.cl));
  const uid = useId().replace(/:/g, "");
  const noteLines = modelNote ? wrapText(modelNote, f.plotW - 16, CHART_TEXT) : [];
  return (
    <svg viewBox={`0 0 ${width} ${f.H}`} width={width} height={f.H} role="img" aria-label={text.ariaLabel}>
      <defs>
        <clipPath id={`plot-${uid}`}><rect x={M.l} y={f.top} width={f.plotW} height={f.plotH} /></clipPath>
      </defs>
      <XAxis scale={x} ticks={niceTicks(aLo, aHi, width < 360 ? 4 : 6)} format={(v) => v.toFixed(0)} at={f.bottom} gridFrom={f.top} gridTo={f.bottom} label={text.xLabel} />
      <YAxis scale={y} ticks={niceTicks(clLo, clHi, 6)} format={tickFormat} at={M.l} gridFrom={M.l} gridTo={width - labelRoom} label={text.yLabel} labelWidth={width - 8} />
      <g clipPath={`url(#plot-${uid})`}>
        {lineRuns(curve).map((r, i) => (
          <path key={i} d={path(r.points) ?? ""} fill="none" stroke={r.valid ? "var(--accent)" : "var(--stop)"} strokeWidth={r.valid ? 1.8 : 1.4} strokeDasharray={r.valid ? undefined : "5 4"} />
        ))}
        {groups.flatMap((g) =>
          g.points.filter((p) => p.alpha <= aHi).map((p) => (
            <MeasuredMark key={`${g.id}-${p.series}-${p.pointId}`} x={x(p.alpha)} y={y(p.cl)} ex0={x(p.alpha - p.uAlpha)} ex1={x(p.alpha + p.uAlpha)} ey0={y(p.cl - p.uCl)} ey1={y(p.cl + p.uCl)}
              shape={g.shape} tone={g.tone} errorBars={errorBars} title={text.markTitle(p)} />
          )),
        )}
      </g>
      {(() => {
        const direct = groups.flatMap((g) => {
          const last = g.points.filter((p) => p.alpha <= aHi).reduce<LiftPoint | null>((b, p) => (!b || p.alpha > b.alpha ? p : b), null);
          return g.label && last ? [{ id: g.id, x: x(last.alpha) + 8, y: y(last.cl), text: g.label, tone: g.tone }] : [];
        });
        const ys = spreadLabels(direct.map((d) => d.y));
        return direct.map((d, i) => <text key={d.id} x={d.x} y={ys[i]! + 4} className={d.tone === "ink" ? "ink" : undefined}>{d.text}</text>);
      })()}
      {text.machLabel && <text x={width - M.r} y={f.top + 14} textAnchor="end" className="num">{text.machLabel}</text>}
      {noteLines.length > 0 && (
        <text x={M.l + 8} y={f.top + 30} className="ink">
          {noteLines.map((l, i) => <tspan key={i} x={M.l + 8} dy={i ? "1.25em" : 0}>{l}</tspan>)}
        </text>
      )}
    </svg>
  );
}

/** Split a line into runs of equal validity; neighbouring runs share their end point. */
function lineRuns<T extends { valid: boolean }>(points: T[]): { valid: boolean; points: T[] }[] {
  const out: { valid: boolean; points: T[] }[] = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last && last.valid === p.valid) last.points.push(p);
    else out.push({ valid: p.valid, points: last ? [last.points.at(-1)!, p] : [p] });
  }
  return out.filter((r) => r.points.length > 1);
}

/** Tick label with as many decimals as the tick needs (0.25 stays 0.25, never 0.3). */
function tickFormat(v: number): string {
  for (let d = 1; d <= 3; d++) if (Math.abs(v * 10 ** d - Math.round(v * 10 ** d)) < 1e-6) return v.toFixed(d);
  return v.toFixed(3);
}
