import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { FairedSample, PolarPoint, Segment } from "@jet-workshop/validation";
import { MeasuredMark, XAxis, YAxis, niceTicks } from "./axes.tsx";

const W = 860;
const H = 430;
const M = { l: 70, r: 16, t: 34, b: 112 };
const MACH: [number, number] = [0.5, 1.15];

export interface CurvePoint {
  mach: number;
  cd: number;
  valid: boolean;
}

interface Props {
  curve: CurvePoint[];
  limitMach: number | null;
  measured: PolarPoint[];
  faired: FairedSample[];
  segments: Segment[];
  clSelected: number;
}

const COLOR = { validated: "var(--ok)", estimate: "var(--warn)", "outside model range": "var(--stop)" } as const;

export function DragMachChart({ curve, limitMach, measured, faired, segments, clSelected }: Props) {
  const x = scaleLinear().domain(MACH).range([M.l, W - M.r]);
  const validMax = Math.max(0, ...curve.filter((c) => c.valid).map((c) => c.cd));
  const dataMax = Math.max(0, ...measured.map((p) => p.cd + p.uCd), ...faired.map((s) => s.cd0));
  const yMax = Math.max(0.03, Math.ceil((Math.max(validMax, dataMax) * 1.25) / 0.005) * 0.005);
  const y = scaleLinear().domain([0, yMax]).range([H - M.b, M.t]);
  const path = line<CurvePoint>().x((d) => x(d.mach)).y((d) => y(Math.min(d.cd, yMax * 1.5)));
  const valid = curve.filter((c) => c.valid);
  const beyond = limitMach === null ? [] : curve.filter((c) => c.mach >= limitMach - 1e-9);
  const fairedPath = line<FairedSample>().x((d) => x(d.mach)).y((d) => y(d.cd0));
  const stripY = H - M.b + 62;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Drag coefficient against Mach number">
      <defs>
        <clipPath id="plot-drag">
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} />
        </clipPath>
      </defs>
      <XAxis scale={x} ticks={niceTicks(MACH[0], MACH[1], 13)} format={(v) => v.toFixed(2)} at={H - M.b} gridFrom={M.t} gridTo={H - M.b} label="Mach number, M" />
      <YAxis scale={y} ticks={niceTicks(0, yMax, 6)} format={(v) => v.toFixed(3)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label="Drag coefficient, CD" />

      <g clipPath="url(#plot-drag)">
        {faired.length > 1 && (
          <path d={fairedPath(faired) ?? ""} fill="none" stroke="var(--ink-2)" strokeWidth={1} strokeDasharray="1 3" strokeLinecap="round">
            <title>NACA faired curve (1952), drag coefficient at zero lift, figure 9 of NACA RM L52B08</title>
          </path>
        )}
        <path d={path(valid) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {beyond.length > 1 && <path d={path(beyond) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1.6} strokeDasharray="6 4" />}
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

      {limitMach !== null && limitMach < MACH[1] && (
        <g>
          <line x1={x(limitMach)} x2={x(limitMach)} y1={M.t - 4} y2={H - M.b} stroke="var(--stop)" strokeWidth={0.8} strokeDasharray="2 3" />
          <text x={limitMach > 0.9 ? x(limitMach) - 6 : x(limitMach) + 6} y={M.t - 12} textAnchor={limitMach > 0.9 ? "end" : "start"} className="ink">
            Beyond this Mach number the drag-rise model is not valid. Measured points continue; the model stops.
          </text>
        </g>
      )}

      <text x={W - M.r} y={M.t + 14} textAnchor="end">
        model at CL <tspan className="num">{clSelected.toFixed(2)}</tspan>
        {measured.length ? <tspan>; symbols within <tspan className="num">0.06</tspan> of it</tspan> : null}
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
