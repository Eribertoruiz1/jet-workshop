import { scaleLinear } from "d3-scale";
import { area, line } from "d3-shape";
import type { LiftPoint, PolarPoint } from "@jet-workshop/validation";
import { HatchPattern, MeasuredMark, XAxis, YAxis, bandRuns, niceTicks, type BandSample } from "./axes.tsx";

const W = 420;
const H = 300;
const M = { l: 60, r: 12, t: 16, b: 48 };

export interface PolarBandPoint extends BandSample {
  cl: number;
}

/** Drag polar at one Mach number: CL against CD, the model as a band. */
export function PolarChart({ band, measured, mach, modelNote }: { band: PolarBandPoint[]; measured: PolarPoint[]; mach: number; modelNote: string | null }) {
  const cdMax = Math.max(0.04, ...measured.map((p) => p.cd + p.uCd), ...band.filter((c) => c.valid).map((c) => c.max));
  const x = scaleLinear().domain([0, Math.ceil((cdMax * 1.1) / 0.01) * 0.01]).range([M.l, W - M.r]);
  const clLo = Math.min(-0.2, ...measured.map((p) => p.cl - 0.05));
  const clHi = Math.max(0.6, ...measured.map((p) => p.cl + 0.05));
  const y = scaleLinear().domain([clLo, clHi]).range([H - M.b, M.t]);
  const xMax = x.domain()[1]! * 1.5;
  const fill = area<PolarBandPoint>().y((d) => y(d.cl)).x0((d) => x(Math.min(d.min, xMax))).x1((d) => x(Math.min(d.max, xMax)));
  const edge = (key: "min" | "max") => line<PolarBandPoint>().y((d) => y(d.cl)).x((d) => x(Math.min(d[key], xMax)));
  const runs = bandRuns(band);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Drag polar at Mach ${mach.toFixed(3)}`}>
      <defs>
        <clipPath id="plot-polar"><rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} /></clipPath>
        <HatchPattern id="hatch-polar" />
      </defs>
      <XAxis scale={x} ticks={niceTicks(x.domain()[0]!, x.domain()[1]!, 5)} format={(v) => v.toFixed(2)} at={H - M.b} gridFrom={M.t} gridTo={H - M.b} label="Drag coefficient, CD" />
      <YAxis scale={y} ticks={niceTicks(clLo, clHi, 6)} format={(v) => v.toFixed(1)} at={M.l} gridFrom={M.l} gridTo={W - M.r} label="Lift coefficient, CL" />
      <g clipPath="url(#plot-polar)">
        {runs.map((r, i) =>
          r.valid ? (
            <g key={i}>
              <path d={fill(r.points) ?? ""} fill="var(--accent)" fillOpacity={0.18} stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--accent)" strokeWidth={0.8} />
            </g>
          ) : (
            <g key={i}>
              <title>Model outside its range</title>
              <path d={fill(r.points) ?? ""} fill="url(#hatch-polar)" stroke="none" />
              <path d={edge("min")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
              <path d={edge("max")(r.points) ?? ""} fill="none" stroke="var(--stop)" strokeWidth={1} strokeDasharray="5 4" />
            </g>
          ),
        )}
        {measured.map((p) => (
          <MeasuredMark key={`${p.series}-${p.pointId}`} x={x(p.cd)} y={y(p.cl)} ex0={x(p.cd - p.uCd)} ex1={x(p.cd + p.uCd)} ey0={y(p.cl - p.uCl)} ey1={y(p.cl + p.uCl)}
            title={`Measured (NACA, 1952): M ${p.mach.toFixed(3)}, CL ${p.cl.toFixed(3)} ± ${p.uCl.toFixed(3)}, CD ${p.cd.toFixed(4)} ± ${p.uCd.toFixed(4)}. Figure ${p.figure}.`} />
        ))}
      </g>
      <text x={W - M.r} y={M.t + 12} textAnchor="end">M <tspan className="num">{mach.toFixed(3)}</tspan></text>
      {modelNote && <text x={M.l + 8} y={M.t + 12} className="ink">{modelNote}</text>}
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
