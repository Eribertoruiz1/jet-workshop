# 0006 · El motor lo diseña el jugador

Fecha: 15 de noviembre de 2026. Decide: el dueño.

## Contexto

Para volar hace falta un motor. El dueño propuso no elegirlo de una lista, sino inventarlo: un motor eficiente, tan guiado por la física que, si falla, se rompe por una causa real.

## Decisión

1. **El jugador diseña el motor** con pocas decisiones: cuánto aire traga, cuánto lo comprime, a qué temperatura quema y si lleva postquemador. La física devuelve el empuje y el consumo a cada velocidad y altura.
2. **Los fallos salen de límites reales:** la temperatura que aguanta la turbina, el compresor que se ahoga, la llama que se apaga en altura, el combustible que no alcanza. Buscar eficiencia empuja hacia esos límites; pasarlos rompe el motor.
3. **Lo que no se promete.** El juego no afirma haber descubierto un motor mejor que los reales. Enseña por qué los motores reales son como son.
4. **Comprobación, con el mismo método de las alas.**
   - Un motor real con medidas públicas sirve para desarrollar el modelo: el J47 (NACA RM E9G09 y RM E52L16).
   - Otro queda reservado para una predicción a ciegas: el J71 (NACA RM E56B16). El J85 queda reservado de forma provisional, hasta que el PM confirme qué medidas públicas hay.
   - Hasta que la prueba a ciegas pase, el motor se ve en pantalla como estimado fuera de lo comparado con el J47.
5. **Quién lo construye.** El carril E corre con Fable 5.2 y `/effort high`, por decisión del dueño, con investigación y pruebas propias y aisladas.
6. **Independencia de la revisión.** El PM también es Fable 5.2, así que constructor y auditor compartirían puntos ciegos. Por eso, antes de cada compuerta del carril E, un revisor de contexto limpio con Opus 5.5 revisa el trabajo siguiendo `REVIEW.md`. El PM sigue rehaciendo cifras con código propio.
7. **El contrato entre motor y vuelo** (`packages/physics/src/propulsion/contract.ts`) lo escribe y lo cambia el PM.

## Por qué

- La termodinámica de un motor a reacción está mejor establecida que la aerodinámica cerca de Mach 1, y hay motores medidos en instalaciones de altura con informes públicos.
- Diseñar el motor y verlo fallar enseña más que elegir uno.

## Para el reglamento del dueño

Fable 5.2 es un modelo nuevo como constructor en este proyecto. Este carril cuenta como la primera de las tres a cinco tareas de la mini-evaluación que el reglamento pide antes de cambiar la tabla de modelos. Sus compuertas son la medida.

## Alternativas descartadas

- **Una tabla de motores reales.** Es más rápida, pero el jugador no decide nada y no hay nada que pueda fallar por su diseño.
- **Un motor con fórmulas de juego.** Rompe la promesa del proyecto.
