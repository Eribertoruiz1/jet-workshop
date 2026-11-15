import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import type { LiftPoint, PolarPoint } from "@jet-workshop/validation";
import { MeasuredMark, XAxis, YAxis, niceTicks } from "./axes.tsx";

const W = 420;
const H = 300;
const M = { l: 60, r: 12, t: 16, b: 48 };

export interface PolarCurvePoint {
  cl: number;
  cd: number;
  valid: boolean;
}

/** Drag polar at one Mach number: CL against CD. */
export function PolarChart({ curve, measured, mach }: { curve: PolarCurvePoint[]; measured: PolarPoint[]; mach: number }) {
  const cdMax = Math.max(0.04, ...measured.map((p) => p.cd + p.uCd), ...curve.filter((c) => c.valid).map((c) => c.cd));
  const x = scaleLinear().domain([0, Math.ceil((cdMax * 1.1) / 0.01) * 0.01]).range([M.l, W - M.r]);
  const clLo = Math.min(-0.2, ...measured.map((p) => p.cl - 0.05));
  const clHi = Math.max(0.6, ...measured.map((p) => p.cl + 0.05));
  const y = scaleLinear().domain([clLo, clHi]).range([H - M.b, M.t]);
  const path = line<PolarCurvePoint>().x((d) => x(d.cd)).y((d) => y(d.cl));
  const runs = splitRuns(curve);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Drag polar at Mach ${mach.toFixed(3)}`}>
      <defs>
        <clipPath id="plot-polar"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath>
      </defs>
      <XAxis scale={x} ticks={niceTicks(x.domain()[0]!, x.domain()[1]!, 5)} format={(v) => v.toFixed(2)} at={H - M.b} gridFrom={M.t} gridTo={H - M.b} label="Drag coefficient, CD" />
      <YAxis scale={y} ticks={niceTicks(clLo, clHi, 6)} format={(v) => v.toFixed(1)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label="Lift coefficient, CL" />
      <g clipPath="url(#plot-polar)">
        {runs.map((r, i) => (
          <path key={i} d={path(r.points) ?? ""} fill="none" stroke={r.valid ? "var(--accent)" : "var(--stop)"} strokeWidth={r.valid ? 1.8 : 1.4} strokeDasharray={r.valid ? undefined : "5 4"} />
        ))}
        {measured.map((p) => (
          <MeasuredMark key={`${p.series}-${p.pointId}`} x={x(p.cd)} y={y(p.cl)} ex0={x(p.cd - p.uCd)} ex1={x(p.cd + p.uCd)} ey0={y(p.cl - p.uCl)} ey1={y(p.cl + p.uCl)}
            title={`Measured (NACA, 1952): M ${p.mach.toFixed(3)}, CL ${p.cl.toFixed(3)} ± ${p.uCl.toFixed(3)}, CD ${p.cd.toFixed(4)} ± ${p.uCd.toFixed(4)}. Figure ${p.figure}.`} />
        ))}
      </g>
      <text x={W - M.r} y={M.t + 12} textAnchor="end">M <tspan className="num">{mach.toFixed(3)}</tspan></text>
    </svg>
  );
}

export interface LiftCurvePoint {
  alpha: number;
  cl: number;
}

/** Lift curve at one Mach number: CL against angle of attack. */
export function LiftChart({ curve, measured, mach, modelNote }: { curve: LiftCurvePoint[]; measured: LiftPoint[]; mach: number; modelNote: string | null }) {
  const aLo = Math.min(-3, ...measured.map((p) => p.alpha - 0.5));
  const aHi = Math.max(14, ...measured.map((p) => p.alpha + 0.5));
  const x = scaleLinear().domain([aLo, aHi]).range([M.l, W - M.r]);
  const clLo = Math.min(-0.3, ...measured.map((p) => p.cl - 0.05));
  const clHi = Math.max(1.0, ...measured.map((p) => p.cl + 0.05));
  const y = scaleLinear().domain([clLo, clHi]).range([H - M.b, M.t]);
  const path = line<LiftCurvePoint>().x((d) => x(d.alpha)).y((d) => y(d.cl));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Lift curve at Mach ${mach.toFixed(3)}`}>
      <defs>
        <clipPath id="plot-lift"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath>
      </defs>
      <XAxis scale={x} ticks={niceTicks(aLo, aHi, 6)} format={(v) => v.toFixed(0)} at={H - M.b} gridFrom={M.t} gridTo={H - M.b} label="Angle of attack, deg" />
      <YAxis scale={y} ticks={niceTicks(clLo, clHi, 6)} format={(v) => v.toFixed(1)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label="Lift coefficient, CL" />
      <g clipPath="url(#plot-lift)">
        {curve.length > 1 && <path d={path(curve) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={1.8} />}
        {measured.map((p) => (
          <MeasuredMark key={`${p.series}-${p.pointId}`} x={x(p.alpha)} y={y(p.cl)} ex0={x(p.alpha - p.uAlpha)} ex1={x(p.alpha + p.uAlpha)} ey0={y(p.cl - p.uCl)} ey1={y(p.cl + p.uCl)}
            title={`Measured (NACA, 1952): M ${p.mach.toFixed(3)}, alpha ${p.alpha.toFixed(2)} deg, CL ${p.cl.toFixed(3)} ± ${p.uCl.toFixed(3)}. Figure ${p.figure}.`} />
        ))}
      </g>
      <text x={W - M.r} y={M.t + 12} textAnchor="end">M <tspan className="num">{mach.toFixed(3)}</tspan></text>
      {modelNote && <text x={M.l + 8} y={M.t + 12} className="ink">{modelNote}</text>}
    </svg>
  );
}

function splitRuns(curve: PolarCurvePoint[]): { valid: boolean; points: PolarCurvePoint[] }[] {
  const out: { valid: boolean; points: PolarCurvePoint[] }[] = [];
  for (const c of curve) {
    const last = out.at(-1);
    if (last && last.valid === c.valid) last.points.push(c);
    else out.push({ valid: c.valid, points: last ? [last.points.at(-1)!, c] : [c] });
  }
  return out;
}
