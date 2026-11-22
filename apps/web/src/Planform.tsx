import { geometry, sweepAtDeg, type WingBody } from "@jet-workshop/physics";
import { textWidth } from "./charts/useWidth.ts";

const DEG = Math.PI / 180;

export interface PlanformText {
  ariaLabel: string;
  /** Label after the sweep value, e.g. "° sweep, c/4" or "° de flecha" */
  sweep: string;
  /** Dimension labels; omitted in the plain drawing */
  span?: string;
  rootChord?: string;
  unit?: string;
}

/**
 * The wing in planform. Technical: span, root chord and quarter-chord sweep
 * dimensioned. Plain (the lesson): the wing, its centre line and the sweep angle only.
 */
export function Planform({ wing, width, text, plain = false, maxHeight = 260 }: { wing: WingBody; width: number; text: PlanformText; plain?: boolean; maxHeight?: number }) {
  const g = geometry(wing);
  const p = wing.planform;
  const half = g.spanIn / 2;
  const tanLE = Math.tan(sweepAtDeg(p, 0) * DEG);
  const tipLE = half * tanLE;
  const extentX = g.spanIn;
  const extentY = Math.max(g.rootChordIn, tipLE + g.tipChordIn);
  const W = width;
  const H = Math.round(Math.min(maxHeight, Math.max(180, W * 0.6)));
  const side = plain ? 24 : Math.min(150, W * 0.3);
  const scale = Math.min((W - side - 24) / extentX, (H - (plain ? 72 : 74)) / extentY);
  const cx = plain ? W / 2 : (W + side - 24) / 2;
  const top = plain ? 18 : 22;
  const X = (y: number) => cx + y * scale;
  const Y = (x: number) => top + x * scale;

  const outline = [
    [0, 0], [half, tipLE], [half, tipLE + g.tipChordIn], [0, g.rootChordIn], [-half, tipLE + g.tipChordIn], [-half, tipLE],
  ].map(([y, x]) => `${X(y!)},${Y(x!)}`).join(" ");

  const qRoot = 0.25 * g.rootChordIn;
  const qTip = tipLE + 0.25 * g.tipChordIn;
  const bodyHalf = wing.body.diameterIn / 2;
  const spanY = Y(extentY) + 26;
  const arcR = Math.min(46, half * scale * 0.55);
  const sweep = p.sweepQuarterChordDeg;
  const ax = X(0);
  const ay = Y(qRoot);
  const arc = (a: number) => [ax + arcR * Math.sin(a * DEG), ay + arcR * Math.cos(a * DEG)] as const;
  const [a0x, a0y] = arc(90);
  const [a1x, a1y] = arc(90 - sweep);
  /** The lesson names the wings as NACA did (35°); the bench shows the slider's tenth of a degree. */
  const value = plain && Number.isInteger(Math.round(sweep * 10) / 10) ? sweep.toFixed(0) : sweep.toFixed(1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={text.ariaLabel}>
      {/* body */}
      <rect x={X(-bodyHalf)} y={Y(-4)} width={bodyHalf * 2 * scale} height={(extentY + 6) * scale} fill="none" stroke="var(--grid)" />
      {/* wing */}
      <polygon points={outline} fill={plain ? "var(--accent)" : "none"} fillOpacity={plain ? 0.08 : undefined} stroke="var(--accent)" strokeWidth={1.6} />
      {/* quarter-chord line */}
      <polyline points={`${X(-half)},${Y(qTip)} ${X(0)},${Y(qRoot)} ${X(half)},${Y(qTip)}`} fill="none" stroke={plain ? "var(--ink)" : "var(--ink-2)"} strokeWidth={plain ? 1.4 : 0.8} strokeDasharray={plain ? "8 4" : "6 3 1 3"} />
      {/* centre line */}
      <line x1={X(0)} x2={X(0)} y1={Y(-6)} y2={Y(extentY) + 8} stroke="var(--ink-2)" strokeWidth={0.6} strokeDasharray="8 3 2 3" />

      {!plain && text.span && text.rootChord && (
        <g>
          {/* span */}
          <line x1={X(-half)} x2={X(-half)} y1={Y(tipLE + g.tipChordIn) + 4} y2={spanY + 4} stroke="var(--ink-2)" strokeWidth={0.6} />
          <line x1={X(half)} x2={X(half)} y1={Y(tipLE + g.tipChordIn) + 4} y2={spanY + 4} stroke="var(--ink-2)" strokeWidth={0.6} />
          <line x1={X(-half)} x2={X(half)} y1={spanY} y2={spanY} stroke="var(--ink)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={X(0)} y={spanY - 5} textAnchor="middle" className="ink">
            {text.span} <tspan className="num">{g.spanIn.toFixed(2)}</tspan> {text.unit}
          </text>

          {/* root chord */}
          <line x1={X(0) - 4} x2={X(-half) - 24} y1={Y(0)} y2={Y(0)} stroke="var(--ink-2)" strokeWidth={0.6} />
          <line x1={X(0) - 4} x2={X(-half) - 24} y1={Y(g.rootChordIn)} y2={Y(g.rootChordIn)} stroke="var(--ink-2)" strokeWidth={0.6} />
          <line x1={X(-half) - 18} x2={X(-half) - 18} y1={Y(0)} y2={Y(g.rootChordIn)} stroke="var(--ink)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
          <text x={X(-half) - 24} y={Y(g.rootChordIn / 2)} textAnchor="end" className="ink">
            <tspan x={X(-half) - 24} dy="-0.3em">{text.rootChord}</tspan>
            <tspan x={X(-half) - 24} dy="1.3em"><tspan className="num">{g.rootChordIn.toFixed(2)}</tspan> {text.unit}</tspan>
          </text>
        </g>
      )}

      {/* sweep angle at the quarter chord, from the lateral axis */}
      <line x1={ax} x2={a0x + 8} y1={ay} y2={a0y} stroke="var(--ink-2)" strokeWidth={0.6} />
      <path d={`M ${a0x} ${a0y} A ${arcR} ${arcR} 0 0 ${sweep >= 0 ? 0 : 1} ${a1x} ${a1y}`} fill="none" stroke="var(--ink)" strokeWidth={plain ? 1.2 : 0.8} />
      {plain ? (
        <text x={X(0)} y={Y(extentY) + 30} textAnchor="middle" className="ink big">
          <tspan className="num">{value}</tspan>{text.sweep}
        </text>
      ) : (
        <text x={Math.min(a0x + 4, W - 4 - textWidth(`${value}${text.sweep}`, 11))} y={a0y - 8} className="ink">
          <tspan className="num">{value}</tspan>{text.sweep}
        </text>
      )}

      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 8 4 L 0 7" fill="none" stroke="var(--ink)" strokeWidth={1} />
        </marker>
      </defs>
    </svg>
  );
}
