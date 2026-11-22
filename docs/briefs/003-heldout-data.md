# Brief 003 · Datos reservados: la serie de espesores y Mach 1.60

Carril B. Rama `lane/heldout-data`. Punto de control: `docs/cp/003.md`, que vive solo en esta rama hasta el final.
Lee antes `CLAUDE.md` y `docs/PROCESS.md`. Decisión que este brief aplica: `docs/decisions/0004`.

## Resultado

Dos informes de la NACA de la misma serie que el spike 1, digitalizados con la herramienta que ya existe, en dos pasadas, como **datos reservados**: medidas que ningún método del proyecto ha visto y contra las que se puntuarán, una sola vez, las predicciones del carril C.

- **NACA RM L51I04a:** el ala de 47° con varios espesores y con la raíz engrosada. Su figura 16(b), el fuselaje aislado, ya está digitalizada y es dato abierto.
- **NACA RM L51K16a:** la serie a Mach 1.60.

Se entrega:

- `docs/studies/heldout-geometry.md`: geometría y condiciones de ensayo, sin un solo resultado.
- `packages/validation/data/heldout/l51i04a.csv` y `l51k16a.csv`, con el mismo esquema exacto que el conjunto actual. La carpeta `heldout/` es la marca de que son reservados.
- La ficha de los dos conjuntos, añadida a `packages/validation/README.md`.
- Las evidencias de lectura: specs y resultados de las dos pasadas, tablas de diferencias y superposiciones.

No cuenta como entrega: datos sin procedencia, una sola pasada, ni ninguna comparación con un modelo.

## Reglas del ciego

Estas reglas son la razón de ser del carril. Si una no se puede cumplir, detente y dilo.

1. **Primero la hoja de geometría.** Es lo único de este carril que entra pronto en `main`, por una rama aparte, `lane/heldout-geometry`, que lleva solo ese archivo. Contiene configuraciones, dimensiones, áreas de referencia, perfiles, números de Mach y de Reynolds ensayados, precisión declarada y correcciones. No contiene valores de resistencia ni de sustentación, ni la forma de ninguna curva, ni frases como "sube antes" o "es mayor".
2. **Los datos no entran en `main`.** El PR de datos se abre y se queda abierto, con el título empezando por `BLIND:`, hasta que el dueño confirme que las predicciones del carril C están fusionadas.
3. **Ningún modelo.** No corras `pnpm validate` ni ninguna función de `packages/physics` sobre estos datos. No comentes cómo le iría a ningún método.
4. **El punto de control no sale de la rama.** Contiene cifras; viaja con el PR de datos.
5. **Nada de resultados fuera de la rama.** Ni en el título ni en la descripción del PR, ni en mensajes de commit.

## Contexto

- La herramienta está en `tools/digitize/` y su README describe el flujo completo: extraer el escaneo, calibrar sobre la rejilla, detectar candidatos, dos pasadas, comparar y superponer. Los specs de L51I04a ya empezados están en `tools/digitize/figures-l51i04a/`.
- Los dos PDF se descargaron en el spike 1 a `.cache/` de la carpeta principal. Un worktree nuevo no los trae: cópialos. Si faltan, descárgalos de NTRS; el dueño ya aprobó esas dos descargas.
- El esquema del CSV y las reglas de incertidumbre son los de `packages/validation/README.md`. La incertidumbre de digitalización es el mayor entre la diferencia de pasadas y un píxel.

## Alcance

Dentro, en este orden de prioridad:

1. Hoja de geometría de los dos informes.
2. L51I04a: polares de resistencia del ala de 47° en cada espesor ensayado y con la raíz engrosada.
3. L51I04a: curvas de sustentación de esas mismas configuraciones.
4. L51K16a: resistencia y sustentación a Mach 1.60 de todas las configuraciones que comparta con la serie.
5. Curvas trazadas por la NACA de resistencia a sustentación nula, si existen, con la clase `NACA faired`.

Fuera (a Tickets):

- Momentos de cabeceo y cualquier otra magnitud.
- Configuraciones que no pertenezcan a esta familia de alas.
- Cualquier cambio en `packages/physics/`, `apps/` o `packages/validation/src/`.

## Ingeniería

- **Cinco Mach primero.** Como en el spike 1: empieza por cinco números de Mach por configuración que cubran todo el rango, y amplía solo si el detector de candidatos lo hace barato.
- **Trabajo en abanico permitido.** Puedes repartir las figuras entre subagentes, o con un workflow dinámico, a razón de un agente por figura y pasada. La pasada A y la pasada B de una misma figura las hacen agentes distintos, sin contexto compartido.
- **Comprobaciones que sí puedes hacer**, porque no usan ningún modelo:
  - El CL de cada punto leído en la figura de sustentación y en la de resistencia.
  - Si el ala de 47° y 4 % de este informe es la misma configuración que la del conjunto abierto, compara los puntos que coincidan y di si son los mismos datos.
  - Un segundo escaneo de la UNT, donde exista, en una figura por informe.

Trampas conocidas:

- **Otro túnel.** L51K16a viene del túnel supersónico de 4 por 4 pies, no del de 8 pies. Puede cambiar el Reynolds, las correcciones y la precisión declarada. No des por buena la precisión del otro informe.
- **¿Los mismos modelos?** El spike 1 anotó que ningún informe dice si son los mismos modelos físicos. Si lo encuentras escrito, va en la hoja de geometría.
- **Orígenes escalonados.** Las polares de esta serie desplazan el origen de CL de cada Mach sobre un eje común. Las dos pasadas tienen que leer cada origen por su cuenta.
- **Símbolos encimados.** En el spike 1 la segunda pasada encontró doce símbolos que la primera no vio. Cuenta los símbolos antes de asignarlos.
- **Fin de línea.** Escribe los resultados con LF.

## Honestidad de datos

- Cada punto con documento, figura, página, las dos lecturas, valor adoptado e incertidumbres.
- Los puntos cuyo centro se colocó a ojo llevan su marca.
- Un punto que solo ve una pasada se comprueba en el escaneo. Si existe, se añade con la nota de que no es independiente. Si no se puede confirmar, queda fuera y se lista.

## Checks de aceptación

1. La hoja de geometría no contiene ninguna cifra de resistencia ni de sustentación. El PM lo comprueba antes del merge.
2. Tabla de diferencias entre pasadas por figura; la regla de parada del 10 % no salta.
3. `pnpm test` pasa con una prueba nueva, `packages/validation/test/heldout.test.ts`, que carga los dos CSV con el lector actual y comprueba su esquema. No cambies el lector: si no admite algo, detente y dilo.
4. Cinco puntos por informe, elegidos por ti y listados con figura y página, para que el PM los relea del escaneo con su propio código.
5. Ninguna ruta personal ni PDF en el repositorio.

## Compuertas

1. **Hoja de geometría.** PR pequeño. El PM comprueba que no lleva resultados; el dueño hace el merge enseguida, porque el carril C la necesita.
2. **Primera figura de cada informe.** Si el escaneo es de otra calidad que el del spike 1, repite el paso 0: una curva, dos pasadas, superposición. Compuerta técnica: audita el PM.
3. **Todo digitalizado.** PR `BLIND:` abierto y sin fusionar. Compuerta técnica: el PM relee los diez puntos.
4. **Desbloqueo.** Cuando el dueño confirme que las predicciones están en `main`, el PR se puede fusionar. No lo decides tú.

## Terminado cuando

- [ ] Las compuertas 1 a 3 pasaron y el PR `BLIND:` está abierto.
- [ ] Los cinco checks están en `docs/cp/003.md` con su salida real.
- [ ] El punto de control lista lo no verificado y los Tickets.
- [ ] El uso de tokens y el tiempo de cada subagente están anotados.

## Modelo y esfuerzo

Opus 5.5 con `/effort high`. Es el mismo trabajo que ya hizo bien en el spike 1: leer escaneos antiguos sin engañarse. Las segundas pasadas, con agentes de contexto fresco.

## Idioma

Respuestas al dueño en español. Código, commits, CSV y fichas en inglés.

## Cierre

Este carril no tiene pantalla. Su valor es que, dentro de unos días, el proyecto pueda decir algo poco habitual: "predijimos estas medidas antes de verlas".

## Enmienda 1 · 15 de noviembre de 2026

Decide el PM, con el OK del dueño, en la compuerta 2. No es `post hoc`: ningún dato reservado se había puntuado.

1. **La figura 11 de RM L51I04a pasa a ser obligatoria.** Es el dato principal del prerregistro del carril C (`studies/001-wave-drag/PREREGISTRATION.md`, regla (a)). Se muestrea, para cada una de las cuatro alas, en los Mach ensayados que da la hoja de geometría, fuera del hueco de Mach 1.04 a 1.08 y solo donde la curva esté dibujada.
2. **Alcance recortado a lo que la prueba a ciegas puntúa, que es resistencia:**
   - RM L51I04a: la figura 11 y las figuras (b) de las alas 2, 3 y 4, a cinco Mach cada una.
   - RM L51K16a: los gráficos de resistencia de las seis configuraciones.
   - Quedan como Tickets las figuras de ángulo de ataque de los dos informes y la figura 6(a) de RM L51I04a.
3. **`47deg-t04` en transónico es réplica.** El PM comprobó con código propio que los 32 puntos de la figura 6(b) coinciden con los de la figura 7(b) de RM L52B08: diferencia máxima de 0.0014 en CL y de 0.00014 en CD. Su punto a Mach 1.60 sigue reservado.
4. **La relectura de diez puntos por el PM** (compuerta 3) pasa a después de que las predicciones del carril C estén en `main`, y antes de puntuar. El PM no abre valores a ciegas antes de ese sello (`docs/PROCESS.md`, regla de evidencia 4).
