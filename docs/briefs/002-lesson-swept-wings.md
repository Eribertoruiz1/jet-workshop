# Brief 002 · Lección 1: por qué los cazas llevan las alas en flecha

Carril A. Rama `lane/lesson`. Punto de control: `docs/cp/002.md`.
Lee antes `CLAUDE.md` y `docs/PROCESS.md`. Decisiones que este brief aplica: `docs/decisions/0001`, `0002` y `0003`.

## Resultado

El dueño abrió el banco de ala y dijo: "se mueve bastante bien, pero entiendo muy poco de lo que pasa en la pantalla". Este brief arregla eso.

Al terminar, una persona que no sabe aerodinámica abre la aplicación, sigue una lección de una portada y ocho pasos, y al final puede explicar con sus palabras tres cosas: qué es el muro del sonido, por qué la flecha lo retrasa y qué se paga por ella. Todo con las medidas de 1952, sin esperar a que el modelo cruce Mach 1.

Se entrega:

- La aplicación con dos modos: `Lección 1` y `Banco libre`. El banco libre es la pantalla actual.
- Interfaz en español e inglés.
- Una puesta a punto previa (parte 0): CI, la regla de validación de la decisión 0001 y la tipografía de cifras.

No cuenta como entrega: un guion sin pantalla, una pantalla con cifras escritas a mano, ni una lección que solo se entienda en escritorio.

## La vara

Los ensayos interactivos de Bartosz Ciechanowski: una idea por paso, un solo elemento que mirar, y el lector toca antes de leer la conclusión. El tono es el de un buen divulgador, no el de un manual.

Regla de tedio: en la lección no aparece ninguna estadística. Ni franja de fiabilidad, ni dispersión, ni incertidumbre de validación. Eso vive en el banco libre. La única excepción es el paso 7, que enseña la banda del modelo con una frase llana.

## Contexto

- El código existente está en `apps/web/` y las funciones de datos en `packages/validation/src/`. Ya existen `measuredLiftSlope`, `sampledDragRiseMach`, `reliability` y `kornMasonLockBand`: úsalas, no las dupliques.
- Los componentes de gráficas ya reciben los datos por props. Añade props para ocultar banda, franja y leyenda; no bifurques los componentes.
- El dueño prueba desde el teléfono. El ancho de 390 px es un requisito, no un extra.

## Parte 0: puesta a punto

Va en un PR propio y pequeño, antes de la lección.

1. **CI.** Un workflow de GitHub Actions en cada PR y en `main`: instalar con el lockfile congelado, `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm validate` seguido de una comprobación de que el informe no cambió, y la compilación de la app. Confirma en la documentación las versiones actuales de las acciones antes de escribirlas.
2. **Regla de validación.** Aplica la decisión 0001 en `packages/validation/src/score.ts`, en el informe y en la franja. El informe muestra una vez, lado a lado, los tramos `validated` con la regla anterior y con la nueva.
3. **Tipografía de cifras.** Hoy los números se ven partidos: `0. 030`, `35. 0°`. Corrígelo. Si la causa es B612 Mono, usa B612 con `font-variant-numeric: tabular-nums` para las cifras. Compruébalo con una captura ampliada.
4. **README.** Estado al día y los dos modos.
5. **Vista previa pública.** Pregunta al dueño en la compuerta 1 si quiere la app publicada en GitHub Pages desde `main`. Solo si dice que sí, añade el despliegue.

## Alcance

Dentro: la parte 0, los dos modos, la lección completa con su comprobación final, las tablas de cadenas `es` y `en`, y el diseño adaptable a 390 px.

Fuera (a Tickets en el punto de control):

- Cambios en `packages/physics/`. Es de otro carril.
- Más lecciones. Esta es la única.
- Ejemplos de aviones reales. Solo entrarán cuando haya una fuente para cada dato.
- Cuentas, guardado de progreso, sonido, animaciones de entrada.

## La lección: guion literal

Cada paso tiene un título, un texto, como mucho una acción y una sola imagen. Las llaves marcan cifras que calcula el código; el valor entre llaves es el que sale hoy de los datos y sirve de comprobación.

| Paso | Texto en español | Imagen | Acción |
| --- | --- | --- | --- |
| 0 · Portada | **¿Por qué los cazas llevan las alas en flecha?** En 1952 la NACA metió tres alas en un túnel de viento. Eran iguales en todo menos en una cosa: cuánto se inclinaban hacia atrás. Lo que midieron explica la forma de casi todos los cazas desde entonces. | El ala de 35° en planta, grande | Botón `Empezar`. Enlace `Ir al banco libre` |
| 1 · El ala | Esto es un ala vista desde arriba. Su **flecha** es el ángulo con que se inclina hacia atrás. Esta tiene {10.8}°: es casi recta. | Solo el ala en planta | Control de flecha activo. Botón `Volver a 10.8°` |
| 2 · La medida | Cada círculo es una medida real de 1952. Hacia la derecha, el aire va más rápido: **Mach 1** es la velocidad del sonido. Cuanto más alto está el círculo, más frena el aire al avión. | Gráfica de resistencia contra Mach, solo con los símbolos medidos del ala de 10.8° | Ninguna |
| 3 · El muro | Cerca de la velocidad del sonido, la resistencia se dispara. En esta ala, los círculos de Mach {0.95} están {1.9} veces más altos que los de Mach {0.50}. A eso lo llamaron el muro del sonido. | La misma gráfica, con el tramo de Mach 0.90 a 1.00 marcado | Ninguna |
| 4 · Inclina el ala | Ahora pulsa el ala de 47° y mira los mismos círculos. Los de la derecha han bajado. | La misma gráfica. Los símbolos del ala anterior quedan en gris | Botones de las tres alas |
| 5 · Las tres juntas | Estas son las curvas que la NACA trazó con sus medidas, las tres en la misma gráfica. A Mach {0.95}, el ala de 47° frena un {37} % menos que la casi recta. Con más flecha, el muro llega más tarde: la subida empieza en Mach {0.92}, {0.95} y {0.97}. | Las tres curvas trazadas por la NACA, rotuladas en su extremo, con una línea vertical en Mach 0.95 | Ninguna |
| 6 · El precio | La flecha no sale gratis. Con el ala inclinada el mismo ángulo contra el aire, la de 47° sustenta un {11} % menos por grado que la casi recta. Para sostener el mismo peso necesita más ángulo o más velocidad. | Curva de sustentación con los símbolos medidos de las tres alas a Mach 0.50 | Ninguna |
| 7 · Lo que saben las fórmulas | La banda azul es lo que predicen las fórmulas de los libros para esta ala. A baja velocidad, {7} de {8} medidas caen dentro de su margen. Cerca del muro no: por eso esa zona está rayada en rojo. Enseñar a las fórmulas a cruzar el muro es lo siguiente que vamos a construir. | El banco simplificado: banda, símbolos y zona rayada | Botones de las tres alas |
| 8 · Comprueba | Tres preguntas, abajo. | Ninguna | Las preguntas |

Las cifras del paso 7 salen de la regla de la decisión 0001; los valores {7} y {8} son un ejemplo, no una comprobación.

Preguntas del paso 8, con respuesta inmediata y una frase de explicación:

1. **¿Qué le pasa a la resistencia cerca de Mach 1?** Baja · **Se dispara** · No cambia.
2. **Dos alas iguales, una con 10.8° de flecha y otra con 47°. ¿Cuál frena menos a Mach 0.95?** La de 10.8° · **La de 47°** · Frenan igual.
3. **¿Qué se pierde al dar más flecha?** **Sustentación a un mismo ángulo** · Nada · Envergadura.

Cierre del paso 8: `Ya sabes leer la gráfica principal. Abre el banco libre y prueba tus propias alas.` Botón `Abrir el banco libre`.

Escribe tú la versión inglesa de todo el guion, con el mismo tono y la misma longitud. El dueño revisa la española.

## Etiquetas llanas

En la lección, los ejes y controles usan nombres llanos. En el banco libre, los técnicos. En los dos idiomas.

| Técnico | Llano, español | Llano, inglés |
| --- | --- | --- |
| Mach number, M | Velocidad (Mach). Mach 1 = velocidad del sonido | Speed (Mach). Mach 1 = speed of sound |
| Drag coefficient, CD | Resistencia del aire (coeficiente CD) | Air drag (coefficient CD) |
| Lift coefficient, CL | Sustentación (coeficiente CL) | Lift (coefficient CL) |
| Angle of attack | Ángulo del ala contra el aire (grados) | Wing angle to the airflow (degrees) |
| Quarter-chord sweep | Flecha del ala (grados) | Wing sweep (degrees) |

Glosario para toda la interfaz en español: sweep, flecha · drag, resistencia · lift, sustentación · span, envergadura · root chord, cuerda de raíz · aspect ratio, alargamiento · thickness ratio, espesor relativo · drag polar, polar de resistencia · lift curve, curva de sustentación · measured, medido · model range, rango del modelo · validated, validado · estimate, estimación · outside model range, fuera del rango del modelo · NACA faired curve, curva trazada por la NACA · wind tunnel, túnel de viento.

## Layout y comportamiento

- **Barra superior.** A la izquierda, el título. A la derecha, el conmutador de modo `Lección 1 | Banco libre` y el de idioma `ES | EN`.
- **Primera visita.** La aplicación abre en la portada de la lección.
- **Escritorio.** Columna izquierda: `Paso 3 de 8`, título, texto a 16 px con un máximo de 60 caracteres por línea, los controles que ese paso usa, y los botones `Atrás` y `Siguiente`. Columna derecha: la única imagen del paso, grande.
- **Teléfono, 390 px.** Una columna: texto, imagen, botones.
- **Lo que un paso no usa, no se dibuja.** Nada de elementos atenuados.
- **Términos nuevos.** La primera vez que aparece un término va en negrita y definido en la misma frase. Ninguna explicación depende de pasar el ratón.
- **`Siguiente` nunca se bloquea.** Si el paso pide una acción y el lector no la hizo, avanza igual.
- **El paso 4 conserva los símbolos del ala anterior en gris** para que se vea el cambio.
- **Teclado.** Todo se recorre con tabulador; las frases con cifras calculadas están en una región `aria-live`.

## Dirección de arte

Valen los tokens y las reglas del brief 001. Lo nuevo:

- **Sin colores nuevos.** En las gráficas con tres alas, la seleccionada va en `ink` y las otras en `ink-2`, cada una con su rótulo directo al final de la curva. Los símbolos de las tres alas se distinguen además por forma: círculo, cuadrado y triángulo huecos.
- **El tramo del muro** del paso 3 se marca con un fondo `grid`, sin color de alerta.
- **Texto de la lección** en B612 a 16 px; el título del paso, a 20 px en negrita.
- **El único elemento memorable** es el paso 5: tres curvas de 1952 y una línea vertical que las corta.

## Ingeniería

- **Cifras del guion.** Cada cifra entre llaves la devuelve una función pura en `apps/web/src/lesson/facts.ts`, a partir del conjunto de datos. Cada función tiene una prueba que fija su valor de hoy con tolerancia y declara su clase de dato.
- **Qué mide cada cifra:**
  - Paso 3: cociente entre la media de los símbolos dibujados a Mach 0.95 y a Mach 0.50, ala de 10.8°. Clase `measured`.
  - Paso 5: la curva trazada por la NACA para cada ala, interpolada linealmente entre sus muestras a Mach 0.95. Clase `NACA faired`. No se interpola a través del hueco sin datos entre Mach 1.04 y 1.08.
  - Paso 5, inicio de la subida: `sampledDragRiseMach` sobre la misma curva.
  - Paso 6: `measuredLiftSlope` de cada ala a Mach 0.50. Clase `measured`.
  - Paso 7: recuento de símbolos con `|E| ≤ u_val` por debajo del Mach crítico.
- **Tablas de cadenas.** Un objeto por idioma con las mismas claves, sin librería. Los textos llevan marcadores, nunca números escritos.
- **Decimales con punto** en los dos idiomas. Porcentajes sin decimales; cocientes con uno.

Trampas conocidas:

- **Texto ilegible en el teléfono.** Las gráficas son SVG con `viewBox` fijo de 860 px: a 390 px de ancho, un texto de 11 px se queda en 5 px. Dibuja cada gráfica con un `viewBox` del ancho real del contenedor para que ningún texto baje de 11 px.
- **La curva de la NACA y los símbolos no son lo mismo.** La curva es resistencia a sustentación nula; los símbolos dibujados están cerca de CL 0.10. No los pongas en la misma gráfica en los pasos 2 a 4, ni mezcles sus cifras en una misma frase.
- **Comparar alas a Mach distinto.** El ala de 47° se ensayó a 0.941 y la de 10.8° a 0.950. Por eso el paso 5 usa las curvas y no los símbolos.
- **Frases que dejan de ser verdad.** El texto del paso 7 depende de un recuento. Si ninguna medida cae dentro del margen, la frase cambia a una versión que lo dice.

## Honestidad de datos

- Ninguna cifra escrita a mano en los textos. Una prueba recorre las tablas de cadenas y falla si encuentra un dígito fuera de la lista permitida: `10.8°`, `35°`, `47°`, `1952`, `Mach 1` y los números de paso.
- Las claves de `es` y `en` coinciden; hay una prueba.
- El paso 5 dice que son curvas trazadas por la NACA, no medidas.
- El paso 7 dice dónde fallan las fórmulas. No se suaviza.

## Prohibido

- Todo lo prohibido en el brief 001.
- Estadística en la lección, salvo la frase del paso 7.
- Globos de ayuda, mascotas, confeti, puntuaciones, medallas.
- Texto que solo aparece al pasar el ratón.
- Más de dos frases seguidas sin una imagen o una acción.
- Palabras técnicas sin definir en la misma frase.

## Orden de sacrificio

1. Parte 0.
2. Pasos 0 a 5 en español, en escritorio y en 390 px.
3. Pasos 6 y 7.
4. Paso 8.
5. Inglés completo.
6. Vista previa pública.

## Checks de aceptación

Ejecutables, con salida real en el punto de control:

1. `pnpm test` pasa, con las pruebas de `facts.ts`, la de dígitos en las cadenas y la de paridad de claves.
2. `pnpm typecheck`, `pnpm lint` y la compilación pasan. El CI está en verde en el PR.
3. `pnpm validate` regenera el informe; su único cambio frente a `main` es el de la decisión 0001.
4. Un script mide en el navegador el tamaño de todo texto SVG a 390 px de ancho: ninguno por debajo de 11 px.
5. Consola del navegador limpia en la portada, en los ocho pasos y en el banco libre.

## Verificación antes de entregar

- Capturas de la portada y de los ocho pasos a 1360 px y a 390 px, en español. En inglés, la portada y el paso 5.
- Una captura ampliada que muestre las cifras sin el hueco tras el punto decimal.
- Revisor de contexto fresco, máximo tres rondas, con una instrucción añadida: leer la lección como alguien que no sabe aerodinámica y señalar cada frase que no se entienda sola.
- Di qué no se verificó.

## Compuertas

1. **Parte 0 lista.** PR pequeño abierto. Preguntas al dueño: ¿vista previa pública en GitHub Pages, sí o no?
2. **Primera versión jugable de los pasos 0 a 5.** Compuerta de producto: el dueño la recorre en su teléfono y dice si se entiende. El PM comprueba las cifras.
3. **Lección completa.** PR abierto. El merge lo hace el dueño.

Después del merge queda una prueba que no bloquea a la sesión: el dueño le pasa la lección a una persona que no conoce el proyecto y le hace las tres preguntas del paso 8.

Paradas aceptables fuera de las compuertas: un secreto, una escritura en producción, una decisión de dirección o un archivo de otro carril.

## Terminado cuando

- [ ] Las tres compuertas pasaron.
- [ ] Los cinco checks están en `docs/cp/002.md` con su salida real.
- [ ] El punto de control lista lo no verificado y los Tickets.
- [ ] El uso de tokens y el tiempo están anotados.

## Modelo y esfuerzo

Opus 5.5 con `/effort high`. Es trabajo de varios archivos donde importa no romper la pantalla que ya funciona y no dejar pasar una cifra falsa. Subagentes: solo el revisor de contexto fresco.

## Idioma

Respuestas al dueño en español. Código y commits en inglés. Interfaz en español e inglés.

## Cierre

Debe sentirse como si alguien que sabe mucho te lo contara despacio, con la prueba en la mano.

Prueba de aceptación: abro la aplicación en mi teléfono, sigo los ocho pasos sin ayuda y, al terminar, le explico a otra persona por qué los cazas llevan las alas en flecha y qué pagan por ello. Acierto las tres preguntas sin volver atrás.
