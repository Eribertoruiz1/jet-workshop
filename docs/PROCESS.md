# Cómo se trabaja en este repositorio

Léelo después de `CLAUDE.md`, antes de tocar nada. Vale para cualquier sesión, en cualquier carril.

## Papeles

- **Dueño (Eriberto).** Decide la dirección y el producto, da el OK en las compuertas y hace los merges. No audita matemáticas: para eso está el auditor.
- **PM y auditor (Claude, en el chat del proyecto).** Escribe los briefs. En cada compuerta técnica rehace cifras con código propio, desde un clon limpio, y recomienda. Su visto bueno no sustituye al del dueño.
- **Sesiones constructoras (Claude Code).** Cada una ejecuta un brief dentro de un carril.

## Carriles

Un carril es una sesión, un worktree, una rama y un punto de control propio. Los carriles no comparten archivos, así que pueden correr a la vez.

| Carril | Brief | Rama | Es dueño de | Punto de control |
| --- | --- | --- | --- | --- |
| A · Lección | 002 | `lane/lesson` | `apps/web/**`, `packages/validation/src/**`, `.github/**`, `README.md` | `docs/cp/002.md` |
| B · Datos reservados | 003 | `lane/heldout-data` | `tools/digitize/**`, `packages/validation/data/heldout/**`, `packages/validation/test/heldout.test.ts`, `packages/validation/README.md`, `docs/studies/heldout-geometry.md` | `docs/cp/003.md` |
| C · Estudio de método | 004 | `lane/wave-drag-study` | `studies/**`, `docs/studies/001-wave-drag-method.md` | `docs/cp/004.md` |

Reglas de carril:

- Si necesitas cambiar un archivo que es de otro carril, detente y dilo. No lo cambies.
- Solo el carril A cambia dependencias (`package.json`, `pnpm-lock.yaml`).
- `CLAUDE.md`, este archivo, los briefs y `docs/decisions/0001` a `0004` los cambia solo el PM con el OK del dueño.
- Cada carril escribe solo su propio punto de control.

## Arrancar una sesión

En la carpeta del repositorio, con `main` al día:

```
claude --worktree lesson
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

Los worktrees de los carriles B y C se llaman `heldout-data` y `wave-drag-study`. Dentro de su worktree, cada sesión crea su rama con el nombre de la tabla. Un worktree es un checkout nuevo: instala dependencias dentro (`corepack pnpm install`) antes de correr pruebas. El carril B necesita además los PDF de `.cache/`, que no viajan con el worktree: cópialos o descárgalos de nuevo.

Modelo por defecto: Opus 5.5 con `/effort high`. Los subagentes se usan solo donde el brief lo dice.

## Compuertas

- Una compuerta es una parada. La sesión deja la evidencia en su punto de control, hace push y espera.
- **Compuerta técnica** (datos, física, cifras): el PM audita y recomienda; el dueño decide con esa recomendación.
- **Compuerta de producto** (¿se entiende?, ¿se ve bien?): la prueba el dueño en la pantalla. El PM solo comprueba que las cifras mostradas salen de los datos.
- El merge siempre lo hace el dueño, por PR.

## Reglas de evidencia

Este trabajo es casi académico: lo que afirmamos tiene que poder comprobarlo otra persona.

1. **Clases de dato.** `measured`, `NACA faired`, `computed` y `model`. Nunca se presenta una como otra.
2. **Comparar modelo y medida.** Seguimos la estructura de ASME V&V 20. El error de comparación es `E = S − D` (modelo menos dato). La incertidumbre de validación es `u_val = sqrt(u_D² + u_num² + u_input²)`. No es un aprobado o suspenso: se reportan `E` y `u_val`. Si `|E| ≤ u_val`, el error del modelo no se distingue del ruido. Si `|E|` es mucho mayor, el error del modelo vale aproximadamente `E`. Aquí `u_D` es la incertidumbre total del punto medido, `u_input` es la media anchura de la banda del modelo y `u_num` es cero mientras el modelo sea algebraico. Es una adaptación nuestra del estándar, y así se dice donde se use.
3. **Prerregistro.** Métricas, umbrales, particiones de datos y predicciones se escriben y se fusionan antes de mirar el resultado. Todo cambio posterior es una enmienda con fecha, marcada `post hoc`, con su motivo.
4. **Datos reservados.** Lo que vive en `packages/validation/data/heldout/` no se usa para elegir ni ajustar ningún método. Se puntúa una sola vez, contra predicciones ya fusionadas. El PR del carril B no se fusiona hasta que el de predicciones del carril C esté en `main`.
5. **Calibrar no es validar.** Una constante ajustada con un ala se valida con las otras.
6. **Dos lecturas independientes** para todo dato digitalizado. Sirven para cazar errores gruesos, no para medir la incertidumbre.
7. **Nada se da por hecho sin la salida real pegada.** Toda cifra que aparezca en un texto de la aplicación la calcula el código a partir de los datos, y tiene su prueba.
8. **Fórmulas sin confirmar** contra su fuente: `// UNVERIFIED` en el código y lista en el punto de control.

## Decisiones

Cada decisión que cambie una regla, un método o el alcance deja un archivo en `docs/decisions/`, con contexto, decisión, evidencia, alternativas, quién decidió y si es `post hoc`. Las sesiones numeran las suyas con el número de su brief delante, por ejemplo `002-01-titulo.md`.

## Fuentes de este método

- Carriles y worktrees: documentación de Claude Code, "Run agents in parallel" (https://code.claude.com/docs/en/agents) y "Common workflows" (https://code.claude.com/docs/en/common-workflows).
- Error de comparación e incertidumbre de validación: H. W. Coleman, "An Overview of ASME V&V 20" (https://maretec.tecnico.ulisboa.pt/~maretec.daemon/html_files/CFD_workshops/html_files_2008/papers/COLEMAN.pdf).
- Prerregistro en trabajos de modelado: Hofman y otros, "Pre-registration for Predictive Modeling" (https://arxiv.org/pdf/2311.18807v1.pdf).
