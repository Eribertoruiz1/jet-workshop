import { flightReport, type Aircraft, type FlightReport, type FlightState } from "@jet-workshop/physics/flight";
import * as fmt from "./format.ts";
import { t, type Lang, type StringKey } from "./strings.ts";

const TITLES: Record<FlightReport["outcome"]["kind"], StringKey> = {
  landed: "titleLanded",
  "no-takeoff": "titleNoTakeoff",
  stall: "titleStall",
  "wing-break": "titleWingBreak",
  "out-of-fuel": "titleOutOfFuel",
  "engine-failure": "titleEngine",
  "hard-landing": "titleHardLanding",
  crash: "titleCrash",
};

/** The sentences of the report: the cause with its figures, then why it did or did not go supersonic. */
export function reportSentences(lang: Lang, r: FlightReport): string[] {
  const o = r.outcome;
  const out: string[] = [];
  switch (o.kind) {
    case "landed":
      out.push(t(lang, "landed", { m: fmt.mach(r.maxMach), f: fmt.percent(r.fuelLeftFraction) }));
      break;
    case "no-takeoff":
      out.push(t(lang, "noTakeoff", { v: fmt.kmh(o.speed_m_s), vr: fmt.kmh(o.required_m_s) }));
      break;
    case "stall":
      out.push(t(lang, "stall", { v: fmt.kmh(o.speed_m_s), w: fmt.kg(o.mass_kg), vs: fmt.kmh(o.stallSpeed_m_s) }));
      break;
    case "wing-break": {
      // The wing breaks in the first step past its limit, so both figures are close:
      // as many decimals as it takes, from two, for them to print apart.
      const d = fmt.decimalsApart(o.loadFactor, o.limit, 2, 4);
      out.push(t(lang, "wingBreak", { g: fmt.fixed(o.loadFactor, d), gl: fmt.fixed(o.limit, d) }));
      out.push(t(lang, "wingBreakSpeed", { v: fmt.kmh(o.speed_m_s) }));
      break;
    }
    case "out-of-fuel":
      out.push(t(lang, "outOfFuel", { d: fmt.km(o.distance_m) }));
      break;
    case "engine-failure":
      out.push(t(lang, "engineFailure", { cause: o.limitId }));
      break;
    case "hard-landing":
      out.push(t(lang, "hardLanding", { vz: fmt.fixed(o.sink_m_s, 1), vl: fmt.fixed(o.limit_m_s, 1) }));
      break;
    case "crash":
      out.push(t(lang, "crash", { v: fmt.kmh(o.speed_m_s) }));
      out.push(
        o.reason === "off-runway"
          ? t(lang, "crashOffRunway", { d: fmt.km(o.distance_m) })
          : o.reason === "nose-low"
            ? t(lang, "crashNoseLow", { a: fmt.degrees(-o.theta) })
            : t(lang, "crashBackwards"),
      );
      break;
  }
  if (!r.supersonic) {
    const m = r.dragEqualsThrustMach;
    if (m === null) out.push(t(lang, "noCrossPlain"));
    else if (m < 1) out.push(t(lang, "noCross", { m: fmt.mach(m) }));
    else out.push(t(lang, "noCrossCould", { m: fmt.mach(r.maxMach), meq: fmt.mach(m) }));
  }
  return out;
}

export function Report({ lang, aircraft, end, onAgain, onHangar }: { lang: Lang; aircraft: Aircraft; end: FlightState; onAgain: () => void; onHangar: () => void }) {
  const r = flightReport(end, aircraft);
  if (!r) return null;
  const figures: [StringKey, string][] = [
    ["figureTopSpeed", t(lang, "figureMach", { m: fmt.mach(r.maxMach) })],
    ["figureTopHeight", t(lang, "figureMetres", { h: fmt.metres(r.maxHeight_m) })],
    ["figureTime", t(lang, "figureSeconds", { t: fmt.fixed(r.flightTime_s, 0) })],
  ];
  return (
    <main className="flight-report">
      <h2>{t(lang, TITLES[r.outcome.kind])}</h2>
      {reportSentences(lang, r).map((s) => (
        <p key={s} className="flight-report-cause">
          {s}
        </p>
      ))}
      <dl className="flight-figures">
        {figures.map(([k, v]) => (
          <div key={k}>
            <dt>{t(lang, k)}</dt>
            <dd className="flight-num">{v}</dd>
          </div>
        ))}
      </dl>
      {r.provisionalEngine && <p className="flight-note">{t(lang, "reportEngine")}</p>}
      <div className="flight-report-buttons">
        <button type="button" className="flight-primary" onClick={onAgain}>
          {t(lang, "again")}
        </button>
        <button type="button" onClick={onHangar}>
          {t(lang, "toHangar")}
        </button>
      </div>
    </main>
  );
}
