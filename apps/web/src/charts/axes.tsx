import type { ScaleLinear } from "d3-scale";

interface AxisProps {
  scale: ScaleLinear<number, number>;
  ticks: number[];
  format: (v: number) => string;
  /** pixel position of the axis line */
  at: number;
  /** extent of grid lines across the plot */
  gridFrom: number;
  gridTo: number;
  label: string;
}

export function XAxis({ scale, ticks, format, at, gridFrom, gridTo, label }: AxisProps) {
  const [r0, r1] = scale.range() as [number, number];
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={scale(t)} x2={scale(t)} y1={gridFrom} y2={gridTo} stroke="var(--grid)" strokeWidth={1} />
          <text x={scale(t)} y={at + 15} textAnchor="middle" className="num">{format(t)}</text>
        </g>
      ))}
      <line x1={r0} x2={r1} y1={at} y2={at} stroke="var(--ink)" strokeWidth={1} />
      <text x={(r0 + r1) / 2} y={at + 32} textAnchor="middle" className="ink">{label}</text>
    </g>
  );
}

export function YAxis({ scale, ticks, format, at, gridFrom, gridTo, label }: AxisProps) {
  const [r0, r1] = scale.range() as [number, number];
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={gridFrom} x2={gridTo} y1={scale(t)} y2={scale(t)} stroke="var(--grid)" strokeWidth={1} />
          <text x={at - 6} y={scale(t) + 4} textAnchor="end" className="num">{format(t)}</text>
        </g>
      ))}
      <line x1={at} x2={at} y1={r0} y2={r1} stroke="var(--ink)" strokeWidth={1} />
      <text transform={`translate(${at - 44}, ${(r0 + r1) / 2}) rotate(-90)`} textAnchor="middle" className="ink">{label}</text>
    </g>
  );
}

export function niceTicks(lo: number, hi: number, approx: number): number[] {
  const raw = (hi - lo) / approx;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

/** One sample of the model band: the lowest and highest of the parasite variants, and the model's validity there. */
export interface BandSample {
  min: number;
  max: number;
  valid: boolean;
  /** Beyond Lock's own limit: not drawn at all */
  beyondLock: boolean;
}

/**
 * Split band samples into runs to draw: valid (flat fill) and outside the
 * model's range (hatched). Samples beyond Lock's limit, or not computed, end a
 * run and are not drawn. Neighbouring runs share their end sample, so the fill
 * has no gap where the model leaves its range.
 */
export function bandRuns<T extends BandSample>(samples: T[]): { valid: boolean; points: T[] }[] {
  const out: { valid: boolean; points: T[] }[] = [];
  let prev: T | null = null;
  for (const s of samples) {
    const drawn = !s.beyondLock && Number.isFinite(s.min) && Number.isFinite(s.max);
    if (!drawn) {
      prev = null;
      continue;
    }
    const last = out.at(-1);
    if (prev && last && last.valid === s.valid) last.points.push(s);
    else out.push({ valid: s.valid, points: prev ? [prev, s] : [s] });
    prev = s;
  }
  return out.filter((r) => r.points.length > 1);
}

/** Diagonal hatching in the stop colour: the model drawn where it is outside its range. */
export function HatchPattern({ id }: { id: string }) {
  return (
    <pattern id={id} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={6} stroke="var(--stop)" strokeWidth={1} strokeOpacity={0.55} />
    </pattern>
  );
}

/** Hollow measured symbol with error bars, in ink, as on a NACA figure. */
export function MeasuredMark({ x, y, ex0, ex1, ey0, ey1, title }: { x: number; y: number; ex0?: number; ex1?: number; ey0: number; ey1: number; title: string }) {
  return (
    <g>
      <title>{title}</title>
      <line x1={x} x2={x} y1={ey0} y2={ey1} stroke="var(--ink)" strokeWidth={0.9} />
      <line x1={x - 3} x2={x + 3} y1={ey0} y2={ey0} stroke="var(--ink)" strokeWidth={0.9} />
      <line x1={x - 3} x2={x + 3} y1={ey1} y2={ey1} stroke="var(--ink)" strokeWidth={0.9} />
      {ex0 !== undefined && ex1 !== undefined && <line x1={ex0} x2={ex1} y1={y} y2={y} stroke="var(--ink)" strokeWidth={0.9} />}
      <circle cx={x} cy={y} r={3.6} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.2} />
    </g>
  );
}
