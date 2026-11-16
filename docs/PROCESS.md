# Cómo se trabaja en este repositorio

Léelo después de `CLAUDE.md`, antes de tocar nada. Vale para cualquier sesión, en cualquier carril.

## Papeles

- **Dueño (Eriberto).** Decide la dirección y el producto, da el OK en las compuertas y ordena cada merge. No audita matemáticas: para eso está el auditor.
- **PM, ingeniero y auditor (Claude, en el chat del proyecto).** Escribe los briefs y los contratos entre carriles. En cada compuerta técnica rehace cifras con código propio, desde un clon limpio, y recomienda. Su visto bueno no sustituye al del dueño.
- **Sesiones constructoras (Claude Code).** Cada una ejecuta un brief dentro de un carril.

## Carriles

Un carril es una sesión, un worktree, una rama y un punto de control propio. Los carriles no comparten archivos, así que pueden correr a la vez.

| Carril | Brief | Rama y worktree | Es dueño de | Punto de control |
| --- | --- | --- | --- | --- |
| A · Lección | 002 | `lane/lesson`, `lesson` | `apps/web/**` salvo lo cedido a D y E; `packages/validation/src/**`; `packages/validation/test/**` salvo `heldout.test.ts`; `packages/validation/report/**`; `.github/**`; `README.md`; `package.json`, `pnpm-lock.yaml` y `pnpm-workspace.yaml` | `docs/cp/002.md` |
| B · Datos reservados | 003 | `lane/heldout-data`, `heldout-data` | `tools/digitize/**`; `packages/validation/data/heldout/**`; `packages/validation/test/heldout.test.ts`; `packages/validation/README.md`; `docs/studies/heldout-geometry.md` | `docs/cp/003.md` |
| C · Estudio de método | 004 | `lane/wave-drag-study`, `wave-drag-study` | `studies/001-wave-drag/**`; `docs/studies/001-wave-drag-method.md` | `docs/cp/004.md` |
| D · Primer vuelo | 006 | `lane/first-flight`, `first-flight` | `packages/physics/src/flight/**`; `packages/physics/test/flight/**`; `apps/web/flight.html`; `apps/web/src/flight/**`; `apps/web/test/flight/**`; una sola vez, `apps/web/vite.config.ts`, para añadir la página de vuelo | `docs/cp/006.md` |
| E · Motor | 007 | `lane/engine`, `engine` | `packages/physics/src/propulsion/**` salvo `contract.ts`; `packages/physics/test/propulsion/**`; `packages/physics/data/engines/**`; `studies/002-engine-cycle/**`; `docs/studies/002-engine-cycle.md`; en su compuerta 4, `apps/web/engine.html`, `apps/web/src/engine/**` y `apps/web/test/engine/**` | `docs/cp/007.md` |

El brief 005 está reservado: puntuará las predicciones a ciegas del carril C y construirá el método elegido.

Reglas de carril:

- Si necesitas cambiar un archivo que es de otro carril, detente y dilo. No lo cambies.
- **Dependencias externas.** Solo el carril A añade paquetes de npm o cambia `pnpm-lock.yaml`. Si otro carril cree necesitar uno, se detiene y lo dice.
- **Vuelo y motor viven dentro de `packages/physics`**, cada uno en su carpeta, y se importan por `@jet-workshop/physics/flight` y `@jet-workshop/physics/propulsion`. Los carriles D y E no tocan `packages/physics/src/index.ts`, `packages/physics/package.json` ni el resto de `packages/physics/src/`.
- **El contrato entre motor y vuelo** es `packages/physics/src/propulsion/contract.ts`. Lo cambia solo el PM. Si a un carril le falta algo en él, se detiene y lo pide.
- `CLAUDE.md`, este archivo, los briefs y las decisiones numeradas con cuatro cifras los cambia solo el PM con el OK del dueño.
- Cada carril escribe solo su propio punto de control. El PM puede añadir una errata fechada al final de un punto de control cerrado.

## Arrancar una sesión

En la carpeta del repositorio, con `main` al día, el nombre del worktree es el de la tabla:

```
claude --worktree first-flight
```

Y como primer mensaje, el miniprompt del carril:

```
Carril A. Lee CLAUDE.md y docs/PROCESS.md y ejecuta docs/briefs/002-lesson-swept-wings.md.
```

```
Carril B. Lee CLAUDE.md y docs/PROCESS.md y ejecuta docs/briefs/003-heldout-data.md.
```

```
Carril C. Lee CLAUDE.md y docs/PROCESS.md y ejecuta docs/briefs/004-wave-drag-method-study.md.
```

```
Carril D. Lee CLAUDE.md y docs/PROCESS.md y ejecuta docs/briefs/006-first-flight.md.
```

```
Carril E. Lee CLAUDE.md y docs/PROCESS.md y ejecuta docs/briefs/007-engine-workshop.md.
```

Dentro de su worktree, cada sesión crea su rama con el nombre de la tabla. Un worktree es un checkout nuevo: instala dependencias dentro (`corepack pnpm install --frozen-lockfile`) antes de correr pruebas. Los PDF de `.cache/` no viajan con el worktree: cópialos o descárgalos de nuevo.

Modelo por defecto: Opus 5.5 con `/effort high`. El carril E corre con Fable 5.2 y `/effort high` (decisión 0006). Los subagentes se usan solo donde el brief lo dice.

## Compuertas

- Una compuerta es una parada. La sesión deja la evidencia y sus preguntas en su punto de control, hace push y espera.
- **Aviso.** El dueño le dice al PM qué carril paró. El PM lee el punto de control en la rama; no hace falta pegar el informe en el chat. Por eso todo lo que la sesión necesite decidir tiene que estar escrito en el punto de control, no solo en su mensaje.
- **Compuerta técnica** (datos, física, cifras): el PM audita y recomienda; el dueño decide con esa recomendación.
- **Compuerta de producto** (¿se entiende?, ¿se ve bien?, ¿se juega bien?): la prueba el dueño en la pantalla. El PM solo comprueba que las cifras mostradas salen de los datos o del modelo.
- **Merge.** El dueño ordena cada merge, por PR, después de la auditoría del PM y con el CI en verde. La sesión que lo ejecuta fusiona solo el PR que el dueño nombró, con un merge commit, y nunca por iniciativa propia.

## Reglas de evidencia

Este trabajo es casi académico: lo que afirmamos tiene que poder comprobarlo otra persona.

1. **Clases de dato.** `measured`, `NACA faired`, `report text`, `computed` y `model`. Nunca se presenta una como otra. `report text` es una cifra que el informe da en su texto y que no sale de sus curvas: vive en una constante con documento, página y cita.
2. **Comparar modelo y medida.** Seguimos la estructura de ASME V&V 20. El error de comparación es `E = S − D` (modelo menos dato). La incertidumbre de validación es `u_val = sqrt(u_D² + u_num² + u_input²)`. No es un aprobado o suspenso: se reportan `E` y `u_val`. Si `|E| ≤ u_val`, el error del modelo no se distingue del ruido. Si `|E|` es mucho mayor, el error del modelo vale aproximadamente `E`. Aquí `u_D` es la incertidumbre total del punto medido, `u_input` es la media anchura de la banda del modelo y `u_num` es cero mientras el modelo sea algebraico. Es una adaptación nuestra del estándar, y así se dice donde se use.
3. **Prerregistro.** Métricas, umbrales, particiones de datos y predicciones se escriben y se fusionan antes de mirar el resultado. Todo cambio posterior es una enmienda con fecha, marcada `post hoc`, con su motivo.
4. **Datos reservados.** Lo que vive en `packages/validation/data/heldout/` no se usa para elegir ni ajustar ningún método. Se puntúa una sola vez, contra predicciones ya fusionadas. El PR del carril B no se fusiona hasta que el de predicciones del carril C esté en `main`. El PM tampoco abre valores reservados hasta que esas predicciones estén selladas, porque revisa el método que los predice.
5. **Calibrar no es validar.** Una constante ajustada con un ala se valida con las otras; una ajustada con un motor, con otro motor.
6. **Dos lecturas independientes** para todo dato digitalizado. Sirven para cazar errores gruesos, no para medir la incertidumbre.
7. **Nada se da por hecho sin la salida real pegada.** Toda cifra que aparezca en un texto de la aplicación la calcula el código a partir de los datos o del modelo, y tiene su prueba.
8. **Fórmulas sin confirmar** contra su fuente: `// UNVERIFIED` en el código y lista en el punto de control.
9. **Estado en pantalla.** Todo valor de modelo que el jugador ve lleva su estado: `validated`, si el modelo se comparó con medidas en ese rango, o `estimated`, si está fuera de ese rango o no hay medidas. En un juego también: que algo vuele no lo convierte en comprobado.

## Decisiones

Cada decisión que cambie una regla, un método o el alcance deja un archivo en `docs/decisions/`, con contexto, decisión, evidencia, alternativas, quién decidió y si es `post hoc`. Las del PM y el dueño llevan cuatro cifras (`0005-titulo.md`). Las sesiones numeran las suyas con el número de su brief delante, por ejemplo `002-01-titulo.md`.

## Fuentes de este método

- Carriles y worktrees: documentación de Claude Code, "Run agents in parallel" (https://code.claude.com/docs/en/agents) y "Common workflows" (https://code.claude.com/docs/en/common-workflows).
- Error de comparación e incertidumbre de validación: H. W. Coleman, "An Overview of ASME V&V 20" (https://maretec.tecnico.ulisboa.pt/~maretec.daemon/html_files/CFD_workshops/html_files_2008/papers/COLEMAN.pdf).
- Prerregistro en trabajos de modelado: Hofman y otros, "Pre-registration for Predictive Modeling" (https://arxiv.org/pdf/2311.18807v1.pdf).
