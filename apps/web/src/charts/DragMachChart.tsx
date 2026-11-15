import { scaleLinear } from "d3-scale";
import { area } from "d3-shape";
import type { FairedSample, PolarPoint, Segment } from "@jet-workshop/validation";
import { HatchPattern, MeasuredMark, XAxis, YAxis, bandRuns, niceTicks, type BandSample } from "./axes.tsx";

const W = 860;
const H = 430;
const M = { l: 70, r: 16, t: 46, b: 112 };
/** Mach axis: a little room left of M 0.50 so the symbols at the lowest test Mach number show whole. */
const MACH: [number, number] = [0.47, 1.15];
/** The reliability strip and the model start at the lowest test Mach number. */
const STRIP_FROM = 0.5;

export interface MachBandPoint extends BandSample {
  mach: number;
}

interface Props {
  band: MachBandPoint[];
  limitMach: number | null;
  measured: PolarPoint[];
  faired: FairedSample[];
  segments: Segment[];
  clSelected: number;
  /** Measured symbols drawn: within this of the selected CL */
  symbolWindow: number;
  /** Symbols the reliability strip scores: within this of the selected CL */
  stripWindow: number;
}

/** The red limit line and its note, on the side of the line with more room, in two lines. */
function LimitNote({ x }: { x: number }) {
  const right = W - M.r - x >= x - M.l;
  const tx = right ? x + 6 : x - 6;
  return (
    <g>
      <line x1={x} x2={x} y1={M.t - 32} y2={H - M.b} stroke="var(--stop)" strokeWidth={0.8} strokeDasharray="2 3" />
      <text x={tx} y={M.t - 22} textAnchor={right ? "start" : "end"} className="ink">
        <tspan x={tx}>Beyond this Mach number the drag-rise model is not valid.</tspan>
        <tspan x={tx} dy="1.25em">Measured points continue; the model stops.</tspan>
      </text>
    </g>
  );
}

const COLOR = { validated: "var(--ok)", estimate: "var(--warn)", "outside model range": "var(--stop)" } as const;

export function DragMachChart({ band, limitMach, measured, faired, segments, clSelected, symbolWindow, stripWindow }: Props) {
  const x = scaleLinear().domain(MACH).range([M.l, W - M.r]);
  const validMax = Math.max(0, ...band.filter((c) => c.valid).map((c) => c.max));
  const dataMax = Math.max(0, ...measured.map((p) => p.cd + p.uCd), ...faired.map((s) => s.cd0));
  const yMax = Math.max(0.03, Math.ceil((Math.max(validMax, dataMax) * 1.25) / 0.005) * 0.005);
  const y = scaleLinear().domain([0, yMax]).range([H - M.b, M.t]);
  const clampY = (v: number) => y(Math.min(v, yMax * 1.5));
  const fill = area<MachBandPoint>().x((d) => x(d.mach)).y0((d) => clampY(d.min)).y1((d) => clampY(d.max));
  const edge = (key: "min" | "max") => area<MachBandPoint>().x((d) => x(d.mach)).y0((d) => clampY(d[key])).y1((d) => clampY(d[key]));
  const runs = bandRuns(band);
  const faiPath = faired.length > 1 ? faired.map((d, i) => `${i ? "L" : "M"}${x(d.mach)},${y(d.cd0)}`).join("") : "";
  const stripY = H - M.b + 62;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Drag coefficient against Mach number">
      <defs>
        <clipPath id="plot-drag">
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
        </clipPath>
        <HatchPattern id="hatch-drag" />
      </defs>
      <XAxis scale={x} ticks={niceTicks(STRIP_FROM, MACH[1], 13)} format={(v) => v.toFixed(2)} at={H - M.b} gridFrom={M.t} gridTo={H - M.b} label="Mach number, M" />
      <YAxis scale={y} ticks={niceTicks(0, yMax, 6)} format={(v) => v.toFixed(3)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label="Drag coefficient, CD" />

      <g clipPath="url(#plot-drag)">
        {runs.map((r, i) =>
          r.valid ? (
            <g key={i}>
              <path d={fill(r.points) ?? ""} fill="var(--accent)" fillOpacity={0.18} stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
            </g>
          ) : (
            <g key={i}>
              <title>Model outside its range (the reliability strip gives the reason)</title>
              <path d={fill(r.points) ?? ""} fill="url(#hatch-drag)" stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
            </g>
          ),
        )}
        {faiPath && (
          <path d={faiPath} fill="none" stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="1 3" strokeLinecap="round">
            <title>NACA faired curve (1952), drag coefficient at zero lift, figure 9 of NACA RM L52B08</title>
          </path>
        )}
        {measured.map((p) => (
          <MeasuredMark
            key={`${p.series}-${p.pointId}`}
            x={x(p.mach)}
            y={y(p.cd)}
            ey0={y(p.cd - p.uCd)}
            ey1={y(p.cd + p.uCd)}
            title={`Measured (NACA, 1952): M ${p.mach.toFixed(3)}, CL ${p.cl.toFixed(3)}, CD ${p.cd.toFixed(4)} ± ${p.uCd.toFixed(4)}. NACA RM L52B08, figure ${p.figure}.`}
          />
        ))}
      </g>

      {limitMach !== null && limitMach < MACH[1] && <LimitNote x={x(limitMach)} />}

      <text x={W - M.r} y={M.t + 14} textAnchor="end">
        model at CL <tspan className="num">{clSelected.toFixed(2)}</tspan>
        {segments.some((s) => s.n > 0) || measured.length ? (
          <tspan>
            ; symbols drawn within <tspan className="num">{symbolWindow.toFixed(2)}</tspan>, strip scores those within <tspan className="num">{stripWindow.toFixed(2)}</tspan>
          </tspan>
        ) : null}
      </text>

      {/* Model reliability strip, computed by the scoring function */}
      <text x={M.l} y={stripY - 8} className="ink">Model reliability</text>
      {segments.map((s) => (
        <rect key={s.lo} x={x(s.lo)} y={stripY} width={Math.max(0, x(Math.min(s.hi, MACH[1])) - x(s.lo)) - 1} height={9} fill={COLOR[s.state]}>
          <title>{`M ${s.lo.toFixed(2)}–${s.hi.toFixed(2)}: ${s.state}. ${s.reason}`}</title>
        </rect>
      ))}
      <g transform={`translate(${W - M.r - 360}, ${stripY + 30})`}>
        {(["validated", "estimate", "outside model range"] as const).map((k, i) => (
          <g key={k} transform={`translate(${i * 120}, 0)`}>
            <rect x={0} y={-8} width={10} height={9} fill={COLOR[k]} />
            <text x={15} y={0}>{k}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
