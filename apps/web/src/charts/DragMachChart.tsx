import { useId } from "react";
import { scaleLinear } from "d3-scale";
import { area } from "d3-shape";
import type { PolarPoint, Reliability, Segment } from "@jet-workshop/validation";
import { CHART_TEXT, HatchPattern, MeasuredMark, XAxis, YAxis, bandRuns, niceTicks, xAxisHeight, type BandSample, type MarkShape, type MarkTone } from "./axes.tsx";
import { spreadLabels, textWidth, wrapText } from "./useWidth.ts";

/** Mach axis: a little room left of M 0.50 so the symbols at the lowest test Mach number show whole. */
const MACH: [number, number] = [0.47, 1.15];
/** The reliability strip and the model start at the lowest test Mach number. */
const STRIP_FROM = 0.5;
const LINE = CHART_TEXT * 1.25;

export interface MachBandPoint extends BandSample {
  mach: number;
}

/** A curve through samples, drawn as a polyline; a stretch without data splits it. */
export interface MachCurve {
  id: string;
  points: { mach: number; cd: number }[];
  tone: MarkTone;
  /** Dotted (the bench's faired curve) or solid (the lesson's three curves) */
  dotted?: boolean;
  /** Direct label at the curve's right end */
  label?: string;
  title?: string;
  /** Do not join samples across this Mach stretch */
  gap?: [number, number];
}

export interface StripText {
  title: string;
  states: Record<Reliability, string>;
  /** Hover text of a segment */
  segment: (s: Segment) => string;
}

interface Props {
  width: number;
  xLabel: string;
  yLabel: string;
  ariaLabel: string;
  measured: PolarPoint[];
  /** Shape and tone of each symbol; circles in ink by default */
  markStyle?: (p: PolarPoint) => { shape: MarkShape; tone: MarkTone };
  markTitle?: (p: PolarPoint) => string;
  /** Error bars on the symbols (hidden in the lesson: it shows no statistics) */
  errorBars?: boolean;
  /** The model band; omitted, no band is drawn */
  band?: MachBandPoint[];
  curves?: MachCurve[];
  /** The reliability strip; omitted, no strip is drawn */
  segments?: Segment[];
  stripText?: StripText;
  /** Where the drag-rise model stops, with its note; omitted, nothing is drawn */
  limit?: { mach: number; note: string } | null;
  /** A short note at the top right */
  note?: string;
  /** A Mach stretch marked with a grid-coloured background */
  highlight?: { from: number; to: number };
  /** A vertical line at a Mach number, labelled at its top */
  vLine?: { mach: number; label: string };
  /** Direct labels beside points */
  labels?: { mach: number; cd: number; text: string; tone: MarkTone }[];
  /** Fixed top of the drag axis, so pictures that follow one another share a scale */
  yMax?: number;
}

const COLOR = { validated: "var(--ok)", estimate: "var(--warn)", "outside model range": "var(--stop)" } as const;

interface Row {
  lines: string[];
  x: number;
  anchor: "start" | "end";
  ink?: boolean;
}

export function DragMachChart(props: Props) {
  const { width: W, xLabel, yLabel, ariaLabel, measured, markStyle, markTitle, errorBars = true, band = [], curves = [], segments, stripText, limit, note, highlight, vLine, labels = [] } = props;
  const uid = useId().replace(/:/g, "");
  const narrow = W < 520;
  const labelRoom = curves.some((c) => c.label) || labels.length ? Math.max(...[...curves.map((c) => c.label ?? ""), ...labels.map((l) => l.text)].map((t) => textWidth(t, CHART_TEXT))) + 10 : 0;
  const M = { l: 48, r: Math.max(14, labelRoom) };
  const x = scaleLinear().domain(MACH).range([M.l, W - M.r]);

  // Rows of text above the plot, stacked: note, limit note, then the drag-axis label.
  const plotW = W - M.l - M.r;
  const rows: Row[] = [];
  if (note) rows.push({ lines: wrapText(note, W - 8, CHART_TEXT), x: W - 4, anchor: "end" });
  const lx = limit && limit.mach < MACH[1] ? x(limit.mach) : null;
  if (limit && lx !== null) {
    const right = W - 4 - lx >= lx - 4;
    const room = right ? W - 8 - lx : lx - 8;
    rows.push({ lines: wrapText(limit.note, Math.max(room, 150), CHART_TEXT), x: right ? Math.min(lx + 6, W - 150) : Math.max(lx - 6, 150), anchor: right ? "start" : "end", ink: true });
  }
  if (vLine) rows.push({ lines: [vLine.label], x: x(vLine.mach), anchor: "start", ink: true });
  const yLines = wrapText(yLabel, W - 8, CHART_TEXT);
  rows.push({ lines: yLines, x: 4, anchor: "start", ink: true });
  const rowY: number[] = [];
  let cursor = 14;
  for (const r of rows) {
    rowY.push(cursor);
    cursor += r.lines.length * LINE + 4;
  }
  const top = cursor + 6;
  const plotH = Math.round(Math.min(300, Math.max(190, plotW * 0.48)));
  const xLines = wrapText(xLabel, plotW, CHART_TEXT).length;
  const axisBottom = top + plotH;
  const stripY = axisBottom + xAxisHeight(xLines) + 14;
  const legendItems = segments && stripText ? (["validated", "estimate", "outside model range"] as const).map((k) => ({ k, text: stripText.states[k], w: 15 + textWidth(stripText.states[k], CHART_TEXT) + 16 })) : [];
  const legendRows: { k: Reliability; text: string; x: number; row: number }[] = [];
  {
    let lxp = M.l;
    let row = 0;
    for (const it of legendItems) {
      if (lxp + it.w > W - 4 && lxp > M.l) {
        row++;
        lxp = M.l;
      }
      legendRows.push({ k: it.k, text: it.text, x: lxp, row });
      lxp += it.w;
    }
  }
  const legendLines = legendRows.length ? Math.max(...legendRows.map((r) => r.row)) + 1 : 0;
  const H = segments ? stripY + 9 + 22 + legendLines * LINE : axisBottom + xAxisHeight(xLines);

  const validMax = Math.max(0, ...band.filter((c) => c.valid).map((c) => c.max));
  const dataMax = Math.max(0, ...measured.map((p) => p.cd + (errorBars ? p.uCd : 0)), ...curves.flatMap((c) => c.points.map((p) => p.cd)));
  const yMax = props.yMax ?? Math.max(0.03, Math.ceil((Math.max(validMax, dataMax) * 1.25) / 0.005) * 0.005);
  const y = scaleLinear().domain([0, yMax]).range([axisBottom, top]);
  const clampY = (v: number) => y(Math.min(v, yMax * 1.5));
  const fill = area<MachBandPoint>().x((d) => x(d.mach)).y0((d) => clampY(d.min)).y1((d) => clampY(d.max));
  const edge = (key: "min" | "max") => area<MachBandPoint>().x((d) => x(d.mach)).y0((d) => clampY(d[key])).y1((d) => clampY(d[key]));
  const runs = bandRuns(band);
  /** Runs of a curve between stretches without data; a lone sample cannot be drawn as a line and is left out. */
  const curveRuns = (c: MachCurve): { mach: number; cd: number }[][] => {
    const runs: { mach: number; cd: number }[][] = [];
    c.points.forEach((p, i) => {
      const prev = c.points[i - 1];
      const broken = !prev || (c.gap && prev.mach < c.gap[1] && p.mach > c.gap[0]);
      if (broken) runs.push([p]);
      else runs.at(-1)!.push(p);
    });
    return runs.filter((r) => r.length > 1);
  };
  const curvePath = (c: MachCurve): string => curveRuns(c).map((r) => r.map((p, i) => `${i ? "L" : "M"}${x(p.mach)},${y(p.cd)}`).join("")).join("");
  const curveEnd = (c: MachCurve) => curveRuns(c).at(-1)?.at(-1);
  const xTicks = niceTicks(STRIP_FROM, MACH[1], narrow ? 6 : 13);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={ariaLabel}>
      <defs>
        <clipPath id={`plot-${uid}`}>
          <rect x={M.l} y={top} width={plotW} height={plotH} />
        </clipPath>
        <HatchPattern id={`hatch-${uid}`} />
      </defs>
      {highlight && <rect x={x(highlight.from)} y={top} width={x(highlight.to) - x(highlight.from)} height={plotH} fill="var(--grid)" />}
      <XAxis scale={x} ticks={xTicks} format={(v) => v.toFixed(2)} at={axisBottom} gridFrom={top} gridTo={axisBottom} label={xLabel} />
      <YAxis scale={y} ticks={niceTicks(0, yMax, narrow ? 4 : 6)} format={(v) => v.toFixed(3)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label={yLabel} labelWidth={W - 8} />

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
        {curves.map((c) => (
          <path key={c.id} d={curvePath(c)} fill="none" stroke={`var(--${c.tone})`} strokeWidth={c.dotted ? 1 : c.tone === "ink" ? 2 : 1.4} strokeDasharray={c.dotted ? "1 3" : undefined} strokeLinecap="round" strokeLinejoin="round">
            {c.title && <title>{c.title}</title>}
          </path>
        ))}
        {measured.map((p) => {
          const st = markStyle?.(p);
          return (
            <MeasuredMark
              key={`${p.series}-${p.pointId}`}
              x={x(p.mach)}
              y={y(p.cd)}
              ey0={y(p.cd - p.uCd)}
              ey1={y(p.cd + p.uCd)}
              shape={st?.shape}
              tone={st?.tone}
              errorBars={errorBars}
              title={markTitle?.(p) ?? ""}
            />
          );
        })}
      </g>

      {(() => {
        const direct = [
          ...curves.flatMap((c) => {
            const end = curveEnd(c);
            return c.label && end ? [{ key: c.id, x: x(end.mach) + 6, y: y(end.cd), text: c.label, tone: c.tone }] : [];
          }),
          ...labels.map((l, i) => ({ key: `l${i}`, x: x(l.mach) + 8, y: y(l.cd), text: l.text, tone: l.tone })),
        ];
        const ys = spreadLabels(direct.map((d) => d.y));
        return direct.map((d, i) => (
          <text key={d.key} x={d.x} y={ys[i]! + 4} className={d.tone === "ink" ? "ink" : undefined}>{d.text}</text>
        ));
      })()}

      {vLine && <line x1={x(vLine.mach)} x2={x(vLine.mach)} y1={rowY[rows.findIndex((r) => r.lines[0] === vLine.label)]! + 4} y2={axisBottom} stroke="var(--ink)" strokeWidth={1} />}
      {limit && lx !== null && <line x1={lx} x2={lx} y1={top - 4} y2={axisBottom} stroke="var(--stop)" strokeWidth={0.8} strokeDasharray="2 3" />}

      {rows.map((r, i) => {
        if (r === rows.at(-1)) return null; // the drag-axis label is drawn by YAxis
        return (
          <text key={i} x={r.x} y={rowY[i]} textAnchor={r.anchor} className={r.ink ? "ink" : undefined}>
            {r.lines.map((l, j) => (
              <tspan key={j} x={r.x} dy={j ? "1.25em" : 0}>{l}</tspan>
            ))}
          </text>
        );
      })}

      {segments && stripText && (
        <g>
          <text x={M.l} y={stripY - 8} className="ink">{stripText.title}</text>
          {segments.map((s) => (
            <rect key={s.lo} x={x(s.lo)} y={stripY} width={Math.max(0, x(Math.min(s.hi, MACH[1])) - x(s.lo)) - 1} height={9} fill={COLOR[s.state]}>
              <title>{stripText.segment(s)}</title>
            </rect>
          ))}
          {legendRows.map((r) => (
            <g key={r.k} transform={`translate(${r.x}, ${stripY + 30 + r.row * LINE})`}>
              <rect x={0} y={-8} width={10} height={9} fill={COLOR[r.k]} />
              <text x={15} y={0}>{r.text}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
