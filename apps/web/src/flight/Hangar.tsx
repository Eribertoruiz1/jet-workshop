import { TESTED_SWEEPS, type TestedWingId } from "@jet-workshop/physics";
import { G0, estimatedTakeoffSpeed, type Aircraft } from "@jet-workshop/physics/flight";
import * as fmt from "./format.ts";
import { halfPlanform, profile, type Point } from "./profile.ts";
import { t, type Lang } from "./strings.ts";
import { REPORT_YEAR, TESTED_WINGS, wingBody } from "./tables.ts";

export interface Design {
  readonly wing: TestedWingId;
  readonly area_m2: number;
  readonly fuel_kg: number;
  readonly thrust_N: number;
}

/** Ranges of the hangar controls. Not physics: what the player may choose. */
export const AREA_RANGE = { min: 10, max: 60, step: 1 } as const;
export const THRUST_RANGE = { min: 5000, max: 120000, step: 1000 } as const;
export const FUEL_STEP = 10;

export const defaultDesign: Design = { wing: "35", area_m2: 25, fuel_kg: 700, thrust_N: 30000 };

function WingButton({ id, active, lang, onPick }: { id: TestedWingId; active: boolean; lang: Lang; onPick: () => void }) {
  const half = halfPlanform(wingBody(id));
  // Every tested wing has the same area and aspect ratio: one scale for the three,
  // set by the span and by the longest planform (the 47 deg wing's tip trailing edge).
  const span = 2 * Math.max(...half.map(([y]) => y));
  const longest = Math.max(...TESTED_WINGS.flatMap((w) => halfPlanform(wingBody(w)).map(([, x]) => x)));
  const scale = Math.min(60 / span, 34 / longest);
  const cx = 34;
  const top = 5;
  const pts = [...half, ...half.slice().reverse().map(([y, x]): Point => [-y, x])].map(([y, x]) => `${(cx + y * scale).toFixed(2)},${(top + x * scale).toFixed(2)}`).join(" ");
  const sweep = fmt.sweep(TESTED_SWEEPS[id]);
  return (
    <button type="button" className="flight-wing" aria-pressed={active} aria-label={t(lang, "wingButtonLabel", { sweep })} onClick={onPick}>
      <svg viewBox="0 0 68 44" width="68" height="44" aria-hidden="true">
        <polygon points={pts} fill="none" stroke="currentColor" strokeWidth={1.2} />
      </svg>
      <span className="flight-num">{t(lang, "wingButton", { sweep })}</span>
    </button>
  );
}

function SideView({ aircraft, lang }: { aircraft: Aircraft; lang: Lang }) {
  const p = profile(aircraft);
  const W = 360;
  const H = 110;
  const margin = 16;
  // One scale for every size, so a bigger wing draws a bigger aircraft: the largest aircraft fills the width.
  const k = (W - 2 * margin) / Math.max(p.length_m, 18);
  const ox = margin;
  const oy = 52;
  const path = (pts: readonly Point[]): string => pts.map(([x, z], i) => `${i ? "L" : "M"}${(ox + x * k).toFixed(2)},${(oy - z * k).toFixed(2)}`).join(" ") + " Z";
  const len = fmt.fixed(p.length_m, 1);
  const span = fmt.fixed(p.span_m, 1);
  return (
    <svg className="flight-side" viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={t(lang, "profileLabel", { length: len, span })}>
      <path d={path(p.body)} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.3} />
      <path d={path(p.root)} fill="none" stroke="var(--ink)" strokeWidth={0.8} />
      <path d={path(p.tip)} fill="var(--ink)" stroke="var(--ink)" strokeWidth={0.8} />
      <line x1={ox} x2={ox + p.length_m * k} y1={oy + 34} y2={oy + 34} stroke="var(--ink-2)" strokeWidth={0.8} />
      <line x1={ox} x2={ox} y1={oy + 29} y2={oy + 39} stroke="var(--ink-2)" strokeWidth={0.8} />
      <line x1={ox + p.length_m * k} x2={ox + p.length_m * k} y1={oy + 29} y2={oy + 39} stroke="var(--ink-2)" strokeWidth={0.8} />
      <text x={ox + (p.length_m * k) / 2} y={oy + 50} textAnchor="middle" className="flight-svg-num">
        {t(lang, "scaleBar", { d: len })}
      </text>
    </svg>
  );
}

export function Hangar({ lang, design, aircraft, onChange, onBoard }: { lang: Lang; design: Design; aircraft: Aircraft; onChange: (d: Design) => void; onBoard: () => void }) {
  const capacity = Math.floor(aircraft.fuelCapacity_kg / FUEL_STEP) * FUEL_STEP;
  const fuel = Math.min(design.fuel_kg, capacity);
  const mass = aircraft.emptyMass_kg + fuel;
  const tw = design.thrust_N / (mass * G0);
  const vto = estimatedTakeoffSpeed(aircraft, mass);
  const set = (patch: Partial<Design>): void => {
    const next = { ...design, ...patch };
    onChange(next);
  };
  return (
    <main className="flight-hangar">
      <h2>{t(lang, "hangarTitle")}</h2>
      <SideView aircraft={aircraft} lang={lang} />
      <div className="flight-wings">
        {TESTED_WINGS.map((id) => (
          <WingButton key={id} id={id} lang={lang} active={design.wing === id} onPick={() => set({ wing: id })} />
        ))}
      </div>
      <p className="flight-note">{t(lang, "wingsNote", { year: String(REPORT_YEAR) })}</p>

      <label className="flight-control">
        <span>{t(lang, "wingSize", { S: fmt.fixed(design.area_m2, 0) })}</span>
        <input type="range" min={AREA_RANGE.min} max={AREA_RANGE.max} step={AREA_RANGE.step} value={design.area_m2} onChange={(e) => set({ area_m2: Number(e.target.value) })} />
      </label>
      <label className="flight-control">
        <span>{t(lang, "fuel", { f: fmt.kg(fuel) })}</span>
        <input type="range" min={0} max={capacity} step={FUEL_STEP} value={fuel} onChange={(e) => set({ fuel_kg: Number(e.target.value) })} />
      </label>
      <label className="flight-control">
        <span>{t(lang, "thrust", { T: fmt.kN(design.thrust_N) })}</span>
        <input type="range" min={THRUST_RANGE.min} max={THRUST_RANGE.max} step={THRUST_RANGE.step} value={design.thrust_N} onChange={(e) => set({ thrust_N: Number(e.target.value) })} />
      </label>

      <div className="flight-readings" aria-live="polite">
        <p>{t(lang, "takeoffWeight", { W: fmt.kg(mass) })}</p>
        <p>{t(lang, "thrustToWeight", { tw: fmt.ratio(tw) })}</p>
        <p>{t(lang, "takeoffSpeed", { v: fmt.kmh(vto) })}</p>
      </div>
      <p className="flight-note">{t(lang, "hangarNote")}</p>
      <p className="flight-note">{t(lang, "provisionalEngine")}</p>
      <button type="button" className="flight-primary" onClick={() => onBoard()}>
        {t(lang, "board")}
      </button>
    </main>
  );
}
