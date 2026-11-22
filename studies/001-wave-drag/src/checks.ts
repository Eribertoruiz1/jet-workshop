/**
 * Geometry cross-checks: every derived dimension against the printed one it
 * should reproduce. Geometry only; no drag data.
 */

import { buildConfiguration, loadConfigs } from "./config.ts";
import { chords } from "./planform.ts";
import { loadAirfoils, sectionModel } from "./section.ts";

interface Check {
  what: string;
  computed: string;
  printed: string;
  ok: boolean;
  /** A difference that is reported but does not stop the run (rounding or two printed numbers that disagree) */
  note?: string;
}

export function geometryChecks(): { markdown: string; summary: string; ok: boolean } {
  const f = loadConfigs();
  const a = loadAirfoils();
  const out: Check[] = [];
  // Airfoil tables: the sheet's 4 % column against RM L52B08 table I.
  const t04 = a.sections.t04!;
  const same = t04.upper.every((u, i) => u === a.l52b08TableI.upper[i]) && t04.lower.every((l, i) => l === a.l52b08TableI.lower[i]);
  out.push({ what: "Sección del 4 %: hoja (tabla I de L51I04a) frente a la tabla I de RM L52B08", computed: same ? "26 estaciones iguales" : "difieren", printed: "iguales", ok: same });
  for (const [name, nominal] of [["t04", 0.04], ["t06", 0.06], ["t09", 0.09], ["root12", 0.12]] as [string, number][]) {
    const m = sectionModel(name);
    out.push({ what: `Espesor máximo de la sección ${name}`, computed: m.maxThickness.toFixed(4), printed: nominal.toFixed(2), ok: Math.abs(m.maxThickness - nominal) < 0.0006 });
  }
  // Planform.
  const ch = chords({ aspectRatio: f.planform.aspectRatio, taperRatio: f.planform.taperRatio, spanIn: f.planform.spanIn });
  out.push({
    what: "Cuerda en el eje, in",
    computed: ch.rootChordIn.toFixed(4),
    printed: "11.430",
    ok: Math.abs(ch.rootChordIn - 11.43) < 0.002,
    note: "con A = 3.5 y b = 24 in da 11.4286; la impresa sale de la superficie redondeada, 2S/(b(1 + λ)) con S = 1.143 pies² da 11.430",
  });
  out.push({ what: "Cuerda en la punta, in", computed: ch.tipChordIn.toFixed(3), printed: "2.286", ok: Math.abs(ch.tipChordIn - 2.286) < 0.0006 });
  const area = (f.planform.spanIn * (ch.rootChordIn + ch.tipChordIn)) / 2 / 144;
  out.push({ what: "Superficie, pies²", computed: area.toFixed(4), printed: "1.143", ok: Math.abs(area - 1.143) < 0.0006 });
  // Ogive.
  const R = f.body.diameterIn / 2;
  const L = f.body.noseLengthIn;
  const rho = (R * R + L * L) / (2 * R);
  out.push({ what: "Radio de la ojiva tangente de 6.61 in sobre 2.25 in de diámetro, in", computed: rho.toFixed(2), printed: "20", ok: Math.abs(rho - f.body.noseOgiveRadiusIn) < 0.05 });
  // Wing position: apex and root quarter chord from the 16.61 in station.
  for (const sweep of ["10.8", "35", "47"]) {
    const cfg = buildConfiguration(`open-${sweep}`);
    const rootQC = cfg.wing.g.xApex + 0.25 * cfg.wing.g.rootChord;
    const printed = f.wingPosition.printedRootQuarterChordIn[sweep]!;
    out.push({ what: `Ala de ${sweep}°: 25 % de la cuerda en el eje, in (RM L52B08, figura 3)`, computed: rootQC.toFixed(3), printed: printed.toFixed(2), ok: Math.abs(rootQC - printed) < 0.011 });
  }
  const apex47 = buildConfiguration("47deg-t04").wing.g.xApex;
  out.push({ what: "Ala de 47°: vértice, in (RM L51I04a, figura 3, según la hoja)", computed: apex47.toFixed(3), printed: f.wingPosition.printedApex47In.toFixed(3), ok: Math.abs(apex47 - f.wingPosition.printedApex47In) < 0.0051 });
  const le47 = buildConfiguration("47deg-t04");
  const leBody = le47.wing.xLE(R);
  const d = leBody - 10.15;
  out.push({
    what: "Ala de 47°: estación donde el borde de ataque toca el fuselaje, in (hoja)",
    computed: leBody.toFixed(3),
    printed: "10.15",
    ok: Math.abs(d) < 0.03,
    note: `difiere en ${d.toFixed(3)} in: con el vértice impreso, 8.748 in, la cota de 10.15 implica una flecha del borde de ataque de ${((Math.atan((10.15 - f.wingPosition.printedApex47In) / R) * 180) / Math.PI).toFixed(2)}° en vez de ${((Math.atan(le47.lines[0]!.tan) * 180) / Math.PI).toFixed(2)}°. Se mantiene la planta de la hoja; la diferencia es cuatro veces la media anchura de I1 y se informa`,
  });
  const ok = out.every((c) => c.ok);
  const md = [
    "# Comprobaciones de geometría",
    "",
    "Generado por `studies/001-wave-drag/run.ts`. Cada cota derivada frente a la impresa que debe reproducir. Solo geometría.",
    "",
    "| Comprobación | Calculado | Impreso | Bien | Nota |",
    "| --- | ---: | ---: | --- | --- |",
    ...out.map((c) => `| ${c.what} | ${c.computed} | ${c.printed} | ${c.ok ? (c.note ? "sí, con nota" : "sí") : "**no**"} | ${c.note ?? ""} |`),
    "",
  ].join("\n");
  return { markdown: md, summary: `${out.filter((c) => c.ok).length} of ${out.length} checks pass`, ok };
}
