import { useEffect, useState } from "react";
import { Bench } from "./Bench.tsx";
import { loadBundledData } from "./data.ts";
import { I18nProvider, fill, initialLang } from "./i18n/i18n.tsx";
import { STRINGS, type Lang } from "./i18n/strings.ts";
import { Lesson } from "./lesson/Lesson.tsx";

const DATA = loadBundledData();
type Mode = "lesson" | "bench";

/** Top bar (title; mode and language switches) over the lesson or the free bench. The first visit opens the lesson's cover. */
export function App() {
  const [lang, setLang] = useState<Lang>(() => initialLang());
  const [mode, setMode] = useState<Mode>("lesson");
  const s = STRINGS[lang];
  const data = DATA.ok ? DATA.data : null;

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = s.appTitle;
  }, [lang, s.appTitle]);

  const open = (m: Mode) => {
    setMode(m);
    window.scrollTo({ top: 0 });
  };

  return (
    <I18nProvider lang={lang}>
      <header className="topbar">
        <span className="topbar-title">{s.appTitle}</span>
        <div className="switches">
          <div className="switch" role="group" aria-label={s.modeGroup}>
            <button type="button" aria-pressed={mode === "lesson"} onClick={() => open("lesson")}>{fill(s.modeLesson, { n: 1 })}</button>
            <button type="button" aria-pressed={mode === "bench"} onClick={() => open("bench")}>{s.modeBench}</button>
          </div>
          <div className="switch" role="group" aria-label={s.langGroup}>
            <button type="button" aria-pressed={lang === "es"} lang="es" onClick={() => setLang("es")}>ES</button>
            <button type="button" aria-pressed={lang === "en"} lang="en" onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
      </header>
      <main className="page">
        {mode === "lesson" ? <Lesson data={data} onBench={() => open("bench")} /> : <Bench data={data} />}
      </main>
    </I18nProvider>
  );
}
