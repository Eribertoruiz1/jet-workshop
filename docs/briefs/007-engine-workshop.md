# Brief 007 · Motor: un motor que diseñas tú, con sus límites reales

Carril E. Rama `lane/engine`. Punto de control: `docs/cp/007.md`.
Lee antes `CLAUDE.md` y `docs/PROCESS.md`. Decisiones que este brief aplica: `docs/decisions/0005` y `0006`.

## Resultado

El dueño quiere inventar el motor de su jet: eficiente, y tan guiado por la física que, si falla, se rompa por una causa real. Este carril construye ese motor, con investigación y pruebas propias.

Al terminar existe un modelo de motor a reacción que:

- recibe cuatro decisiones de diseño: cuánto aire traga, cuánto lo comprime, a qué temperatura quema y si lleva postquemador;
- devuelve el empuje y el consumo a cualquier Mach, altura y posición del gas;
- conoce sus límites físicos y falla cuando se pasan, diciendo cuál;
- reproduce un motor real con medidas públicas, y ha predicho otro a ciegas.

Se entrega:

- `packages/physics/src/propulsion/**`: el modelo, que cumple el contrato `contract.ts`. Se importa como `@jet-workshop/physics/propulsion`.
- `packages/physics/data/engines/**`: las medidas del motor abierto, con su ficha de procedencia.
- `studies/002-engine-cycle/` y `docs/studies/002-engine-cycle.md`: el estudio, reproducible con un comando.
- En la compuerta 4, la pantalla del taller de motor.

Las pruebas van en `packages/physics/test/propulsion/`.

No cuenta como entrega: un motor con fórmulas de juego, una comparación con un motor real hecha ajustando constantes punto a punto, ni un límite sin fuente.

## Aislamiento

- Este carril no depende de ningún otro, salvo por el contrato. El carril D vuela contra ese contrato con un motor provisional hasta que el tuyo llegue a `main`.
- El contrato (`packages/physics/src/propulsion/contract.ts`) lo cambia solo el PM. Si le falta algo, detente y pídelo.
- No añadas dependencias de npm. En `studies/` puedes usar Python con tu propio `requirements.txt`.

## Reglas del ciego

1. **No abras los informes reservados:**
   - NACA RM E56B16, el J71-A-2, y cualquier otro informe de ensayo del J71.
   - De forma provisional, todo informe de ensayo del J85: NASA TM X-3304, TM X-2990, TN D-6610, TM X-71431 y los que los citen. El PM confirmará si el J85 queda reservado.
2. **Las condiciones de los motores reservados te llegarán escritas** en `docs/studies/heldout-engines.md`, sin resultados. Si aún no está en `main`, avanza con todo lo demás.
3. **Registro de contaminación** en el punto de control: qué fuente, qué viste y qué decisión pudo afectar. Se apunta aunque esté vacío.
4. **Búsquedas.** No nombres los motores reservados en tus búsquedas. Antes de leer una fuente, mira su índice; si trae resultados de esos motores, sáltate esa parte y anótalo.
5. **Subagentes.** Los que lean fuentes reciben estas reglas por escrito.

## Datos que sí puedes usar

Motor abierto: el General Electric J47. Pistas de fuentes, todas **sin verificar**:

| Fuente | Qué trae, según su resumen | NTRS |
| --- | --- | --- |
| NACA RM E9G09 (Conrad y Sobolewski) | Prestaciones del J47 en el túnel de altura de Lewis, de 5000 a 50 000 pies: empuje neto, gasto de aire, gasto de combustible y consumo específico | 19930093773 |
| NACA RM E52L16 (Walker, Braithwaite y Fenn) | J47-GE-25 en cámara de altura: prestaciones de cada componente y del conjunto frente al índice de Reynolds | 19930081259 |
| NACA RM E9I26 (Bloomer) | Características de operación del J47: rango de funcionamiento, arranque en altura | 19930085978 |
| NACA RM E51J15 (Fleming) | Resumen de varios motores: por qué las prestaciones no se generalizan con la altura | 19930087116 |
| NACA RM E51E08 | J47D con postquemador y tobera de área variable: límites de apagado del postquemador con la altura | 19930086683 |

Método y referencias de cálculo, también **sin verificar**:

| Fuente | Para qué | Acceso |
| --- | --- | --- |
| Koenig y Fishbach, NASA TN D-6552, GENENG | Cálculo de punto de diseño y fuera de diseño con mapas de componentes; trae el listado completo en FORTRAN | NTRS 19720011133 |
| Morris, NASA TM 78653 | Programa rápido de diseño y fuera de diseño, con un modelo empírico del compresor en lugar de mapas | NTRS 19780022179 |
| pyCycle (OpenMDAO) | Biblioteca abierta de ciclo termodinámico. Sirve de referencia calculada independiente | github.com/OpenMDAO/pyCycle |

Las descargas van a `.cache/` y necesitan el OK del dueño: di cuáles y cuánto pesan en la compuerta 1.

Para digitalizar una figura puedes ejecutar las herramientas de `tools/digitize/` sin modificarlas, con dos pasadas independientes. Si el informe trae la cifra en una tabla, usa la tabla.

## Las preguntas del estudio

1. **Gas.** ¿Hace falta calor específico variable, o basta uno constante por tramo, para acertar empuje y consumo? ¿Con qué error cada opción?
2. **Fuera de diseño.** ¿Cómo cambia un motor ya diseñado con el Mach, la altura y el gas, sin mapas medidos de sus componentes? Candidatos mínimos:
   - emparejamiento con turbina y tobera bloqueadas;
   - el modelo empírico de compresor de Morris;
   - mapas genéricos escalados, como en GENENG.
3. **Límites.** ¿Qué límites se pueden defender con una fuente abierta, y con qué cifra? Como mínimo: temperatura de entrada a la turbina, temperatura de salida del compresor, margen de bombeo del compresor, apagado de la llama en altura y apagado del postquemador.
4. **Tamaño y masa.** ¿De qué dependen el diámetro y la masa del motor, y con qué fuente? Lo que no tenga medida detrás es `estimated`.
5. **Coste.** El vuelo llama al motor 120 veces por segundo. ¿Cuánto tarda una llamada? ¿Qué conviene calcular una sola vez, al diseñar el motor?
6. **Explicación.** ¿Con qué imagen se enseña el motor en una lección? Una sola.

## Protocolo

- **Primero el plan,** antes de calcular nada. Es la compuerta 1.
- **Comparación sin parámetros libres, donde se pueda.** Si el informe da las eficiencias medidas de cada componente, se usan como entrada y el empuje y el consumo se predicen sin ajustar nada.
- **Lo que se ajuste, se declara.** Toda constante calibrada dice con qué datos del J47 se calibró y cuenta como parámetro libre. Nunca se ajusta punto a punto.
- **Compara como manda `docs/PROCESS.md`:** error de comparación `E` e incertidumbre de validación `u_val`, por magnitud y por condición de ensayo.
- **Referencia calculada.** El mismo ciclo en pyCycle, como comprobación independiente de la termodinámica. Es `computed` contra `computed`: nunca se presenta como medida.
- **Prerregistro y predicción a ciegas** para el motor reservado, con la estructura del estudio 001: métricas y umbrales fusionados antes de calcular las predicciones.

Trampas conocidas. Son pistas del PM, sin verificar:

- **Empuje neto y empuje del chorro.** Los informes dan los dos, y el consumo específico referido a uno o a otro. No los mezcles.
- **Magnitudes corregidas.** Los informes generalizan con presión y temperatura corregidas. Deshaz la corrección con la definición del propio informe.
- **Qué temperatura limita.** En los motores de esa época el límite se medía a la salida de la turbina, no a la entrada. No las confundas.
- **Tobera de área fija.** Un motor con tobera fija llega a su límite de temperatura a menos vueltas cuanto más sube. Con tobera variable, no.
- **Reynolds en altura.** A gran altura bajan el rendimiento del compresor y el gasto de aire. Un modelo sin esa corrección predice de más ahí; dilo y mide cuánto.
- **Toma de aire.** En túnel y en cámara de altura la presión de entrada se fija directamente. Al comparar con esos datos no apliques pérdidas de toma.
- **Gas caliente.** Usar el mismo calor específico antes y después de la combustión cuesta varios puntos de error.
- **Unidades.** Libras de empuje, libras por hora, grados Rankine. Convierte en un solo sitio, con su prueba.
- **Coste.** Sin reservas de memoria en cada paso.

## El motor que ve el jugador

Cuatro decisiones, con rangos que propones tú y justificas con fuente:

| Decisión | Unidad |
| --- | --- |
| Gasto de aire de diseño | kg/s |
| Relación de compresión | sin unidad |
| Temperatura de entrada a la turbina | K |
| Postquemador | sí o no |

- **Lo comprobado y lo estimado.** Un diseño cerca del J47 cae en lo comparado con medidas. Cuanto más se aleja, más es `estimated`. El modelo devuelve ese estado en cada salida, como pide el contrato.
- **Diseños imposibles.** Un diseño en que la turbina no puede mover el compresor, o que no cabe en sus límites ni parado, se rechaza al diseñarlo, con su razón.
- **Fallos.** Cada límite tiene su identificador y devuelve cuánto falta para llegar a él. Pasar un límite daña el motor según una regla que declaras: cuánto exceso, durante cuánto tiempo. Cuando falla, el empuje y el consumo pasan a cero y el fallo nombra su límite. La regla de daño es `estimated` mientras no tenga una fuente.
- **Lo que no se promete.** El modelo no afirma que un diseño supere a los motores reales. Enseña qué límite lo impide.

## Alcance

Dentro: el modelo de ciclo de un turborreactor de un eje, con y sin postquemador; su comportamiento fuera de diseño; sus límites y fallos; la comparación con el J47; el estudio; el prerregistro y las predicciones a ciegas; y, en la compuerta 4, la pantalla del taller.

Fuera (a Tickets en el punto de control):

- Turbofán y motores de dos ejes. Después del turborreactor.
- Tomas de aire supersónicas con sus propios fallos.
- Arranque, transitorios de vueltas y control del motor.
- Estatorreactores y ciclos exóticos.
- Cualquier archivo fuera de los de este carril.

## Honestidad

- Cada tabla y figura del estudio la genera un script. Ninguna cifra escrita a mano.
- El estudio separa lo medido, lo calculado y tu juicio.
- Si el modelo no reproduce el J47 dentro de lo que el prerregistro llame acierto, se dice, y el motor se queda como `estimated`.
- Lo que no pudiste verificar contra su fuente va en una lista propia.

## Checks de aceptación

1. Un comando regenera todas las tablas y figuras del estudio.
2. `pnpm test` cubre: el ciclo ideal contra su solución cerrada; la conservación de energía en cada componente; el contrato (el motor es puro y determinista); y un fallo por cada límite.
3. La comparación con el J47 está en el estudio, con `E` y `u_val` por condición y el número de parámetros libres.
4. La comparación con pyCycle está en el estudio.
5. El prerregistro se fusionó antes de que existan las predicciones. Lo comprueban las fechas de los commits.
6. El registro de contaminación está en el punto de control.
7. Una llamada al motor tarda menos de 0.1 ms de mediana en Node 24. Se informa la cifra.

## Compuertas

1. **Plan.** Las respuestas previstas a las seis preguntas, las fuentes leídas con lo verificado y lo que no, las descargas que necesitan OK, el plan de datos del J47 y el registro de contaminación. Compuerta técnica. Es corta: no calcules nada antes.
2. **Motor v0.** Ciclo, fuera de diseño, límite de temperatura con su fallo, comparación con el J47 y el contrato cumplido, en un PR. El PM rehace cinco cifras con código propio. Objetivo: miércoles 18 de noviembre, porque el carril D lo necesita para el primer vuelo del 22.
3. **Estudio y predicción a ciegas.** El estudio completo, todos los límites, el prerregistro y las predicciones para el motor reservado. El dueño decide si el modelo queda como base del taller.
4. **Taller de motor.** La pantalla donde el jugador diseña su motor. Su guion y su dirección de arte llegarán como enmienda del PM a este brief después de la compuerta 2, con cifras reales. Compuerta de producto. Objetivo: domingo 29 de noviembre.

## Revisión

Antes de cada compuerta, un revisor de contexto limpio con Opus 5.5 pasa `REVIEW.md` sobre el diff. Informa solo de brechas de corrección o de requisitos. Como mucho tres rondas; sus hallazgos y lo que hiciste con ellos van al punto de control. Es la revisión cruzada que pide la decisión 0006.

## Terminado cuando

- [ ] Las cuatro compuertas pasaron.
- [ ] Los siete checks están en `docs/cp/007.md` con su salida real.
- [ ] El estudio lista sus fórmulas sin verificar y sus límites.
- [ ] El uso de tokens y el tiempo, tuyos y de cada subagente, están anotados.

Paradas aceptables: un archivo de otro carril, una dependencia nueva, un cambio en el contrato, una fuente que enseña resultados reservados, o una decisión de dirección.

## Modelo y esfuerzo

Fable 5.2 con `/effort high`, por decisión del dueño (decisión 0006). Es un problema abierto, largo y con investigación propia. Puedes usar subagentes para leer fuentes largas y para la segunda pasada de una digitalización.

## Idioma

Respuestas al dueño en español. El estudio, en español. Código, commits, CSV y fichas en inglés.

## Cierre

El motor tiene que comportarse como una máquina con carácter: generoso cuando se le pide poco, sediento con el postquemador, y frágil justo donde más rinde.

Prueba de aceptación, en primera persona: subo la temperatura de mi motor para ganar empuje, veo que el límite de la turbina se acerca, lo paso, y el motor falla diciendo que fue la turbina. Y sé qué parte de lo que vi está comparada con un motor real y qué parte es estimada.
