import { useMemo, useState } from "react";
import {
  bielatWing,
  kornMasonLock,
  liftCurveSlope,
  matchTestedWing,
  type TestedWingId,
  type WingBody,
} from "@jet-workshop/physics";
import { modelLimitMach, reliability } from "@jet-workshop/validation";
import { loadBundledData } from "./data.ts";
import { Planform } from "./Planform.tsx";
import { DragMachChart, type CurvePoint } from "./charts/DragMachChart.tsx";
import { LiftChart, PolarChart, type LiftCurvePoint, type PolarCurvePoint } from "./charts/SmallCharts.tsx";

const DATA = loadBundledData();
const TESTED: { id: TestedWingId; label: string }[] = [
  { id: "10.8", label: "NACA wing · 10.8° sweep" },
  { id: "35", label: "NACA wing · 35° sweep" },
  { id: "47", label: "NACA wing · 47° sweep" },
];
const UNTESTED_MACHS = [0.5, 0.85, 0.95, 1.0, 1.1];
/** Measured symbols shown on the drag-vs-Mach chart: within this of the selected CL. */
const SYMBOL_WINDOW = 0.06;

export function App() {
  const [sweep, setSweep] = useState(35);
  const [aspect, setAspect] = useState(3.5);
  const [thickness, setThickness] = useState(0.04);
  const [cl, setCl] = useState(0.1);
  const [polarMach, setPolarMach] = useState(0.95);

  const wing: WingBody = useMemo(() => {
    const base = bielatWing("35");
    return { ...base, planform: { ...base.planform, sweepQuarterChordDeg: sweep, aspectRatio: aspect, thicknessRatio: thickness } };
  }, [sweep, aspect, thickness]);
  const tested = matchTestedWing(wing);
  const data = DATA.ok ? DATA.data : null;

  const view = useMemo(() => {
    const curve: CurvePoint[] = [];
    for (let m = 0.5; m <= 1.15 + 1e-9; m += 0.0025) {
      const r = kornMasonLock(wing, { mach: m, cl });
      curve.push({ mach: m, cd: r.cd, valid: r.valid });
    }
    const limit = modelLimitMach(kornMasonLock, wing, cl);
    const segments = reliability(kornMasonLock, wing, tested, data, cl);
    const measured = tested && data ? data.polar.filter((p) => p.wing === tested && Math.abs(p.cl - cl) <= SYMBOL_WINDOW) : [];
    const faired = tested && data && Math.abs(cl) <= 0.02 ? data.faired.filter((s) => s.wing === tested) : [];
    return { curve, limit, segments, measured, faired };
  }, [wing, cl, tested, data]);

  const machs = tested && data ? [...new Set(data.polar.filter((p) => p.wing === tested).map((p) => p.mach))].sort((a, b) => a - b) : UNTESTED_MACHS;
  const mach = machs.reduce((best, m) => (Math.abs(m - polarMach) < Math.abs(best - polarMach) ? m : best), machs[0] ?? 0.5);

  const small = useMemo(() => {
    const polar: PolarCurvePoint[] = [];
    for (let c = -0.25; c <= 0.95 + 1e-9; c += 0.01) {
      const r = kornMasonLock(wing, { mach, cl: c });
      polar.push({ cl: c, cd: r.cd, valid: r.valid });
    }
    const slope = liftCurveSlope(wing, mach);
    const lift: LiftCurvePoint[] = slope.valid
      ? [-3, 14].map((a) => ({ alpha: a, cl: slope.perDeg * (a - wing.airfoil.zeroLiftAngleDeg) }))
      : [];
    const pm = tested && data ? data.polar.filter((p) => p.wing === tested && Math.abs(p.mach - mach) < 1e-6) : [];
    const lm = tested && data ? data.lift.filter((p) => p.wing === tested && Math.abs(p.mach - mach) < 1e-6) : [];
    return { polar, lift, pm, lm, liftNote: slope.valid ? null : "Lift-curve model not defined at M ≥ 1" };
  }, [wing, mach, tested, data]);

  const disagrees = view.segments.some((s) => s.disagrees);
  const pickWing = (id: TestedWingId) => {
    const w = bielatWing(id).planform;
    setSweep(w.sweepQuarterChordDeg);
    setAspect(w.aspectRatio);
    setThickness(w.thicknessRatio);
  };

  return (
    <main className="bench">
      <header className="head">
        <h1>Wing bench</h1>
        <p>Three wings measured by NACA in 1952. One model. See where they agree.</p>
      </header>
      {!DATA.ok && <p className="error">Could not load validation data.</p>}

      <div className="layout">
        <section className="column-left" aria-label="Wing and controls">
          <div className="figure">
            <Planform wing={wing} />
          </div>
          <div className="wings" role="group" aria-label="Tested wings">
            {TESTED.map((t) => (
              <button key={t.id} type="button" aria-pressed={tested === t.id} onClick={() => pickWing(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <Slider id="sweep" label="Quarter-chord sweep" min={0} max={55} step={0.1} value={sweep} onChange={setSweep} display={`${sweep.toFixed(1)}°`} />
          <Slider id="aspect" label="Aspect ratio" min={2.5} max={6} step={0.05} value={aspect} onChange={setAspect} display={`${aspect.toFixed(2)} b²/S`} />
          <Slider id="thickness" label="Thickness ratio" min={0.02} max={0.08} step={0.001} value={thickness} onChange={setThickness} display={`${(thickness * 100).toFixed(1)} % chord`} />
          <Slider id="cl" label="Lift coefficient" min={-0.1} max={0.5} step={0.01} value={cl} onChange={setCl} display={`CL ${cl.toFixed(2)}`} />
        </section>

        <section className="column-right" aria-label="Results">
          <div className="figure">
            <h2 className="panel-title">Drag coefficient vs Mach</h2>
            <DragMachChart curve={view.curve} limitMach={view.limit} measured={view.measured} faired={view.faired} segments={view.segments} clSelected={cl} />
            <div className="legend">
              <span><svg width="14" height="10" aria-hidden="true"><circle cx="7" cy="5" r="3.6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" /></svg>Measured (NACA, 1952)</span>
              <span><svg width="22" height="10" aria-hidden="true"><line x1="1" x2="21" y1="5" y2="5" stroke="var(--accent)" strokeWidth="2" /></svg>Model</span>
              <span><svg width="22" height="10" aria-hidden="true"><line x1="1" x2="21" y1="5" y2="5" stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="1 3" strokeLinecap="round" /></svg>NACA faired curve (1952), at CL 0</span>
            </div>
            <p className="status" role="status">
              {!tested
                ? "No measured data for this wing. Curve shows the model only."
                : disagrees
                  ? "Measured data here disagrees with the model by more than the published precedent."
                  : ""}
            </p>
          </div>

          <div className="mach-picker" role="group" aria-label="Tested Mach number for the small charts">
            <span>{tested ? "Tested Mach number" : "Mach number"}</span>
            {machs.map((m) => (
              <button key={m} type="button" aria-pressed={m === mach} onClick={() => setPolarMach(m)}>
                {m.toFixed(3)}
              </button>
            ))}
          </div>
          <div className="small-charts">
            <div className="figure">
              <h2 className="panel-title">Lift curve</h2>
              <LiftChart curve={small.lift} measured={small.lm} mach={mach} modelNote={small.liftNote} />
            </div>
            <div className="figure">
              <h2 className="panel-title">Drag polar</h2>
              <PolarChart curve={small.polar} measured={small.pm} mach={mach} />
            </div>
          </div>
        </section>
      </div>

      <footer className="foot">
        Measured data: R. P. Bielat, NACA RM L52B08 (1952), Langley 8-foot transonic tunnel. Digitized twice from figures; error bars include digitization uncertainty. Model: Korn–Mason with Lock's fourth-power law; Oswald efficiency after Raymer. Validation bands after Gur, Mason &amp; Schetz, J. Aircraft 47(4), 2010.
      </footer>
    </main>
  );
}

function Slider({ id, label, min, max, step, value, onChange, display }: { id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; display: string }) {
  return (
    <div className="control">
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{display}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
