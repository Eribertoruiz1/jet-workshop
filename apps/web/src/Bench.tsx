import { useMemo, useState } from "react";
import {
  TESTED_SWEEPS,
  bielatWing,
  geometry,
  liftCurveSlope,
  liftInRange,
  matchTestedWing,
  type TestedWingId,
  type WingBody,
} from "@jet-workshop/physics";
import { SYMBOL_WINDOW, kornMasonLockBand, reliability, transonicLimitMach, type Dataset, type Reliability } from "@jet-workshop/validation";
import { Planform } from "./Planform.tsx";
import { DragMachChart, type MachBandPoint } from "./charts/DragMachChart.tsx";
import { LiftChart, PolarChart, type LiftCurvePoint, type PolarBandPoint } from "./charts/SmallCharts.tsx";
import { useWidth } from "./charts/useWidth.ts";
import { sweepLabel } from "./format.ts";
import { useI18n } from "./i18n/i18n.tsx";

const TESTED: TestedWingId[] = ["10.8", "35", "47"];
const UNTESTED_MACHS = [0.5, 0.85, 0.95, 1.0, 1.1];

/** The free bench: the wing bench of spike 1, every control, the model band and the reliability strip. */
export function Bench({ data }: { data: Dataset | null }) {
  const { t } = useI18n();
  const [sweep, setSweep] = useState(35);
  const [aspect, setAspect] = useState(3.5);
  const [thickness, setThickness] = useState(0.04);
  const [cl, setCl] = useState(0.1);
  const [polarMach, setPolarMach] = useState(0.95);
  const [planRef, planW] = useWidth<HTMLDivElement>(360);
  const [dragRef, dragW] = useWidth<HTMLDivElement>(800);
  const [liftRef, liftW] = useWidth<HTMLDivElement>(380);
  const [polarRef, polarW] = useWidth<HTMLDivElement>(380);

  const wing: WingBody = useMemo(() => {
    const base = bielatWing("35");
    return { ...base, planform: { ...base.planform, sweepQuarterChordDeg: sweep, aspectRatio: aspect, thicknessRatio: thickness } };
  }, [sweep, aspect, thickness]);
  const tested = matchTestedWing(wing);

  const view = useMemo(() => {
    const band: MachBandPoint[] = [];
    for (let m = 0.5; m <= 1.15 + 1e-9; m += 0.0025) {
      const r = kornMasonLockBand(wing, { mach: m, cl });
      band.push({ mach: m, min: r.min, max: r.max, valid: r.valid, beyondLock: r.beyondLock });
    }
    const limit = transonicLimitMach(kornMasonLockBand, wing, cl);
    const segments = reliability(kornMasonLockBand, wing, tested, data, cl);
    const measured = tested && data ? data.polar.filter((p) => p.wing === tested && Math.abs(p.cl - cl) <= SYMBOL_WINDOW) : [];
    const faired = tested && data && Math.abs(cl) <= 0.02 ? data.faired.filter((s) => s.wing === tested) : [];
    return { band, limit, segments, measured, faired };
  }, [wing, cl, tested, data]);

  const machs = tested && data ? [...new Set(data.polar.filter((p) => p.wing === tested).map((p) => p.mach))].sort((a, b) => a - b) : UNTESTED_MACHS;
  const mach = machs.reduce((best, m) => (Math.abs(m - polarMach) < Math.abs(best - polarMach) ? m : best), machs[0] ?? 0.5);

  const small = useMemo(() => {
    const polar: PolarBandPoint[] = [];
    for (let c = -0.25; c <= 0.95 + 1e-9; c += 0.01) {
      const r = kornMasonLockBand(wing, { mach, cl: c });
      polar.push({ cl: c, min: r.min, max: r.max, valid: r.valid, beyondLock: r.beyondLock });
    }
    const here = kornMasonLockBand(wing, { mach, cl });
    const slope = liftCurveSlope(wing, mach);
    const lift: LiftCurvePoint[] = [];
    if (slope.valid) {
      for (let a = -3; a <= 14 + 1e-9; a += 0.25) {
        const c = slope.perDeg * (a - wing.airfoil.zeroLiftAngleDeg);
        lift.push({ alpha: a, cl: c, valid: liftInRange(wing, mach, c).valid });
      }
    }
    const pm = tested && data ? data.polar.filter((p) => p.wing === tested && Math.abs(p.mach - mach) < 1e-6) : [];
    const lm = tested && data ? data.lift.filter((p) => p.wing === tested && Math.abs(p.mach - mach) < 1e-6) : [];
    return { polar, lift, pm, lm, here, polarDrawn: polar.some((p) => !p.beyondLock), liftValid: slope.valid };
  }, [wing, mach, cl, tested, data]);

  const disagrees = view.segments.some((s) => s.disagrees);
  const pickWing = (id: TestedWingId) => {
    const w = bielatWing(id).planform;
    setSweep(w.sweepQuarterChordDeg);
    setAspect(w.aspectRatio);
    setThickness(w.thicknessRatio);
  };
  const stateText: Record<Reliability, string> = { validated: t("validated"), estimate: t("estimate"), "outside model range": t("outsideRange") };
  const g = geometry(wing);

  return (
    <div className="bench">
      <p className="lead">{t("benchLead")}</p>
      {!data && <p className="error">{t("dataError")}</p>}

      <div className="layout">
        <section className="column-left" aria-label={t("controlsGroup")}>
          <div className="figure" ref={planRef}>
            <Planform wing={wing} width={planW} text={{ ariaLabel: t("planformAria", { span: g.spanIn.toFixed(2), chord: g.rootChordIn.toFixed(2), sweep: sweep.toFixed(1) }), sweep: t("sweepMarkTech"), span: t("span"), rootChord: t("rootChord"), unit: t("inch") }} />
          </div>
          <div className="wings" role="group" aria-label={t("wingButtons")}>
            {TESTED.map((id) => (
              <button key={id} type="button" aria-pressed={tested === id} onClick={() => pickWing(id)}>
                {t("testedWing", { sweep: sweepLabel(TESTED_SWEEPS[id]) })}
              </button>
            ))}
          </div>
          <Slider id="sweep" label={t("sweepTech")} min={0} max={55} step={0.1} value={sweep} onChange={setSweep} display={`${sweep.toFixed(1)}°`} />
          <Slider id="aspect" label={t("aspectTech")} min={2.5} max={6} step={0.05} value={aspect} onChange={setAspect} display={`${aspect.toFixed(2)} b²/S`} />
          <Slider id="thickness" label={t("thicknessTech")} min={0.02} max={0.08} step={0.001} value={thickness} onChange={setThickness} display={`${(thickness * 100).toFixed(1)} ${t("thicknessUnit")}`} />
          <Slider id="cl" label={t("clTech")} min={-0.1} max={0.5} step={0.01} value={cl} onChange={setCl} display={`CL ${cl.toFixed(2)}`} />
        </section>

        <section className="column-right" aria-label={t("resultsGroup")}>
          <div className="figure" ref={dragRef}>
            <h2 className="panel-title">{t("dragTitle")}</h2>
            <DragMachChart
              width={dragW}
              xLabel={t("machTech")}
              yLabel={t("dragTech")}
              ariaLabel={t("dragAria")}
              band={view.band}
              limit={view.limit !== null ? { mach: view.limit, note: t("limitNote") } : null}
              measured={view.measured}
              markTitle={(p) => t("markDrag", { mach: p.mach.toFixed(3), cl: p.cl.toFixed(3), cd: p.cd.toFixed(4), u: p.uCd.toFixed(4), figure: p.figure })}
              curves={view.faired.length > 1 ? [{ id: "faired", points: view.faired.map((s) => ({ mach: s.mach, cd: s.cd0 })), tone: "ink-2", dotted: true, title: t("fairedTitle") }] : []}
              segments={view.segments}
              stripText={{
                title: t("stripTitle"),
                states: stateText,
                segment: (s) => t(s.n > 0 ? "segmentScored" : "segmentEmpty", { lo: s.lo.toFixed(2), hi: s.hi.toFixed(2), state: stateText[s.state], n: s.n }),
              }}
              note={t("chartNote", { cl: cl.toFixed(2), window: SYMBOL_WINDOW.toFixed(2) })}
            />
            <div className="legend">
              <span><svg width="14" height="10" aria-hidden="true"><circle cx="7" cy="5" r="3.6" fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.2" /></svg>{t("legendMeasured")}</span>
              <span><svg width="22" height="12" aria-hidden="true"><rect x="1" y="1" width="20" height="10" fill="var(--accent)" fillOpacity="0.18" stroke="var(--accent)" strokeWidth="0.8" /></svg>{t("legendBand")}</span>
              <span>
                <svg width="22" height="12" aria-hidden="true">
                  <defs><HatchSwatch /></defs>
                  <rect x="1" y="1" width="20" height="10" fill="url(#hatch-legend)" stroke="var(--stop)" strokeWidth="0.8" strokeDasharray="3 2" />
                </svg>
                {t("legendOutside")}
              </span>
              <span><svg width="22" height="10" aria-hidden="true"><line x1="1" x2="21" y1="5" y2="5" stroke="var(--ink-2)" strokeWidth="1" strokeDasharray="1 3" strokeLinecap="round" /></svg>{t("legendFaired")}</span>
            </div>
            <p className="band-note">{t("bandNote")}</p>
            <p className="readout">
              {t("readout", { mach: mach.toFixed(3), cl: cl.toFixed(2) })}{" "}
              <span className="num">{small.here.valid ? t("readoutValue", { min: small.here.min.toFixed(4), max: small.here.max.toFixed(4) }) : t("outsideRange")}</span>
              {small.here.valid && <> {t("readoutSpread", { spread: (small.here.max - small.here.min).toFixed(4) })}</>}
            </p>
            <p className="status" role="status">
              {!tested ? t("statusUntested") : disagrees ? t("statusDisagrees") : ""}
            </p>
          </div>

          <div className="mach-picker" role="group" aria-label={t("machPickerAria")}>
            <span>{tested ? t("machPickerTested") : t("machPicker")}</span>
            {machs.map((m) => (
              <button key={m} type="button" aria-pressed={m === mach} onClick={() => setPolarMach(m)}>
                {m.toFixed(3)}
              </button>
            ))}
          </div>
          <div className="small-charts">
            <div className="figure" ref={liftRef}>
              <h2 className="panel-title">{t("liftTitle")}</h2>
              <LiftChart
                width={liftW}
                curve={small.lift}
                groups={[{ id: "measured", points: small.lm, shape: "circle", tone: "ink" }]}
                modelNote={small.liftValid ? null : t("liftNote")}
                text={{ xLabel: t("alphaTech"), yLabel: t("liftTech"), ariaLabel: t("liftAria", { mach: mach.toFixed(3) }), machLabel: `M ${mach.toFixed(3)}`, markTitle: (p) => t("markLift", { mach: p.mach.toFixed(3), alpha: p.alpha.toFixed(2), cl: p.cl.toFixed(3), ucl: p.uCl.toFixed(3), figure: p.figure }) }}
              />
            </div>
            <div className="figure" ref={polarRef}>
              <h2 className="panel-title">{t("polarTitle")}</h2>
              <PolarChart
                width={polarW}
                band={small.polar}
                measured={small.pm}
                modelNote={small.polarDrawn ? null : t("polarNote")}
                text={{ xLabel: t("dragTech"), yLabel: t("liftTech"), ariaLabel: t("polarAria", { mach: mach.toFixed(3) }), machLabel: `M ${mach.toFixed(3)}`, markTitle: (p) => t("markPolar", { mach: p.mach.toFixed(3), cl: p.cl.toFixed(3), ucl: p.uCl.toFixed(3), cd: p.cd.toFixed(4), u: p.uCd.toFixed(4), figure: p.figure }) }}
              />
            </div>
          </div>
        </section>
      </div>

      <footer className="foot">{t("footer")}</footer>
    </div>
  );
}

function HatchSwatch() {
  return (
    <pattern id="hatch-legend" width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1={0} y1={0} x2={0} y2={4} stroke="var(--stop)" strokeWidth={1} strokeOpacity={0.7} />
    </pattern>
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
