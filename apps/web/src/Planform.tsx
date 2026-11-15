import { geometry, sweepAtDeg, type WingBody } from "@jet-workshop/physics";

const DEG = Math.PI / 180;
const W = 420;
const H = 250;

/** The wing in planform as a technical drawing: span, root chord and quarter-chord sweep dimensioned. */
export function Planform({ wing }: { wing: WingBody }) {
  const g = geometry(wing);
  const p = wing.planform;
  const half = g.spanIn / 2;
  const tanLE = Math.tan(sweepAtDeg(p, 0) * DEG);
  const tipLE = half * tanLE;
  const extentX = g.spanIn;
  const extentY = Math.max(g.rootChordIn, tipLE + g.tipChordIn);
  const scale = Math.min((W - 150) / extentX, (H - 74) / extentY);
  const cx = (W + 110) / 2;
  const top = 22;
  const X = (y: number) => cx + y * scale;
  const Y = (x: number) => top + x * scale;

  const outline = [
    [0, 0], [half, tipLE], [half, tipLE + g.tipChordIn], [0, g.rootChordIn], [-half, tipLE + g.tipChordIn], [-half, tipLE],
  ].map(([y, x]) => `${X(y!)},${Y(x!)}`).join(" ");

  const qRoot = 0.25 * g.rootChordIn;
  const qTip = tipLE + 0.25 * g.tipChordIn;
  const bodyHalf = wing.body.diameterIn / 2;
  const spanY = Y(extentY) + 26;
  const arcR = 46;
  const sweep = p.sweepQuarterChordDeg;
  const ax = X(0);
  const ay = Y(qRoot);
  const arc = (a: number) => [ax + arcR * Math.sin(a * DEG), ay + arcR * Math.cos(a * DEG)] as const;
  const [a0x, a0y] = arc(90);
  const [a1x, a1y] = arc(90 - sweep);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Wing planform: span ${g.spanIn.toFixed(2)} in, root chord ${g.rootChordIn.toFixed(2)} in, quarter-chord sweep ${sweep.toFixed(1)} deg`}>
      {/* body */}
      <rect x={X(-bodyHalf)} y={Y(-4)} width={bodyHalf * 2 * scale} height={(extentY + 6) * scale} fill="none" stroke="var(--grid)" />
      {/* wing */}
      <polygon points={outline} fill="none" stroke="var(--accent)" strokeWidth={1.6} />
      {/* quarter-chord line */}
      <polyline points={`${X(-half)},${Y(qTip)} ${X(0)},${Y(qRoot)} ${X(half)},${Y(qTip)}`} fill="none" stroke="var(--ink-2)" strokeWidth={0.8} strokeDasharray="6 3 1 3" />
      {/* centre line */}
      <line x1={X(0)} x2={X(0)} y1={Y(-6)} y2={Y(extentY) + 8} stroke="var(--ink-2)" strokeWidth={0.6} strokeDasharray="8 3 2 3" />

      {/* span */}
      <line x1={X(-half)} x2={X(-half)} y1={Y(tipLE + g.tipChordIn) + 4} y2={spanY + 4} stroke="var(--ink-2)" strokeWidth={0.6} />
      <line x1={X(half)} x2={X(half)} y1={Y(tipLE + g.tipChordIn) + 4} y2={spanY + 4} stroke="var(--ink-2)" strokeWidth={0.6} />
      <line x1={X(-half)} x2={X(half)} y1={spanY} y2={spanY} stroke="var(--ink)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={X(0)} y={spanY - 5} textAnchor="middle" className="ink">
        span <tspan className="num">{g.spanIn.toFixed(2)}</tspan> in
      </text>

      {/* root chord */}
      <line x1={X(0) - 4} x2={X(-half) - 24} y1={Y(0)} y2={Y(0)} stroke="var(--ink-2)" strokeWidth={0.6} />
      <line x1={X(0) - 4} x2={X(-half) - 24} y1={Y(g.rootChordIn)} y2={Y(g.rootChordIn)} stroke="var(--ink-2)" strokeWidth={0.6} />
      <line x1={X(-half) - 18} x2={X(-half) - 18} y1={Y(0)} y2={Y(g.rootChordIn)} stroke="var(--ink)" strokeWidth={0.8} markerStart="url(#arrow)" markerEnd="url(#arrow)" />
      <text x={X(-half) - 24} y={Y(g.rootChordIn / 2)} textAnchor="end" className="ink">
        <tspan x={X(-half) - 24} dy="-0.3em">root chord</tspan>
        <tspan x={X(-half) - 24} dy="1.3em"><tspan className="num">{g.rootChordIn.toFixed(2)}</tspan> in</tspan>
      </text>

      {/* sweep angle at the quarter chord, from the lateral axis */}
      <line x1={ax} x2={a0x + 8} y1={ay} y2={a0y} stroke="var(--ink-2)" strokeWidth={0.6} />
      <path d={`M ${a0x} ${a0y} A ${arcR} ${arcR} 0 0 ${sweep >= 0 ? 0 : 1} ${a1x} ${a1y}`} fill="none" stroke="var(--ink)" strokeWidth={0.8} />
      <text x={a0x + 4} y={a0y - 8} className="ink">
        <tspan className="num">{sweep.toFixed(1)}</tspan>° sweep, c/4
      </text>

      <defs>
        <marker id="arrow" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 8 4 L 0 7" fill="none" stroke="var(--ink)" strokeWidth={1} />
        </marker>
      </defs>
    </svg>
  );
}
