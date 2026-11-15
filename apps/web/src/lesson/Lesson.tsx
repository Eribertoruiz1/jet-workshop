import { useMemo, useState, type ReactNode } from "react";
import { TESTED_SWEEPS, bielatWing, type TestedWingId } from "@jet-workshop/physics";
import { kornMasonLockBand, type Dataset, type PolarPoint } from "@jet-workshop/validation";
import { Planform } from "../Planform.tsx";
import { DragMachChart, type MachBandPoint } from "../charts/DragMachChart.tsx";
import { LiftChart } from "../charts/SmallCharts.tsx";
import type { MarkShape, MarkTone } from "../charts/axes.tsx";
import { useWidth } from "../charts/useWidth.ts";
import { mach2, percent0, ratio1, sweepLabel } from "../format.ts";
import { Rich, useI18n, type Vars } from "../i18n/i18n.tsx";
import type { StringKey } from "../i18n/strings.ts";
import {
  GAP_FROM,
  GAP_TO,
  LESSON_CL,
  LOW_MACH,
  WALL_FROM,
  WALL_MACH,
  WALL_TO,
  WINGS,
  dragRise,
  drawnSymbols,
  fairedCurve,
  formulaAgreement,
  liftLoss,
  sweepDragCut,
  wallRatio,
} from "./facts.ts";

/** Steps after the cover. */
export const STEPS = 8;

const SHAPE: Record<TestedWingId, MarkShape> = { "10.8": "circle", "35": "square", "47": "triangle" };
const label = (w: TestedWingId): string => sweepLabel(TESTED_SWEEPS[w]);

/** The figures of the text, computed once from the dataset; null if any cannot be computed. */
function computeFacts(data: Dataset | null) {
  if (!data) return null;
  const wall = wallRatio(data);
  const cut = sweepDragCut(data);
  const rise = dragRise(data);
  const lift = liftLoss(data);
  const agree = Object.fromEntries(WINGS.map((w) => [w, formulaAgreement(data, w)])) as Record<TestedWingId, ReturnType<typeof formulaAgreement>>;
  if (!wall || !cut || !lift || WINGS.some((w) => !agree[w])) return null;
  const drawn = Object.fromEntries(WINGS.map((w) => [w, drawnSymbols(data, w)])) as Record<TestedWingId, PolarPoint[]>;
  const yMax = Math.ceil((Math.max(...WINGS.flatMap((w) => drawn[w].map((p) => p.cd))) * 1.15) / 0.005) * 0.005;
  return { wall: wall.value, cut: cut.value, rise: rise.value, lift: lift.value, agree, drawn, yMax, data };
}

type Facts = NonNullable<ReturnType<typeof computeFacts>>;

export function Lesson({ data, onBench }: { data: Dataset | null; onBench: () => void }) {
  const { t } = useI18n();
  const facts = useMemo(() => computeFacts(data), [data]);
  const [step, setStep] = useState(0);
  const [sweep, setSweep] = useState(TESTED_SWEEPS["10.8"]);
  const [wing, setWing] = useState<TestedWingId>("10.8");
  const [prev, setPrev] = useState<TestedWingId | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [figRef, figW] = useWidth<HTMLDivElement>(560);

  if (!facts) return <p className="error">{t("dataError")}</p>;

  const pick = (w: TestedWingId) => {
    if (w === wing) return;
    setPrev(wing);
    setWing(w);
  };
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS, n)));
    window.scrollTo({ top: 0 });
  };

  if (step === 0) {
    return (
      <div className="lesson cover">
        <div className="cover-text">
          <h1 className="cover-title">{t("s0Title")}</h1>
          <p className="lesson-body"><Rich k="s0Text" /></p>
        </div>
        <div className="lesson-figure" ref={figRef}>
          <Planform wing={bielatWing("35")} width={figW} plain maxHeight={360} text={{ ariaLabel: t("s0Aria", { sweep: label("35") }), sweep: t("sweepMark") }} />
        </div>
        <div className="lesson-nav">
          <button type="button" className="primary" onClick={() => go(1)}>{t("start")}</button>
          <button type="button" className="link" onClick={onBench}>{t("toBench")}</button>
        </div>
      </div>
    );
  }

  const s = stepContent(step, facts, { t, sweep, setSweep, wing, prev, pick, answers, setAnswers, width: figW, onBench });

  return (
    <div className="lesson">
      <div className="lesson-text">
        <p className="step-of">{t("stepOf", { n: step, total: STEPS })}</p>
        <h1 className="step-title">{t(`s${step}Title` as StringKey)}</h1>
        <p className="lesson-body" aria-live="polite">
          <Rich k={s.text} vars={s.vars} />
        </p>
      </div>
      {s.figure && (
        <div className="lesson-figure" ref={figRef}>
          {s.figure}
        </div>
      )}
      {!s.figure && <div ref={figRef} className="lesson-figure empty" aria-hidden="true" />}
      {s.controls && <div className="lesson-controls">{s.controls}</div>}
      <div className="lesson-nav">
        <button type="button" onClick={() => go(step - 1)}>{t("back")}</button>
        {step < STEPS && <button type="button" className="primary" onClick={() => go(step + 1)}>{t("next")}</button>}
      </div>
    </div>
  );
}

interface Ctx {
  t: (k: StringKey, v?: Vars) => string;
  sweep: number;
  setSweep: (v: number) => void;
  wing: TestedWingId;
  prev: TestedWingId | null;
  pick: (w: TestedWingId) => void;
  answers: (number | null)[];
  setAnswers: (a: (number | null)[]) => void;
  width: number;
  onBench: () => void;
}

interface StepView {
  text: StringKey;
  vars?: Vars;
  figure?: ReactNode;
  controls?: ReactNode;
}

function WingButtons({ c }: { c: Ctx }) {
  return (
    <div className="wing-buttons" role="group" aria-label={c.t("wingButtons")}>
      {WINGS.map((w) => (
        <button key={w} type="button" aria-pressed={c.wing === w} onClick={() => c.pick(w)}>
          <svg width="14" height="14" aria-hidden="true">
            {SHAPE[w] === "circle" && <circle cx="7" cy="7" r="4" fill="none" stroke="currentColor" strokeWidth="1.3" />}
            {SHAPE[w] === "square" && <rect x="3" y="3" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.3" />}
            {SHAPE[w] === "triangle" && <polygon points="7,2 12,11 2,11" fill="none" stroke="currentColor" strokeWidth="1.3" />}
          </svg>
          {c.t("wingButton", { sweep: label(w) })}
        </button>
      ))}
    </div>
  );
}

function stepContent(step: number, f: Facts, c: Ctx): StepView {
  const { t, width } = c;
  const W = Math.max(260, width);
  const dragChart = (props: Partial<Parameters<typeof DragMachChart>[0]> & { measured: PolarPoint[]; ariaLabel: string }) => (
    <DragMachChart width={W} xLabel={t("machPlain")} yLabel={t("dragPlain")} errorBars={false} markTitle={() => ""} {...props} />
  );
  const style = (tone: (w: TestedWingId) => MarkTone) => (p: PolarPoint) => ({ shape: SHAPE[p.wing], tone: tone(p.wing) });
  const rightmost = (w: TestedWingId, tone: MarkTone) => {
    const pts = f.drawn[w];
    const last = pts.reduce((b, p) => (p.mach > b.mach ? p : b), pts[0]!);
    return { mach: last.mach, cd: last.cd, text: t("wingName", { sweep: label(w) }), tone };
  };

  switch (step) {
    case 1: {
      const w = bielatWing("10.8");
      const shown = { ...w, planform: { ...w.planform, sweepQuarterChordDeg: c.sweep } };
      const base = TESTED_SWEEPS["10.8"];
      return {
        text: "s1Text",
        vars: { sweep: label("10.8") },
        figure: <Planform wing={shown} width={W} plain maxHeight={340} text={{ ariaLabel: t("s1Aria", { sweep: c.sweep.toFixed(1) }), sweep: t("sweepMark") }} />,
        controls: (
          <div className="lesson-slider">
            <label htmlFor="lesson-sweep">{t("sweepPlain")}</label>
            <output htmlFor="lesson-sweep" className="num">{c.sweep.toFixed(1)}°</output>
            <input id="lesson-sweep" type="range" min={0} max={55} step={0.1} value={c.sweep} onChange={(e) => c.setSweep(Number(e.target.value))} />
            <button type="button" onClick={() => c.setSweep(base)} disabled={c.sweep === base}>{t("s1Reset", { sweep: label("10.8") })}</button>
          </div>
        ),
      };
    }
    case 2:
      return {
        text: "s2Text",
        figure: dragChart({ measured: f.drawn["10.8"], markStyle: style(() => "ink"), yMax: f.yMax, ariaLabel: t("s2Aria", { sweep: label("10.8") }) }),
      };
    case 3:
      return {
        text: "s3Text",
        vars: { high: mach2(f.wall.high), low: mach2(f.wall.low), ratio: ratio1(f.wall.ratio) },
        figure: dragChart({ measured: f.drawn["10.8"], markStyle: style(() => "ink"), yMax: f.yMax, highlight: { from: WALL_FROM, to: WALL_TO }, ariaLabel: t("s3Aria", { from: mach2(WALL_FROM), to: mach2(WALL_TO) }) }),
      };
    case 4: {
      const shown = c.prev && c.prev !== c.wing ? [c.prev, c.wing] : [c.wing];
      return {
        text: "s4Text",
        figure: dragChart({
          measured: shown.flatMap((w) => f.drawn[w]),
          markStyle: style((w) => (w === c.wing ? "ink" : "ink-2")),
          labels: shown.map((w) => rightmost(w, w === c.wing ? "ink" : "ink-2")),
          yMax: f.yMax,
          ariaLabel: t("s4Aria", { sweep: label(c.wing) }),
        }),
        controls: <WingButtons c={c} />,
      };
    }
    case 5: {
      const rises = WINGS.map((w) => f.rise[w]);
      const all = rises.every((r) => r !== null);
      const onlyLastMissing = rises[0] !== null && rises[1] !== null && rises[2] === null;
      return {
        text: all ? "s5Text" : onlyLastMissing ? "s5TextNoRiseLast" : "s5TextShort",
        vars: { mach: mach2(f.cut.mach), cut: percent0(f.cut.percent), riseA: rises[0] !== null ? mach2(rises[0]!) : "", riseB: rises[1] !== null ? mach2(rises[1]!) : "", riseC: rises[2] !== null ? mach2(rises[2]!) : "" },
        figure: dragChart({
          measured: [],
          curves: WINGS.map((w) => ({ id: w, points: fairedCurve(f.data, w).map((s) => ({ mach: s.mach, cd: s.cd0 })), tone: w === c.wing ? "ink" : "ink-2", label: t("wingName", { sweep: label(w) }), gap: [GAP_FROM, GAP_TO] })),
          vLine: { mach: WALL_MACH, label: t("s5Line", { mach: mach2(WALL_MACH) }) },
          ariaLabel: t("s5Aria", { mach: mach2(WALL_MACH) }),
        }),
      };
    }
    case 6:
      return {
        text: "s6Text",
        vars: { loss: percent0(f.lift.percent) },
        figure: (
          <LiftChart
            width={W}
            errorBars={false}
            groups={WINGS.map((w) => ({ id: w, points: f.data.lift.filter((p) => p.wing === w && Math.abs(p.mach - LOW_MACH) < 1e-6), shape: SHAPE[w], tone: w === c.wing ? "ink" : "ink-2", label: t("wingName", { sweep: label(w) }) }))}
            text={{ xLabel: t("alphaPlain"), yLabel: t("liftPlain"), ariaLabel: t("s6Aria", { mach: mach2(LOW_MACH) }), markTitle: () => "" }}
          />
        ),
      };
    case 7: {
      const a = f.agree[c.wing]!.value;
      const w = bielatWing(c.wing);
      const band: MachBandPoint[] = [];
      for (let m = 0.5; m <= 1.15 + 1e-9; m += 0.0025) {
        const r = kornMasonLockBand(w, { mach: m, cl: LESSON_CL });
        band.push({ mach: m, min: r.min, max: r.max, valid: r.valid, beyondLock: r.beyondLock });
      }
      return {
        text: a.inside === 0 ? "s7TextNone" : "s7Text",
        vars: { inside: a.inside, total: a.total },
        figure: dragChart({ measured: f.drawn[c.wing], markStyle: style(() => "ink"), band, ariaLabel: t("s7Aria", { sweep: label(c.wing) }) }),
        controls: <WingButtons c={c} />,
      };
    }
    default:
      return { text: "s8Text", controls: <Quiz f={f} c={c} /> };
  }
}

const QUIZ: { q: StringKey; options: StringKey[]; correct: number; why: StringKey }[] = [
  { q: "q1", options: ["q1a", "q1b", "q1c"], correct: 1, why: "q1Why" },
  { q: "q2", options: ["q2a", "q2b", "q2c"], correct: 1, why: "q2Why" },
  { q: "q3", options: ["q3a", "q3b", "q3c"], correct: 0, why: "q3Why" },
];

function Quiz({ f, c }: { f: Facts; c: Ctx }) {
  const { t } = c;
  const vars = { mach: mach2(f.cut.mach), cut: percent0(f.cut.percent) };
  return (
    <div className="quiz">
      {QUIZ.map((item, i) => {
        const chosen = c.answers[i];
        return (
          <fieldset key={item.q} className="question">
            <legend><Rich k={item.q} vars={vars} /></legend>
            <div className="options">
              {item.options.map((o, j) => (
                <button key={o} type="button" aria-pressed={chosen === j} className={chosen === j ? (j === item.correct ? "right" : "wrong") : undefined}
                  onClick={() => c.setAnswers(c.answers.map((a, k) => (k === i ? j : a)))}>
                  {t(o)}
                </button>
              ))}
            </div>
            <p className="feedback" aria-live="polite">
              {chosen !== null && (
                <>
                  <strong>{chosen === item.correct ? t("right") : t("wrong")}</strong> <Rich k={item.why} vars={vars} />
                </>
              )}
            </p>
          </fieldset>
        );
      })}
      <p className="lesson-body close">{t("s8Close")}</p>
      <button type="button" className="primary" onClick={c.onBench}>{t("s8Open")}</button>
    </div>
  );
}
