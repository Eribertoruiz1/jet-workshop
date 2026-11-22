/**
 * Markdown and JSON of the numerical verification. Generated; no figure by hand.
 */

import type { VerificationResult } from "./verification.ts";

const pct = (v: number): string => `${(100 * v).toFixed(2)} %`;
const f5 = (v: number): string => v.toFixed(5);

export function verificationMarkdown(v: VerificationResult): string {
  const L: string[] = [];
  const iN0 = v.ns.indexOf(v.n0);
  const iMf = v.ms.length - 1;
  L.push("# Verificación numérica de la integral de resistencia de onda");
  L.push("");
  L.push("Generado por `studies/001-wave-drag/run.ts`. No editar a mano. Ningún dato de resistencia: solo casos de solución conocida y la geometría de las alas. Todos los valores son `computed`.");
  L.push("");
  L.push("## Niveles fijados");
  L.push("");
  L.push(`- **N₀ = ${v.n0}** términos de la serie de Fourier (el suavizado). Es el menor de ${v.ns.join(", ")} que reproduce los casos 1, 2, 4 y 5 dentro del ${pct(0.01)} con ${v.ms[iMf]} nodos por tramo en θ, y con el que el caso 3 converge en N₀, 2N₀ y 4N₀ con la regla de meseta del prerregistro (A.7).`);
  L.push(`- **m₀ = ${v.m0}** nodos de Gauss-Legendre por tramo en θ. Es el menor de ${v.ms.join(", ")} que hace lo mismo con N₀.`);
  L.push(`- Regla en θ: Gauss-Legendre compuesta en [0, π/2], partida en los ángulos singulares β cos θ* = |tan Λ| de cada línea de estación tabulada, con subdivisión geométrica (razón ${v.grading.ratio}, tramo menor ${v.grading.smallest} rad) hacia las líneas fuertes: borde de ataque, estación del 0.5 % y borde de salida.`);
  L.push("- Cuadratura en φ: regla del punto medio con 8 N_max puntos (como mínimo 512). No es un suavizado.");
  L.push(`- Barrido de convergencia de cada condición: N en ${v.n0}, ${2 * v.n0} y ${4 * v.n0} con ${4 * v.m0} nodos por tramo; nodos en ${v.m0}, ${2 * v.m0} y ${4 * v.m0} con N = ${4 * v.n0}.`);
  L.push("");
  L.push("## Casos de solución conocida");
  L.push("");
  L.push("Error relativo, calculado menos exacto, dividido por el exacto.");
  L.push("");
  L.push("- Caso 1: cuerpo de Sears-Haack, D/q = (9π/2)(A_max/l)² (Jones, Report 1284, ec. A3, p. 762).");
  L.push(`- Caso 2: cuerpo de arco parabólico, D/q = (128/3π)(A_max/l)². Forma cerrada deducida aquí por dos vías (\`UNVERIFIED\` en fuente impresa); la suma de la serie que usa vale ${v.parabolicSeries.toFixed(12)} frente a 1/24 = ${(1 / 24).toFixed(12)}.`);
  L.push("- Caso 4: ala elíptica de perfil biconvexo (Jones, Report 1284, ec. A5, p. 762).");
  L.push("- Caso 5: ala rectangular de perfil biconvexo frente a 16τ²/(3β) de Ackeret (`UNVERIFIED` en fuente; confirmada como límite del caso 4).");
  L.push("");
  L.push(`### Contra N, con ${v.ms[iMf]} nodos por tramo en θ`);
  L.push("");
  L.push(`| Caso | Configuración | Mach | ${v.ns.map((n) => `N = ${n}`).join(" | ")} |`);
  L.push(`| --- | --- | ---: | ${v.ns.map(() => "---:").join(" | ")} |`);
  for (const r of v.rows) L.push(`| ${r.case} | ${r.label} | ${r.mach.toFixed(2)} | ${r.relErr.map((row) => pct(row[iMf]!)).join(" | ")} |`);
  L.push("");
  L.push(`### Contra el número de nodos por tramo en θ, con N₀ = ${v.n0}`);
  L.push("");
  L.push(`| Caso | Configuración | Mach | ${v.ms.map((m) => `m = ${m}`).join(" | ")} |`);
  L.push(`| --- | --- | ---: | ${v.ms.map(() => "---:").join(" | ")} |`);
  for (const r of v.rows) L.push(`| ${r.case} | ${r.label} | ${r.mach.toFixed(2)} | ${r.relErr[iN0]!.map((e) => pct(e)).join(" | ")} |`);
  L.push("");
  L.push("**Lo que dice el caso 5.** El error no cae como 1/(βA), como esperaba el plan: con la regla en θ fijada, el ala rectangular da el valor de Ackeret con cualquier alargamiento de la tabla. La resistencia por espesor de un ala rectangular de bordes supersónicos no depende del alargamiento en estos casos (resultado calculado, sin fuente). Con la regla del punto medio en θ, en cambio, el error crecía como βA/n_θ: la singularidad de D′(θ) en θ = π/2 es lo que obligó a cambiar la regla.");
  L.push("");
  L.push("## Caso 3: ojiva y cilindro del modelo, cuerpo solo");
  L.push("");
  L.push(`| Mach | CD con N = ${v.n0} | N = ${2 * v.n0} | N = ${4 * v.n0} | Meseta |`);
  L.push("| ---: | ---: | ---: | ---: | --- |");
  for (const o of v.ogive) L.push(`| ${o.mach.toFixed(2)} | ${o.cd.map(f5).join(" | ")} | ${o.converged[0] ? "sí" : "no"} |`);
  L.push("");
  L.push("CD sobre la superficie de referencia de 1.143 pies². A Mach mayor que 1 el corte de Mach del cuerpo de revolución se proyecta de forma exacta, no con la aproximación de cuerpo esbelto.");
  L.push("");
  L.push("## Autocomprobación del cálculo de áreas");
  L.push("");
  L.push(`La integral rápida a lo largo de la envergadura frente a la de referencia (tramos y punto medio), en ${v.selfCheck.samples} cortes al azar de las seis geometrías y sus variantes de nariz, borde de salida, interpolación y raíz: mayor diferencia relativa ${v.selfCheck.worstRelative.toExponential(1)}.`);
  L.push("");
  L.push("## La afirmación del PM sobre la nariz redondeada");
  L.push("");
  L.push(`Barrido en N hasta ${v.noseNs[v.noseNs.length - 1]} sobre las alas reales con borde de ataque supersónico o sónico, con nariz poligonal (nominal) y redondeada (I8), m₀ nodos por tramo en θ. CD de onda del conjunto ala-fuselaje (A2).`);
  L.push("");
  L.push(`| Configuración | Mach | Mn borde de ataque | Nariz | ${v.noseNs.map((n) => `N = ${n}`).join(" | ")} |`);
  L.push(`| --- | ---: | ---: | --- | ${v.noseNs.map(() => "---:").join(" | ")} |`);
  for (const r of v.nose) L.push(`| ${r.config} | ${r.mach.toFixed(3)} | ${r.normalMachLE.toFixed(3)} | ${r.nose === "rounded" ? "redondeada" : "poligonal"} | ${r.cd.map(f5).join(" | ")} |`);
  L.push("");
  L.push("Incremento de CD en cada duplicación de N:");
  L.push("");
  L.push(`| Configuración | Mach | Nariz | ${v.noseNs.slice(1).map((n) => `→ ${n}`).join(" | ")} | Tendencia al final |`);
  L.push(`| --- | ---: | --- | ${v.noseNs.slice(1).map(() => "---:").join(" | ")} | --- |`);
  for (const r of v.nose) {
    const inc = r.cd.slice(1).map((x, i) => x - r.cd[i]!);
    const n = inc.length;
    const trend = inc[n - 1]! <= inc[n - 2]! / 2 ? "decrece: converge" : inc[n - 1]! >= inc[n - 2]! ? "crece o se mantiene: no converge" : "decrece despacio";
    L.push(`| ${r.config} | ${r.mach.toFixed(3)} | ${r.nose === "rounded" ? "redondeada" : "poligonal"} | ${inc.map(f5).join(" | ")} | ${trend} |`);
  }
  L.push("");
  L.push("Una divergencia logarítmica da el mismo incremento en cada duplicación; una que crece más deprisa, incrementos crecientes. La lectura de esta tabla está en `docs/cp/004.md` y en el estudio.");
  L.push("");
  L.push(`Tiempo de esta verificación: ${v.seconds.toFixed(0)} s.`);
  L.push("");
  return L.join("\n");
}
