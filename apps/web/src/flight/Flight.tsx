import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { DT, observe, step, type Aircraft, type Controls, type FlightEvidence, type FlightState, type Observation } from "@jet-workshop/physics/flight";
import { drawScene, type Palette } from "./draw.ts";
import * as fmt from "./format.ts";
import { profile } from "./profile.ts";
import { LANDING_RUNWAY_START_M } from "./scenario.ts";
import { t, type Lang, type StringKey } from "./strings.ts";

/** Longest real time integrated in one frame, s; longer frames run the flight slower instead of jumping. */
export const MAX_FRAME_S = 0.1;
/** A gap longer than this between frames (the tab was hidden or the device slept) pauses the flight. */
export const PAUSE_GAP_S = 0.5;
/** Throttle travel per second while W or S is held. */
const KEY_THROTTLE_RATE = 0.5;
/** Stick from the arrow keys, as a fraction of the pitch-rate limit; with Shift, full stick. */
const KEY_PITCH = 0.4;

const EVIDENCE_KEY: Record<FlightEvidence, StringKey> = { validated: "validated", estimated: "estimated", "no-data": "noData" };

function cssVar(name: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function palette(): Palette {
  return {
    page: cssVar("--page", "#f5f6f8"),
    ink: cssVar("--ink", "#15181c"),
    ink2: cssVar("--ink-2", "#5b6470"),
    grid: cssVar("--grid", "#dde1e6"),
    accent: cssVar("--accent", "#1f5fbf"),
    font: cssVar("--text", "B612, system-ui, sans-serif"),
  };
}

/** Touch stick to command: a gentle centre, full rate at the ends (a control choice, not physics). */
export function stickCurve(d: number): number {
  const c = Math.max(-1, Math.min(1, d));
  return Math.sign(c) * c * c;
}

export function Flight({ lang, aircraft, start, onEnd }: { lang: Lang; aircraft: Aircraft; start: FlightState; onEnd: (end: FlightState) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const sim = useRef({ prev: start, cur: start, acc: 0, last: null as number | null });
  const input = useRef({ throttle: 0, touchPitch: 0, keys: new Set<string>() });
  const pausedRef = useRef(false);
  const langRef = useRef(lang);
  const [paused, setPaused] = useState(false);
  const [obs, setObs] = useState<Observation>(() => observe(start, aircraft));
  const [state, setState] = useState<FlightState>(start);
  const [throttle, setThrottle] = useState(0);
  const [stick, setStick] = useState(0);
  const prof = useMemo(() => profile(aircraft), [aircraft]);
  const size = useRef({ w: 360, h: 300, dpr: 1 });
  const onEndRef = useRef(onEnd);
  langRef.current = lang;
  onEndRef.current = onEnd;

  const setPause = useCallback((p: boolean) => {
    pausedRef.current = p;
    setPaused(p);
    sim.current.last = null;
  }, []);

  const controls = (): Controls => {
    const k = input.current.keys;
    const full = k.has("Shift") ? 1 : KEY_PITCH;
    const keyPitch = (k.has("ArrowDown") ? full : 0) - (k.has("ArrowUp") ? full : 0);
    return { throttle: input.current.throttle, pitch: keyPitch !== 0 ? keyPitch : input.current.touchPitch, afterburner: false };
  };

  // Canvas size follows its box, at the device's pixel density.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = (): void => {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // Keyboard.
  useEffect(() => {
    const down = (e: KeyboardEvent): void => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === "p") {
        setPause(!pausedRef.current);
        return;
      }
      if (["w", "s", "ArrowUp", "ArrowDown", "Shift"].includes(key)) {
        input.current.keys.add(key);
        if (key.startsWith("Arrow")) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent): void => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      input.current.keys.delete(key);
    };
    const hidden = (): void => {
      if (document.hidden) setPause(true);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [setPause]);

  // The loop: fixed physics steps of DT, drawing interpolated between the last two states.
  useEffect(() => {
    let raf = 0;
    const pal = palette();
    const frame = (now: number): void => {
      const s = sim.current;
      const last = s.last ?? now;
      const elapsed = (now - last) / 1000;
      s.last = now;
      if (elapsed > PAUSE_GAP_S && !pausedRef.current) setPause(true);
      if (!pausedRef.current) {
        const k = input.current.keys;
        const dt = Math.min(elapsed, MAX_FRAME_S);
        if (k.has("w") || k.has("s")) {
          const d = ((k.has("w") ? 1 : 0) - (k.has("s") ? 1 : 0)) * KEY_THROTTLE_RATE * dt;
          input.current.throttle = Math.min(1, Math.max(0, input.current.throttle + d));
          setThrottle(input.current.throttle);
        }
        s.acc += dt;
        const c = controls();
        while (s.acc >= DT && !s.cur.outcome) {
          s.prev = s.cur;
          s.cur = step(s.cur, c, aircraft, DT);
          s.acc -= DT;
        }
        setStick(c.pitch);
      }
      const a = Math.min(1, s.acc / DT);
      const o = observe(s.cur, aircraft);
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        const { w, h, dpr } = size.current;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const lerp = (p: number, q: number): number => p + (q - p) * a;
        const L = langRef.current;
        drawScene(ctx, w, h, pal, { x: lerp(s.prev.x, s.cur.x), h: lerp(s.prev.h, s.cur.h), theta: lerp(s.prev.theta, s.cur.theta), obs: o }, prof, s.cur.scenario, {
          lift: t(L, "forceLift"),
          weight: t(L, "forceWeight"),
          thrust: t(L, "forceThrust"),
          drag: t(L, "forceDrag"),
          sum: t(L, "forceSum"),
          height: (m) => t(L, "heightValue", { h: fmt.metres(m) }),
          scale: (m) => t(L, "scaleBar", { d: fmt.metres(m) }),
          paused: pausedRef.current ? t(L, "paused") : null,
        });
      }
      setObs(o);
      setState(s.cur);
      if (s.cur.outcome) {
        onEndRef.current(s.cur);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // The loop is built once per flight; inputs, language and the end callback are read from refs.
  }, [aircraft, prof, setPause]);

  // Touch: throttle lever on the left, pitch zone on the right.
  const lever = (e: ReactPointerEvent<HTMLDivElement>): void => {
    if (e.type === "pointerdown") e.currentTarget.setPointerCapture(e.pointerId);
    else if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.getBoundingClientRect();
    const v = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    input.current.throttle = v;
    setThrottle(v);
  };
  const pitchStart = useRef<number | null>(null);
  const pitchMove = (e: ReactPointerEvent<HTMLDivElement>): void => {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.type === "pointerdown") {
      e.currentTarget.setPointerCapture(e.pointerId);
      pitchStart.current = e.clientY;
    }
    if (pitchStart.current === null) return;
    input.current.touchPitch = stickCurve((e.clientY - pitchStart.current) / (r.height / 2));
  };
  const pitchEnd = (): void => {
    pitchStart.current = null;
    input.current.touchPitch = 0;
  };

  const ev = (e: FlightEvidence): string => t(lang, EVIDENCE_KEY[e]);
  const engineWarnings = obs.warnings.engineLimits;
  const toRunway = LANDING_RUNWAY_START_M - state.x;

  return (
    <main className="flight-flight">
      <div className="flight-scene" ref={wrapRef}>
        <canvas ref={canvasRef} role="img" aria-label={t(lang, "sceneLabel")} />
      </div>
      <section className="flight-readouts" aria-live="off">
        <div>
          <span>{t(lang, "speedLabel")}</span>
          <strong className="flight-num">{t(lang, "speedValue", { v: fmt.kmh(obs.speed_m_s), m: fmt.mach(obs.mach) })}</strong>
        </div>
        <div>
          <span>{t(lang, "heightLabel")}</span>
          <strong className="flight-num">{t(lang, "heightValue", { h: fmt.metres(obs.height_m) })}</strong>
        </div>
        <div>
          <span>{t(lang, "fuelLabel")}</span>
          <strong className="flight-num">{t(lang, "fuelValue", { f: fmt.percent(obs.fuelFraction) })}</strong>
        </div>
        <div>
          <span>{t(lang, "loadLabel")}</span>
          <strong className="flight-num">{t(lang, "loadValue", { g: fmt.loadFactor(obs.loadFactor) })}</strong>
        </div>
        <div>
          <span>{t(lang, "runwayLabel")}</span>
          <strong className="flight-num">{t(lang, "runwayValue", { d: fmt.km(toRunway) })}</strong>
        </div>
      </section>
      <section className="flight-status" aria-label={t(lang, "statusLabel")}>
        <h3>{t(lang, "statusLabel")}</h3>
        <ul>
          {(
            [
              ["statusLift", obs.evidence.lift],
              ["statusDrag", obs.evidence.drag],
              ["statusThrust", obs.evidence.thrust],
              ["statusWeight", obs.evidence.weight],
            ] as const
          ).map(([key, e]) => (
            <li key={key} data-evidence={e}>
              <span>{t(lang, key)}</span> {ev(e)}
            </li>
          ))}
          <li>{t(lang, "reportEngine")}</li>
        </ul>
      </section>
      <p className="flight-warnings" role="status">
        {obs.warnings.nearStall && <span className="flight-warn">{t(lang, "nearStall")}</span>}
        {obs.warnings.wingLimit && <span className="flight-stop">{t(lang, "wingLimit")}</span>}
        {engineWarnings.map((l) => (
          <span key={l.id} className="flight-warn">
            {t(lang, "engineLimit", { limit: l.id })}
          </span>
        ))}
      </p>
      <section className="flight-controls">
        <div
          className="flight-lever"
          role="slider"
          aria-label={t(lang, "throttle")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(throttle * 100)}
          onPointerDown={lever}
          onPointerMove={lever}
        >
          <span className="flight-lever-label">{t(lang, "throttle")}</span>
          <div className="flight-lever-fill" style={{ height: `${throttle * 100}%` }} />
          <span className="flight-lever-value flight-num">{fmt.percent(throttle)}</span>
        </div>
        <div className="flight-pitch" onPointerDown={pitchMove} onPointerMove={pitchMove} onPointerUp={pitchEnd} onPointerCancel={pitchEnd}>
          <span className="flight-pitch-label">{t(lang, "pitch")}</span>
          <span className="flight-pitch-hint">{t(lang, "pitchHint")}</span>
          <div className="flight-pitch-mark" style={{ top: `${50 + stick * 45}%` }} />
        </div>
        <button type="button" className="flight-pause" aria-pressed={paused} onClick={() => setPause(!paused)}>
          {paused ? t(lang, "resume") : t(lang, "pause")}
        </button>
      </section>
      <p className="flight-keys">{t(lang, "keys")}</p>
    </main>
  );
}
