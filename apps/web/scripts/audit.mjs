/**
 * Browser audit of the app (brief 002, checks 4 and 5), run against a served build or the dev server:
 *
 *   node apps/web/scripts/audit.mjs http://localhost:5173 [screenshot folder]
 *
 * For each language and width (390 and 1360 px) it walks the lesson's cover,
 * the eight steps and the free bench, and reports:
 * - the smallest rendered size of any SVG text (font size times the SVG's
 *   on-screen scale); check 4 asks for no text below 11 px at 390 px;
 * - SVG text that runs outside its SVG;
 * - horizontal page scroll;
 * - every console warning or error and page error (check 5).
 * With a folder, it also saves a screenshot of every screen.
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const [url = "http://localhost:5173", out] = process.argv.slice(2);
if (out) mkdirSync(out, { recursive: true });

const LABELS = {
  es: { start: "Empezar", next: "Siguiente", wing47: "Ala de 47°", bench: "Banco libre", answers: ["Se dispara", "La de 47°", "Sustentación con el morro igual de levantado"] },
  en: { start: "Start", next: "Next", wing47: "47° wing", bench: "Free bench", answers: ["It shoots up", "The 47° one", "Lift at the same nose-up angle"] },
};

/** Measure the SVG text on the page, in the page. */
const measure = () => {
  const out = { texts: 0, minPx: Infinity, minText: "", overflow: [], scrollX: document.documentElement.scrollWidth > window.innerWidth };
  for (const svg of document.querySelectorAll("svg")) {
    const vb = svg.viewBox.baseVal;
    const r = svg.getBoundingClientRect();
    if (!vb || !vb.width || !r.width) continue;
    const scale = r.width / vb.width;
    for (const t of svg.querySelectorAll("text")) {
      if (!t.textContent.trim()) continue;
      out.texts++;
      const px = parseFloat(getComputedStyle(t).fontSize) * scale;
      if (px < out.minPx) {
        out.minPx = px;
        out.minText = t.textContent.trim().slice(0, 40);
      }
      const b = t.getBoundingClientRect();
      if (b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1) out.overflow.push(t.textContent.trim().slice(0, 40));
    }
  }
  return out;
};

const browser = await chromium.launch();
const results = [];
for (const lang of ["es", "en"]) {
  for (const width of [390, 1360]) {
    const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, locale: lang === "es" ? "es-ES" : "en-US", deviceScaleFactor: out ? 2 : 1 });
    const page = await context.newPage();
    const messages = [];
    page.on("console", (m) => {
      if (m.type() === "warning" || m.type() === "error") messages.push(`${m.type()}: ${m.text()}`);
    });
    page.on("pageerror", (e) => messages.push(`pageerror: ${e.message}`));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const L = LABELS[lang];
    const shot = async (name) => {
      await page.waitForTimeout(150);
      const m = await page.evaluate(measure);
      results.push({ lang, width, screen: name, ...m, minPx: Number.isFinite(m.minPx) ? Number(m.minPx.toFixed(2)) : null });
      if (out) await page.screenshot({ path: join(out, `${lang}-${width}-${name}.png`), fullPage: true });
    };
    await shot("0-cover");
    await page.getByRole("button", { name: L.start, exact: true }).click();
    for (let step = 1; step <= 8; step++) {
      if (step === 4) await page.getByRole("button", { name: L.wing47, exact: true }).click();
      if (step === 8) for (const a of L.answers) await page.getByRole("button", { name: a, exact: true }).click();
      await shot(`${step}-step`);
      if (step < 8) await page.getByRole("button", { name: L.next, exact: true }).click();
    }
    await page.getByRole("button", { name: L.bench, exact: true }).first().click();
    await shot("9-bench");
    results.push({ lang, width, screen: "console", messages });
    await context.close();
  }
}
await browser.close();

const screens = results.filter((r) => r.screen !== "console");
const at390 = screens.filter((r) => r.width === 390 && r.minPx !== null);
const summary = {
  screens: screens.length,
  minSvgTextPxAt390: Math.min(...at390.map((r) => r.minPx)),
  minSvgTextPxAll: Math.min(...screens.filter((r) => r.minPx !== null).map((r) => r.minPx)),
  below11At390: at390.filter((r) => r.minPx < 11).map((r) => `${r.lang} ${r.screen}: ${r.minPx} px "${r.minText}"`),
  textOutsideSvg: screens.filter((r) => r.overflow.length).map((r) => `${r.lang} ${r.width} ${r.screen}: ${r.overflow.join(" | ")}`),
  horizontalScroll: screens.filter((r) => r.scrollX).map((r) => `${r.lang} ${r.width} ${r.screen}`),
  consoleMessages: results.filter((r) => r.screen === "console").flatMap((r) => r.messages.map((m) => `${r.lang} ${r.width}: ${m}`)),
};
process.stdout.write(JSON.stringify({ summary, screens: screens.map(({ lang, width, screen, texts, minPx, minText }) => ({ lang, width, screen, texts, minPx, minText })) }, null, 2) + "\n");
process.exitCode = summary.below11At390.length || summary.consoleMessages.length ? 1 : 0;
