# Brief 001 · Spike 1: banco de ala (wing bench)

Versión 1.2, 14 de noviembre de 2026. Cambios frente a la 1.0: precedente publicado para los umbrales, banco de pruebas abierto, digitalización reproducible en dos pasadas, regla de cálculo de la franja de fiabilidad, un paso 0 que prueba primero lo más frágil y notas de reanudación.

Proyecto: Taller de cazas. Nombre de trabajo del repositorio: `jet-workshop`.
Carta: https://claude.ai/artifact/SqWvTZo3xWYxqm8PbAZzbq
Dossier de investigación: https://claude.ai/artifact/HgyLVcLVw5G7nEo2EBwSoH
Guardar este archivo en `docs/briefs/001-spike-wing-bench.md`.

## Resultado

Una aplicación web de una sola pantalla donde muevo la flecha de un ala y veo, en vivo, su resistencia contra el Mach con los puntos que la NACA midió en 1952 encima de la curva del modelo.

El spike responde dos preguntas:

1. ¿Un modelo rápido reproduce datos medidos en la zona transónica, o no?
2. ¿Mover un control y ver responder la física engancha?

Y deja la primera referencia propia del proyecto: los datos de 1952 en formato legible por máquina, con procedencia e incertidumbre, y un banco de pruebas que puntúa cualquier modelo contra ellos. No encontramos esos datos publicados así en ninguna parte.

Se entrega:

- Un repositorio público con tres paquetes: `packages/physics`, `packages/validation` y `apps/web`.
- `pnpm test` ejecuta todas las pruebas y `pnpm validate` genera el informe de validación.
- `pnpm dev` abre el banco de ala en el navegador.
- Un punto de control en `docs/cp/001.md` con la evidencia.

No cuenta como entrega: un plan, un mockup, capturas sin código que corra, ni un informe de validación escrito a mano.

## La vara

Un instrumento científico refinado: un informe de la NACA de 1952 que cobra vida. Referencias de clase: el ensayo interactivo "Airfoil" de Bartosz Ciechanowski (cada control cambia una sola cosa) y el banco de motores de Automation (la curva responde a cada decisión).

El primer vistazo debe sostenerse solo como una figura de informe técnico bien hecha.

## Contexto

- Proyecto nuevo, sin código previo. La investigación ya está hecha; no investigues de nuevo lo que está en el dossier.
- Stack: monorepo pnpm, TypeScript estricto, Vitest, Vite, React. Versiones estables actuales, fijadas de forma exacta en `package.json`.
- El repositorio nace con la base del reglamento: `CLAUDE.md` corto, `.claude/settings.json` con la base de deny, un solo comando de pruebas, `REVIEW.md`, `docs/briefs/` y `docs/cp/`. Si gfl-harness v0.1 ya está publicado, úsalo para generarla; si no, créala a mano.
- Tras la compuerta 1, crea el repositorio en GitHub como público con `gh repo create`, en la cuenta del dueño. El primer commit, con la base del reglamento, va a `main`. Todo lo demás va en la rama `spike/wing-bench` y entra por PR.
- Es público desde el primer commit. Trátalo así: sin secretos, sin rutas personales, sin PDF de terceros.
- No añadas archivo `LICENSE`: la licencia es una decisión pendiente del dueño, para el código y para los datos. El README dice "License: not yet chosen. All rights reserved until a license is added."

## Referencias

- Datos medidos: R. P. Bielat, NACA RM L52B08 (1952). PDF: https://ntrs.nasa.gov/api/citations/19930087036/downloads/19930087036.pdf
- Precedente del método: O. Gur, W. H. Mason y J. A. Schetz, "Full-Configuration Drag Estimation", Journal of Aircraft 47(4), 2010. https://doi.org/10.2514/1.47557
- Método transónico: W. H. Mason, Configuration Aerodynamics, capítulo de aerodinámica transónica: https://pressbooks.lib.vt.edu/configurationaerodynamics/chapter/transonic-aerodynamics/
- Eficiencia de Oswald: R. Stengel, Princeton MAE 331, lección 5: https://stengel.mycpanel.princeton.edu/MAE331Lecture5.pdf

Lo que la investigación dice del informe de Bielat, a confirmar contra el PDF. Si el PDF dice otra cosa, manda el PDF y lo anotas en el punto de control:

- Tres alas sobre un mismo fuselaje, en el túnel transónico de 8 pies de Langley.
- Alargamiento 3.5, estrechamiento 0.2, espesor 4%, perfiles NACA serie 65A con curvatura.
- Flecha en el cuarto de cuerda: 10.8°, 35° y 47°.
- Mach 0.50 a 1.12 aproximadamente; ángulo de ataque de -2° a 12°; Reynolds de 2.0 a 2.5 millones sobre la cuerda media.
- Precisión declarada: CL ±0.01, CD ±0.001, Cm ±0.004.
- Casi todo está en figuras; las coordenadas del perfil están en tabla.

Lo que dice el precedente de Gur, Mason y Schetz, que usa este mismo método (Korn con teoría simple de flecha y la ley de Lock). Lo leí de un resumen del artículo; confírmalo contra el artículo si tienes acceso:

- Ala aislada a baja velocidad: CD0 dentro de unas 8 cuentas de resistencia, con unas 10 de incertidumbre del ensayo. Una cuenta es 0.0001.
- Ala aislada de 35° de flecha y alargamiento 5 (ensayo de Tinling y Kolk): CD0 dentro de unas 20 cuentas hasta Mach 0.9. El acuerdo empeora al subir la sustentación y el Mach.
- Pendiente de sustentación: buena hasta el Mach crítico, mala por encima.
- Conjunto ala y fuselaje DLR-F4: la resistencia del fuselaje queda dentro de las 10 cuentas de incertidumbre del ensayo. La polar ajusta bien con un factor de Korn de 0.91.

## Paso 0: lo más frágil, primero

Todo el spike depende de poder leer figuras escaneadas de 1952 con suficiente precisión. Eso se prueba antes de construir nada más:

1. Comprueba el entorno: `node`, `pnpm`, `gh auth status` y Python para las herramientas de digitalización. Si falta algo, dame la lista y detente.
2. Descarga el PDF a `.cache/`, que queda fuera de git.
3. Digitaliza una sola curva de punta a punta, en dos pasadas: la resistencia contra el Mach del ala de 35° a sustentación baja. Si el informe no la da directa, usa la polar de esa ala a un solo Mach.
4. Enséñame la superposición sobre la figura escaneada y la diferencia entre pasadas.

Si la lectura no baja de la precisión declarada del ensayo, lo sabremos en una hora y no al final. En ese caso no sigas: propón alternativas, como la otra copia escaneada del informe en la biblioteca digital de la UNT (https://digital.library.unt.edu/ark:/67531/metadc59179/) u otro conjunto de datos.

## Alcance

Dentro:

- `packages/validation`: datos digitalizados del informe en CSV, la función de puntuación y la ficha del conjunto de datos.
- `packages/physics`: funciones puras en TypeScript, sin dependencias del navegador, para el ala y el fuselaje: pendiente de sustentación, resistencia inducida, resistencia parásita y subida transónica.
- `apps/web`: la pantalla del banco de ala.

Fuera (cada punto va a Tickets en el punto de control, no se construye):

- Vista 3D, react-three-fiber y materiales. El ala se dibuja en planta, en 2D.
- Resistencia de onda por distribución de áreas, fuselaje paramétrico y regla de áreas: es el spike 2.
- Fábrica de referencias: CFD abierto (SU2) validado contra estos mismos datos, para calcular alas que nadie ha medido. Es un spike aparte.
- Segundo conjunto de datos: el ala aislada de Tinling y Kolk. Ver la compuerta 3.
- Diagrama E-M, motor, pesos y vuelo de prueba.
- Formas furtivas, cuentas, pagos, despliegue público.

## Banco de pruebas

La validación se construye como un banco de pruebas reutilizable, no como una comprobación de una sola vez.

- **Contrato de modelo.** Un modelo es una función `(wing, condition) => { cl, cd, valid }`. Cualquier modelo que cumpla el contrato se puntúa con `pnpm validate`.
- **Dos modelos desde el primer día.** `baseline-incompressible`: suma de fricción y resistencia inducida, sin compresibilidad ni subida de onda. `korn-mason-lock`: el nuestro. El informe muestra cuánto mejora el nuestro sobre la línea base; si no mejora, se dice.
- **Tres medidas por tramo de Mach.** Error absoluto, error en múltiplos de la incertidumbre de cada punto y mejora sobre la línea base.
- **Una sola función de puntuación.** `pnpm validate` y la aplicación usan la misma. La franja de fiabilidad de la pantalla sale de ahí.
- **Ficha del conjunto de datos.** `packages/validation/README.md` describe la fuente, la geometría ensayada, las áreas y cuerdas de referencia, qué grafica cada figura, el esquema del CSV, el método de digitalización, la incertidumbre, las limitaciones conocidas y cómo citarlo.

Cada punto del CSV lleva: documento, figura, página, ala, Mach, variable, valor de cada pasada, valor adoptado, incertidumbre de digitalización e incertidumbre total.

## Ingeniería

Ecuaciones confirmadas contra fuentes abiertas:

- Divergencia de resistencia (Korn con extensión de Mason): `Mdd = kA/cos(L) - (t/c)/cos^2(L) - CL/(10*cos^3(L))`, con `kA = 0.87` para perfiles NACA serie 6. `L` es la flecha a media cuerda en la versión por franjas.
- Mach crítico: `Mcrit = Mdd - (0.1/80)^(1/3)`, es decir `Mdd - 0.1077`.
- Subida de resistencia (Lock): `dCD = 20*(M - Mcrit)^4` para `M > Mcrit`. Aplícala por franjas de envergadura, ponderada por `S_franja/S_ref`.
- Eficiencia de Oswald: ala recta `e = 1.78*(1 - 0.045*A^0.68) - 0.64`; ala con flecha de borde de ataque mayor de 30°: `e = 4.61*(1 - 0.045*A^0.68)*cos(LLE)^0.15 - 3.1`. Factor de resistencia inducida `K = 1/(pi*A*e)`.

Ecuaciones sin confirmar. Impleméntalas, pero márcalas en el código con `// UNVERIFIED: check against Raymer, Aircraft Design, 6th ed.` y lístalas en el punto de control:

- Interpolación de Oswald entre 0° y 30° de flecha.
- Pendiente de sustentación subsónica (Helmbold, forma de DATCOM y Raymer) con corrección de compresibilidad.
- Fricción turbulenta de placa plana y factores de forma del ala.
- Fuselaje como cuerpo de revolución con fricción y factor de forma, que es el camino de Gur, Mason y Schetz.
- Conversión de flecha entre fracciones de cuerda: `tan(Ln) = tan(Lm) - (4/A)*(n - m)*(1 - lambda)/(1 + lambda)`.

Trampas conocidas:

- **Ala con fuselaje.** Los datos son del conjunto ala más fuselaje. Antes de comparar el CD0 absoluto, determina qué incluye la medida (fuselaje, correcciones de base, soporte) y modela el fuselaje como componente aparte. Si no puedes hacerlo con honestidad, compara la subida de resistencia respecto a Mach 0.6 y dilo.
- **Áreas de referencia.** Usa exactamente el área y la cuerda de referencia del informe. Un error aquí invalida todo.
- **Reynolds de túnel.** La fricción se calcula con el Reynolds del ensayo, no con uno de vuelo. La transición de la capa límite en el modelo es incierta: entra en la banda de incertidumbre.
- **Perfil con curvatura.** La sustentación a ángulo cero no es nula y la resistencia mínima no cae en CL = 0.
- **Límite de la ley de Lock.** La cuarta potencia crece sin control más allá de `Mdd + 0.05` aproximadamente. Ahí el modelo no es válido: no lo extiendas, márcalo.
- **Factor de Korn.** El precedente obtuvo su mejor ajuste con 0.91 en un ala de transporte. No lo muevas de 0.87 para pasar los umbrales; si lo calibras, aplica la regla de calibración de abajo.
- **Digitalizar figuras de 1952.** La incertidumbre de lectura puede ser del mismo orden que la precisión del ensayo. Se mide con dos pasadas independientes.

## Digitalización en dos pasadas

- La digitalización es un script en `tools/digitize/`, no un trabajo a mano. Guarda por figura la calibración de ejes (píxeles de las marcas y sus valores) y los píxeles de cada punto, para que cualquiera pueda repetirla y auditarla. Python se admite solo ahí.
- Cada figura se digitaliza dos veces. La segunda pasada la hace un subagente de contexto fresco que no ve la primera.
- La diferencia punto a punto entre pasadas es la incertidumbre de digitalización de ese punto.
- La incertidumbre total de un punto suma en cuadratura la precisión declarada del informe y la de digitalización.
- Si las dos pasadas difieren en más que la precisión declarada del ensayo en más del 10% de los puntos de una figura, detente y avísame.

## Honestidad de datos

Tres clases, siempre rotuladas en pantalla y en el código:

- **Medido:** los puntos de la NACA, con barras de incertidumbre total.
- **Modelo:** nuestras curvas.
- **Fuera de rango:** tramos donde el modelo no es válido.

Reglas:

- No ajustes constantes para que las pruebas pasen. Si calibras una constante con estos datos, hazlo solo con el ala de 35°, rotúlala `calibrated on Bielat 35° wing` y valida con las de 10.8° y 47°.
- El informe de validación lo genera `pnpm validate` a partir de los datos. Nunca se escribe a mano.
- Si un umbral no se cumple, se reporta el error real. No se esconde ni se suaviza.
- No se interpolan ni se suavizan los puntos medidos.
- La franja de fiabilidad se calcula; nunca se asigna a mano.

## Checks de aceptación

Ejecutables, con salida real pegada en el punto de control:

1. `pnpm test` pasa. Incluye pruebas de propiedades: `Mdd` sube con la flecha, la subida de resistencia es monótona con el Mach, `K` baja al subir el alargamiento.
2. `pnpm validate` produce una tabla por ala y por tramo de Mach con las tres medidas, para los dos modelos.
3. El CD0 hasta Mach 0.9 se clasifica en una de cuatro bandas:
   - Hasta ±0.0010: dentro de la precisión declarada del ensayo.
   - Hasta ±0.0015: objetivo de la carta.
   - Hasta ±0.0020: iguala el precedente publicado del método.
   - Más de ±0.0020: peor que el precedente. Busca primero un error nuestro en áreas de referencia, fuselaje o Reynolds antes de culpar al método.
4. Entre Mach 0.9 y 1.12, objetivo de ±0.003. Es una propuesta nuestra: el precedente solo dice que el acuerdo empeora ahí.
5. Pendiente de sustentación dentro de ±10% hasta el Mach crítico. Por encima se reporta sin umbral, porque el precedente ya avisa de que el método falla ahí.
6. Mach del inicio de la subida dentro de ±0.03. Propuesta nuestra.
7. `pnpm typecheck` y `pnpm lint` sin errores. Consola del navegador limpia.

No cumplir un umbral no es un fallo del spike: es su resultado. Lo que sí es un fallo es no reportarlo.

## Dirección de arte

Color con su rol. La interfaz queda neutra; el color es contenido.

| Token | Hex | Rol |
| --- | --- | --- |
| page | #F5F6F8 | Fondo de la página |
| surface | #FFFFFF | Área de las gráficas |
| ink | #15181C | Texto, ejes y marcadores medidos |
| ink-2 | #5B6470 | Texto secundario y etiquetas de eje |
| grid | #DDE1E6 | Rejilla y líneas finas |
| accent | #1F5FBF | La curva del modelo y el ala en planta |
| ok | #1E8E5A | Fiabilidad: validado |
| warn | #B7791F | Fiabilidad: estimación |
| stop | #C0392B | Fiabilidad: fuera del rango del modelo |

- Tipografía: B612 para texto y B612 Mono para cifras, alojadas en el proyecto con los paquetes de Fontsource. Las cifras siempre llevan unidades.
- Verde, ámbar y rojo se usan solo en la franja de fiabilidad y en el trazo de la curva. En ningún otro lugar.
- Los puntos medidos son círculos huecos en tinta, como en una figura de la NACA.
- El único elemento memorable: los puntos de 1952 con sus barras cayendo sobre la curva mientras muevo la flecha.

## Layout y copy literal

La interfaz va en inglés.

- Arriba a la izquierda, título `Wing bench` y debajo `Three wings measured by NACA in 1952. One model. See where they agree.`
- Columna izquierda, un tercio del ancho: el ala en planta como dibujo técnico, con envergadura, cuerda de raíz y ángulo de flecha acotados. Debajo, los controles.
- Tres botones de ala ensayada: `NACA wing · 10.8° sweep`, `NACA wing · 35° sweep`, `NACA wing · 47° sweep`.
- Controles: `Quarter-chord sweep`, `Aspect ratio`, `Thickness ratio`, `Lift coefficient`. Cada uno muestra su valor en B612 Mono.
- Columna derecha, arriba y grande: `Drag coefficient vs Mach`, con la franja `Model reliability` bajo el eje de Mach y sus tres estados: `validated`, `estimate`, `outside model range`.
- Columna derecha, abajo, dos gráficas pequeñas: `Lift curve` y `Drag polar`.
- Leyenda: `Measured (NACA, 1952)` y `Model`.
- Sin datos para el ala actual: `No measured data for this wing. Curve shows the model only.`
- Con datos, pero con el modelo fuera de banda: `Measured data here disagrees with the model by more than the published precedent.`
- Sobre el tramo rojo: `Beyond this Mach number the drag-rise model is not valid. Measured points continue; the model stops.`
- Error de carga: `Could not load validation data.`
- Pie: `Measured data: R. P. Bielat, NACA RM L52B08 (1952), Langley 8-foot transonic tunnel. Digitized twice from figures; error bars include digitization uncertainty. Model: Korn–Mason with Lock's fourth-power law; Oswald efficiency after Raymer. Validation bands after Gur, Mason & Schetz, J. Aircraft 47(4), 2010.`

## Comportamiento

- Los puntos medidos aparecen solo cuando la geometría coincide con un ala ensayada. Entre alas ensayadas la curva es solo modelo, y el texto lo dice.
- Mover un control actualiza las tres gráficas y el dibujo en planta en el mismo cuadro.
- La franja de fiabilidad se calcula por tramo de Mach con la función de puntuación:
  - `validated`: hay datos medidos en ese tramo y el modelo cae dentro de ±0.0020.
  - `estimate`: no hay datos medidos en ese tramo, o los hay y el modelo cae fuera de la banda. En el segundo caso aparece el texto de desacuerdo.
  - `outside model range`: Mach por encima de `Mdd + 0.05`, o fuera del rango declarado de alguna ecuación.
- En el tramo fuera de rango la curva pasa a trazo discontinuo en rojo y los puntos medidos siguen visibles.
- Las gráficas son SVG propio con d3-scale y d3-shape. Sin librerías de gráficos con estilo propio.

## Prohibido

- Tarjetas de dashboard, paneles flotantes, sombras, gradientes y brillos en la interfaz.
- Efectos sin dato detrás: partículas, estelas, animaciones de entrada.
- Emojis o símbolos sueltos como iconos.
- Colores fuera de la tabla de tokens.
- Cifras sin unidades o sin fuente.
- La palabra "real-time" o "accurate" en la interfaz.
- Cualquier dato inventado, incluidos datos de aviones reales.
- Presentar un valor calculado como si fuera medido.

## Orden de sacrificio

Si no alcanza, se completa en este orden y se corta desde el final:

1. Datos digitalizados en dos pasadas, con procedencia y ficha.
2. Física, pruebas, los dos modelos y el informe de validación.
3. Gráfica de resistencia contra Mach con puntos medidos y franja de fiabilidad calculada.
4. Botones de alas ensayadas y control de flecha.
5. Los otros controles.
6. Curva de sustentación y polar.
7. Dibujo en planta acotado.

## Verificación antes de entregar

No entregues justo después de escribir el código. Corre, captura, revisa y corrige:

- Para tres figuras del informe, una imagen con los puntos de las dos pasadas dibujados encima de la figura escaneada, con el mismo mapeo de ejes.
- Salida real de `pnpm test` y `pnpm validate`.
- Capturas de la aplicación en las tres alas ensayadas y en un ala sin datos.
- Un revisor de contexto fresco que reporta solo brechas de corrección o de requisitos. Máximo tres rondas.
- Di qué no se verificó.

## Compuertas

Trabaja de forma autónoma salvo en estos puntos, donde te detienes y esperas mi OK:

1. **Antes de empezar:** confirma nombre del repositorio (`jet-workshop` por defecto) y que nace sin licencia. Si el mensaje de arranque ya lo confirma, no preguntes.
2. **Tras el paso 0:** me muestras la primera curva digitalizada. Decido si se sigue.
3. **Tras digitalizar todo:** me muestras las tres imágenes de superposición y la tabla de diferencias entre pasadas. Reviso cinco puntos contra el PDF.
4. **Si el CD0 queda peor que el precedente y no encuentras un error nuestro:** me propones replicar el caso publicado, el ala aislada de Tinling y Kolk, antes de concluir nada. Lo mismo si los datos no permiten comparar el CD0 absoluto.
5. **Al terminar:** abres un PR. El merge lo hago yo.

Al cerrar cada compuerta, anota en `docs/cp/001.md` qué se hizo, qué sigue y qué quedó abierto, y haz commit. Si la sesión se corta, la siguiente empieza leyendo ese archivo y continúa desde ahí.

Paradas aceptables fuera de las compuertas: un secreto, una escritura en producción, una decisión de dirección o un archivo de otro carril.

## Terminado cuando

- [ ] Las cinco compuertas pasaron.
- [ ] Los checks de aceptación están en `docs/cp/001.md` con su salida real, para los dos modelos.
- [ ] La ficha del conjunto de datos está completa.
- [ ] El punto de control lista las ecuaciones sin confirmar, la banda en la que cayó cada ala y los Tickets fuera de alcance.
- [ ] El uso real de tokens y el tiempo de agente están anotados.

## Modelo y esfuerzo

Opus 5.5 con `/effort high`. Es trabajo de corrección sutil: leer un informe escaneado de 1952, respetar sus áreas de referencia y no engañarse con los propios resultados. Sin ultracode. Los únicos subagentes son los de contexto fresco: la segunda pasada de digitalización y la revisión final. Fable solo si Opus falla dos veces en lo mismo.

## Idioma

Respuestas en español. Código, commits e interfaz en inglés.

## Cierre

Debe sentirse como una figura de informe técnico que respira: sobria, exacta y con una sola sorpresa.

Prueba de aceptación: abro la aplicación, pulso `NACA wing · 35° sweep`, muevo la flecha hasta 47° y veo desplazarse el muro transónico. En cada ala ensayada, los puntos de 1952 aparecen con sus barras, y puedo ver de un vistazo dónde el modelo acierta, dónde estima y dónde deja de valer.

## Enmienda 1 (15 de noviembre de 2026)

Decisión del dueño para la compuerta 2, si las superposiciones del paso 0 se ven bien. Prevalece sobre el texto anterior donde lo contradiga.

1. "Measured" son solo los símbolos de las polares (figuras 5(b), 6(b) y 7(b)). El modelo se puntúa en el CL y el Mach de cada símbolo, sin interpolar.
2. La figura 9 entra como una tercera clase, "NACA faired curve (1952)": una línea sin símbolos en la gráfica de resistencia contra Mach. Nunca bajo "Measured". Su comparación con el modelo se reporta aparte.
3. Comprobación cruzada: los símbolos de baja sustentación deben caer sobre la curva de la figura 9 dentro de la precisión del ensayo. Si no, hay un error de lectura.
4. Las bandas de CD0 se aplican a los símbolos con |CL| ≤ 0.1.
5. Empieza por cinco valores de Mach por ala que cubran todo el rango. Amplía solo si la herramienta lo hace barato; el resto va a Tickets.
6. Los símbolos medidos se muestran en la polar, con un selector de Mach ensayado.
7. Dime si la pasada B recalibró la rejilla o reutilizó la calibración de la A. Si la reutilizó, que recalibre una figura por su cuenta: la diferencia entre pasadas tiene que cubrir también la calibración.
8. Cuando entre la primera prueba, quita `--passWithNoTests` del comando de pruebas.
