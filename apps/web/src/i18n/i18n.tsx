import { createContext, useContext, type ReactNode } from "react";
import { SOURCES, STRINGS, type Lang, type StringKey } from "./strings.ts";

export type Vars = Record<string, string | number>;

/** Fill {placeholders}; source citations are always available. A missing value is an error, never a silent blank. */
export function fill(template: string, vars: Vars = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k] ?? (SOURCES as Record<string, string>)[k];
    if (v === undefined) throw new Error(`missing value for {${k}} in "${template}"`);
    return String(v);
  });
}

/** Initial language from the browser: Spanish if it starts with "es", English otherwise (decision 0003). */
export function initialLang(languages: readonly string[] = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language]): Lang {
  return languages[0]?.toLowerCase().startsWith("es") ? "es" : "en";
}

interface I18n {
  lang: Lang;
  t: (key: StringKey, vars?: Vars) => string;
}

const Ctx = createContext<I18n>({ lang: "es", t: (k, v) => fill(STRINGS.es[k], v) });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = (key: StringKey, vars?: Vars) => fill(STRINGS[lang][key], vars);
  return <Ctx.Provider value={{ lang, t }}>{children}</Ctx.Provider>;
}

export const useI18n = (): I18n => useContext(Ctx);

/**
 * A string with **bold** terms and {placeholders}. Filled values are figures
 * computed by the code and are set in the figure style.
 */
export function Rich({ k, vars = {} }: { k: StringKey; vars?: Vars | undefined }) {
  const { lang } = useI18n();
  const template = STRINGS[lang][k];
  const out: ReactNode[] = [];
  const parts = template.split(/(\*\*[^*]+\*\*)/);
  parts.forEach((part, i) => {
    const bold = part.startsWith("**") && part.endsWith("**");
    const body = bold ? part.slice(2, -2) : part;
    const pieces = body.split(/(\{\w+\})/).map((p, j) => {
      const m = /^\{(\w+)\}$/.exec(p);
      if (!m) return p;
      return <span key={j} className="num">{fill(p, vars)}</span>;
    });
    out.push(bold ? <strong key={i}>{pieces}</strong> : <span key={i}>{pieces}</span>);
  });
  return <>{out}</>;
}
