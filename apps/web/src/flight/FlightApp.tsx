import { useMemo, useState } from "react";
import type { TestedWingId } from "@jet-workshop/physics";
import { initialState, makeAircraft, makePlaceholderEngine, type Aircraft, type FlightState } from "@jet-workshop/physics/flight";
import { loadTables } from "./data.ts";
import { Flight } from "./Flight.tsx";
import { Hangar, defaultDesign, fuelLoad, type Design } from "./Hangar.tsx";
import { Report } from "./Report.tsx";
import { SCENARIO } from "./scenario.ts";
import { initialLang, t, type Lang } from "./strings.ts";
import { wingBody } from "./tables.ts";

const TABLES = loadTables();

type Phase = { kind: "hangar" } | { kind: "flight"; start: FlightState; run: number } | { kind: "report"; end: FlightState };

export function buildAircraft(design: Design, tables: Record<TestedWingId, Aircraft["aero"]>): Aircraft {
  return makeAircraft({
    wing: wingBody(design.wing),
    aero: tables[design.wing],
    wingArea_m2: design.area_m2,
    engine: makePlaceholderEngine({ staticThrust_N: design.thrust_N }),
  });
}

export function FlightApp() {
  const [lang, setLang] = useState<Lang>(() => initialLang(typeof navigator === "undefined" ? undefined : navigator.language));
  const [design, setDesign] = useState<Design>(defaultDesign);
  const [phase, setPhase] = useState<Phase>({ kind: "hangar" });
  const tables = TABLES.ok ? TABLES.tables : null;
  const aircraft = useMemo(() => (tables ? buildAircraft(design, tables) : null), [design, tables]);

  const board = (): void => {
    if (!aircraft) return;
    setPhase({ kind: "flight", start: initialState(aircraft, fuelLoad(design, aircraft), SCENARIO), run: Date.now() });
  };

  return (
    <div className="flight-page" lang={lang}>
      <header className="flight-bar">
        <h1>{t(lang, "title")}</h1>
        <nav className="flight-bar-right">
          <span className="flight-lang" role="group" aria-label={t(lang, "langLabel")}>
            <button type="button" aria-pressed={lang === "es"} onClick={() => setLang("es")}>
              ES
            </button>
            <span aria-hidden="true">|</span>
            <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              EN
            </button>
          </span>
          <a href="./index.html">{t(lang, "back")}</a>
        </nav>
      </header>
      {!TABLES.ok && <p className="flight-error">{t(lang, "dataError", { error: TABLES.error })}</p>}
      {aircraft && phase.kind === "hangar" && <Hangar lang={lang} design={design} aircraft={aircraft} onChange={setDesign} onBoard={board} />}
      {aircraft && phase.kind === "flight" && (
        <Flight key={phase.run} lang={lang} aircraft={aircraft} start={phase.start} onEnd={(end) => setPhase({ kind: "report", end })} onHangar={() => setPhase({ kind: "hangar" })} />
      )}
      {aircraft && phase.kind === "report" && <Report lang={lang} aircraft={aircraft} end={phase.end} onAgain={board} onHangar={() => setPhase({ kind: "hangar" })} />}
    </div>
  );
}
