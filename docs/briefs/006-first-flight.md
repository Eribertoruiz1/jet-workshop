# Brief 006 · Primer vuelo: elige un ala y vuélala

Carril D. Rama `lane/first-flight`. Punto de control: `docs/cp/006.md`.
Lee antes `CLAUDE.md` y `docs/PROCESS.md`. Decisiones que este brief aplica: `docs/decisions/0003`, `0005` y `0006`.

## Resultado

El dueño quiere volar lo que diseña, y que cuando falle, falle por la física. Este brief entrega el primer vuelo.

Al terminar, una persona abre la página de vuelo desde el teléfono, elige una de las tres alas ensayadas, su tamaño y cuánto combustible carga, y vuela de perfil: despega, sube, intenta cruzar la velocidad del sonido y vuelve a aterrizar. O no lo consigue, y el informe de vuelo le dice por qué en una frase, con las cifras que lo explican.

Se entrega:

- `packages/physics/src/flight/**`: el modelo de vuelo, puro y con pruebas. Se importa como `@jet-workshop/physics/flight`.
- `apps/web/flight.html` y `apps/web/src/flight/**`: la página de vuelo, en español e inglés.
- El informe de vuelo, con todas sus cifras calculadas.

Las pruebas van en `packages/physics/test/flight/` y `apps/web/test/flight/`.

No cuenta como entrega: una animación sin modelo detrás, un vuelo con límites escritos a mano (una velocidad máxima fija, una pared invisible), ni prestaciones escritas en una cadena.

## La vara

Una lámina técnica que se mueve: el avión de perfil, el suelo, el aire y las fuerzas dibujadas a escala sobre el avión. A los treinta segundos, quien juega ha entendido sin leer que tirar de la palanca cambia sustentación por resistencia.

No es un arcade. Tampoco un simulador de cabina: no hay instrumentos de adorno.

## Contexto

- El código de aerodinámica está en `packages/physics/src/` y los datos y sus funciones en `packages/validation/`. Se llaman sin modificarlos.
- El contrato del motor ya existe: `packages/physics/src/propulsion/contract.ts`. Léelo entero. El motor de verdad lo construye el carril E (brief 007) a la vez que tú.
- Los tokens de color, la tipografía B612 y las reglas de texto bilingüe son los del brief 001 y del carril A. Reutiliza `apps/web/src/styles.css` y las tablas de `apps/web/src/i18n/` como referencia, sin modificarlas: tus cadenas van en `apps/web/src/flight/`.
- El dueño prueba desde el teléfono. El ancho de 390 px con controles táctiles es un requisito.

## Alcance

Dentro: el modelo de vuelo, la página con sus tres fases (hangar, vuelo, informe), los controles de teclado y táctiles, y el motor provisional.

Fuera (a Tickets en el punto de control):

- Rutas con relieve, clima, objetivos y carga. Llegan después del primer vuelo (decisión 0005).
- Vista 3D, actitud con momentos, barrenas, viento.
- Un ala a tu gusto con flecha continua. En este brief solo se vuelan las tres alas ensayadas; interpolar entre ellas es un modelo que todavía no está comprobado.
- Cola, cabina, tomas de aire y tren como piezas de resistencia. No se modelan, y la página lo dice.
- Cualquier cambio en `packages/physics/src/` fuera de `flight/`, en `packages/validation/` o en el resto de `apps/web/`.
- Datos reservados: nada de `packages/validation/data/heldout/` ni de la rama `lane/heldout-data`.

## El modelo

Todo lo que sigue son pistas **sin verificar**. Confirma cada ecuación y cada constante contra una fuente abierta y cita la página; lo que no puedas confirmar lleva `// UNVERIFIED` y va a la lista del punto de control.

**Movimiento.** Masa puntual en un plano vertical, en unidades SI:

- `m dV/dt = T cos α − D − m g sin γ`
- `m V dγ/dt = L + T sin α − m g cos γ`
- `dh/dt = V sin γ`, `dx/dt = V cos γ`, `dm/dt = −` gasto de combustible

**Actitud.** Cinemática, sin momentos: el mando fija la velocidad de cabeceo, con un límite, y al soltarlo el avión mantiene su actitud. El ángulo de ataque es la actitud menos el ángulo de la trayectoria. Es una simplificación declarada, de clase `estimated`.

**Rodadura.** En pista, un modelo aparte con rozamiento de rodadura y sin `dγ/dt`, hasta que la sustentación iguala al peso.

**Atmósfera.** U.S. Standard Atmosphere 1976, de 0 a 20 km. Tú calculas presión, temperatura, densidad y velocidad del sonido, y le pasas al motor la presión y la temperatura, como pide el contrato.

**El avión.** Es el conjunto de ala y fuselaje de los informes de la NACA, escalado geométricamente a tamaño real. El jugador elige la superficie alar.

- **Sustentación.** La pendiente medida de cada ala a cada Mach, con las funciones que ya existen. Por encima del mayor coeficiente de sustentación medido a ese Mach no hay datos: ahí aplica un modelo de pérdida declarado, `estimated`.
- **Resistencia a sustentación nula.** Dos piezas sumadas:
  - la fricción del modelo actual, evaluada al Reynolds de vuelo, que es unas diez veces el del túnel: `estimated`;
  - la subida medida, `curva NACA(M) − curva NACA(0.50)`, del ala elegida, hasta su último Mach muestreado: `NACA faired`.
- **Más allá de los datos.** Por encima del último Mach muestreado se mantiene el último incremento y el estado pasa a "sin datos". Dentro del hueco de Mach 1.04 a 1.08 se une en línea recta, también como "sin datos".
- **Resistencia por sustentación.** El modelo actual, marcado `estimated` fuera del rango de sustentación en que se comparó.
- **Masa.** Estructura, motor, combustible. La del motor viene del contrato. La regla de la estructura es tuya: declárala, márcala `estimated` y compárala en orden de magnitud con dos o tres aviones reales de fuente pública.
- **Límite estructural.** Un factor de carga máximo declarado, con su fuente.

**Motor.** Programa contra el contrato, no contra un motor concreto.

- Hasta que el carril E entregue su motor, usa uno provisional dentro de `flight/` que cumple el contrato: empuje estático elegido, que cae con la densidad, y consumo proporcional al empuje. Lleva el identificador `placeholder` y la clase `estimated`.
- En la compuerta 2 se sustituye por el de `@jet-workshop/physics/propulsion`. Si para entonces no está en `main`, el provisional se queda y la página lo dice.

**Integración.** Paso fijo de 1/120 s con Runge-Kutta de orden 4. Una función pura `step(state, controls, aircraft, dt)`: mismas entradas, misma salida. El dibujo interpola entre pasos; la física no depende de los fotogramas.

**Estado de cada valor.** En cada instante el modelo dice si lo que calcula está comparado con medidas (`validated`), es `estimated` o está "sin datos". La página lo muestra siempre.

### Fallos

Cada fallo lo detecta el modelo, no la página, y devuelve su causa y las cifras que la explican:

| Fallo | Condición |
| --- | --- |
| No despega | Se acaba la pista sin que la sustentación iguale al peso |
| Pérdida | El ángulo de ataque supera el de sustentación máxima y el avión baja sin recuperarse hasta el suelo |
| Rotura del ala | El factor de carga supera el límite |
| Sin combustible | La masa de combustible llega a cero |
| Fallo de motor | El motor devuelve `failure` |
| Aterrizaje duro | Toca el suelo con más velocidad de descenso que el límite declarado |
| Choque | Toca el suelo fuera de la pista o con el morro bajo |

No cruzar la velocidad del sonido no es un fallo: es un resultado, y el informe lo explica.

## Trampas conocidas

- **`dγ/dt` se dispara cuando `V` tiende a cero.** Por eso la rodadura es un modelo aparte.
- **Unidades.** Los datos del túnel están en pulgadas y pies cuadrados; el vuelo, en SI. Convierte en un solo sitio, con su prueba.
- **El paso de tiempo acumulado.** Si la pestaña pasa a segundo plano y vuelve, no integres de golpe el tiempo perdido: limita lo acumulado y pausa el vuelo.
- **Tres alas, no un continuo.** No interpoles entre alas.
- **La pendiente de sustentación medida depende de cuántos puntos se ajusten.** Entre el ala de 10.8° y la de 47°, la diferencia sale del 6 al 13 % según la ventana de ángulos. Usa la función existente y anota esa dispersión como incertidumbre; no la afines.
- **Sustentación nula no es resistencia mínima.** En estas alas con curvatura el mínimo cae cerca de un coeficiente de sustentación de 0.09. La curva de la NACA es a sustentación nula.
- **El lienzo en el teléfono.** Escala por la densidad de píxeles del dispositivo, o las líneas salen borrosas. Los eventos táctiles no deben desplazar la página.
- **Vite con dos páginas.** La compilación solo incluye `index.html` si no se declara la segunda entrada. Confirma en la documentación de Vite 8 cómo se declara antes de tocar `apps/web/vite.config.ts`. Es el único cambio que haces fuera de tus carpetas.

## La página

Tres fases en una sola página. Textos literales; las llaves marcan cifras que calcula el código. La versión inglesa va en la tabla de cadenas con las mismas claves.

**Barra superior.** Título `Primer vuelo` / `First flight`. A la derecha, `ES | EN` y el enlace `Volver al taller` / `Back to the workshop`, que lleva a `index.html`.

### 1 · Hangar

Una columna. Arriba, el avión de perfil, dibujado a escala con el ala elegida.

| Elemento | Español | Inglés |
| --- | --- | --- |
| Título | Prepara el avión | Set up the aircraft |
| Selector de ala, tres botones con el ala en planta | `10.8°`, `35°`, `47°` | iguales |
| Bajo el selector | Son las tres alas que la NACA midió en 1952. | These are the three wings NACA measured in 1952. |
| Control | Tamaño del ala: {S} m² | Wing size: {S} m² |
| Control | Combustible: {f} kg | Fuel: {f} kg |
| Control | Empuje del motor: {T} kN | Engine thrust: {T} kN |
| Lectura | Peso al despegue: {W} kg | Take-off weight: {W} kg |
| Lectura | Empuje entre peso: {tw} | Thrust to weight: {tw} |
| Lectura | Velocidad de despegue estimada: {v} km/h | Estimated take-off speed: {v} km/h |
| Nota fija | El motor y el peso son estimados. No se modelan la cola, la cabina ni el tren. | The engine and the weight are estimates. The tail, the canopy and the landing gear are not modelled. |
| Botón | Al avión | Board |

El control de empuje solo existe con el motor provisional. Cuando llegue el motor del carril E, lo sustituye el motor diseñado.

### 2 · Vuelo

- **Escena.** Un lienzo a todo el ancho. Suelo, pista con marcas cada 100 m, líneas de altura cada 1000 m. El avión, de perfil, en `ink`. La cámara lo sigue y se aleja al subir.
- **Lo que hay que mirar: las fuerzas.** Sobre el avión, cuatro flechas en `ink` con su nombre: sustentación, peso, empuje y resistencia, con longitud proporcional a la fuerza dividida por el peso. Y una quinta en `accent`: la suma de las cuatro. Es el único elemento de color de la escena.
- **Por encima de Mach 1,** dos líneas finas salen del morro con el ángulo de Mach, `asin(1/M)`, calculado. Se cierran al acelerar.
- **Lecturas,** en una banda bajo la escena, con cifras tabulares:

| Lectura | Español | Inglés |
| --- | --- | --- |
| Velocidad | {v} km/h · Mach {m} | {v} km/h · Mach {m} |
| Altura | {h} m | {h} m |
| Combustible | {f} % | {f} % |
| Carga | {g} g | {g} g |
| Estado | Comprobado con medidas / Estimado / Sin datos | Checked against measurements / Estimated / No data |

- **Avisos,** una línea, solo cuando aplican: `Cerca de la pérdida` / `Near the stall` en `warn`; `Límite del ala` / `Wing limit` en `stop`; y el aviso de límite que dé el motor.
- **Controles táctiles.** A la izquierda, una palanca vertical de gas. A la derecha, una zona de cabeceo: arrastrar hacia abajo sube el morro. Un botón `Pausa` / `Pause`.
- **Teclado.** `W` y `S` para el gas, flechas arriba y abajo para el cabeceo, `P` para la pausa.

### 3 · Informe de vuelo

Título según el resultado, una frase con la causa, tres cifras y dos botones: `Repetir` / `Fly again` y `Volver al hangar` / `Back to the hangar`.

| Resultado | Español | Inglés |
| --- | --- | --- |
| Aterriza | Aterrizaste. Velocidad máxima: Mach {m}. Te quedó un {f} % de combustible. | You landed. Top speed: Mach {m}. You had {f} % of the fuel left. |
| No cruza | No cruzó la velocidad del sonido: a Mach {m} la resistencia igualó al empuje. | It did not go supersonic: at Mach {m} drag equalled thrust. |
| No despega | No despegó. Al final de la pista iba a {v} km/h y necesitaba {vr} km/h para que el ala sostuviera el peso. | It did not take off. At the end of the runway it was doing {v} km/h and needed {vr} km/h for the wing to carry the weight. |
| Pérdida | Entró en pérdida a {v} km/h. A esa altura, este ala no sostiene {w} kg por debajo de {vs} km/h. | It stalled at {v} km/h. At that height this wing cannot carry {w} kg below {vs} km/h. |
| Rotura | El ala se rompió a {g} g. Su límite era {gl} g. | The wing broke at {g} g. Its limit was {gl} g. |
| Sin combustible | Se quedó sin combustible a {d} km de la pista. | It ran out of fuel {d} km from the runway. |
| Motor | El motor falló: {causa}. | The engine failed: {cause}. |
| Aterrizaje duro | Tocó el suelo bajando a {vz} m/s. El tren aguanta {vl} m/s. | It touched down sinking at {vz} m/s. The gear takes {vl} m/s. |
| Choque | Chocó con el suelo a {v} km/h. | It hit the ground at {v} km/h. |

"No cruza" se añade como segunda frase a cualquier vuelo que no pasó de Mach 1.

## Dirección de arte

- **Tokens.** Los del brief 001: `page` #F5F6F8, `surface` #FFFFFF, `ink` #15181C, `ink-2` #5B6470, `grid` #DDE1E6, `accent` #1F5FBF, `ok` #1E8E5A, `warn` #B7791F, `stop` #C0392B.
- **El color es contenido.** El cielo es `page`, el suelo y las líneas de altura son `grid`, el avión y las fuerzas son `ink`. El `accent` es solo para la fuerza resultante. `warn` y `stop`, solo para avisos.
- **Tipografía.** B612, con cifras tabulares, como en el resto de la aplicación.
- **El avión** se dibuja a partir de su geometría real: el fuselaje de ojiva y cilindro y el ala elegida, vista de lado.

## Prohibido

- Límites de juego en la física: velocidad máxima fija, paredes invisibles, resistencia inventada para "que se sienta bien". Si algo no se siente bien, se cambia el control, no la física.
- Partículas, estelas decorativas, explosiones, temblor de cámara. Un fallo se cuenta con el informe.
- Tarjetas, paneles flotantes, sombras, degradados en la interfaz.
- Iconos de emoji y cifras escritas dentro de las cadenas.
- Instrumentos de cabina de adorno.

## Honestidad

- Cada cifra de la página la calcula el modelo y tiene su prueba.
- El estado (`validated`, `estimated`, sin datos) se ve siempre durante el vuelo.
- El hangar dice qué no se modela.
- El motor provisional se llama provisional en la página y en el informe.
- Lo que no pudiste verificar va en su lista.

## Prioridad

Si no alcanza: primero el vuelo completo de punta a punta con una sola ala (rodar, despegar, subir, acelerar, volver, aterrizar o fallar, e informe). Después, las otras dos alas. Después, las líneas de Mach y el pulido de la cámara. Mejor un vuelo honesto y feo que uno bonito con un atajo en la física.

## Checks de aceptación

Todos ejecutables con `pnpm test`, salvo el último.

1. **Energía.** Sin empuje ni resistencia, la energía total se conserva en un vuelo de 60 s dentro de una parte en un millón.
2. **Planeo.** Sin empuje, la pendiente de planeo estabilizada es la resistencia entre la sustentación, dentro del 1 %.
3. **Atmósfera.** Presión, temperatura y densidad a 0, 11 y 20 km coinciden con la tabla de la fuente.
4. **Independencia del paso.** Con la mitad del paso de tiempo, la posición tras 60 s de un vuelo guionizado cambia menos de 1 m.
5. **Determinismo.** El mismo guion de mandos da la misma trayectoria, bit a bit.
6. **Despegue.** La velocidad de despegue del modelo coincide con la que sale de igualar sustentación y peso, dentro del 2 %.
7. **Fallos.** Un vuelo guionizado por cada fallo de la tabla lo provoca y devuelve su causa y sus cifras.
8. **Cadenas.** Mismas claves en español e inglés, y ninguna cifra escrita dentro de una cadena.
9. **Navegador,** a 390 px y a 1360 px: consola limpia, sin desplazamiento horizontal, y un vuelo completo con controles táctiles y con teclado. Con capturas en el punto de control.

## Compuertas

1. **Vuela en pantalla.** El modelo con sus pruebas y un vuelo completo jugable con el motor provisional, en un PR. Compuerta técnica y de producto: el PM rehace cinco cifras de un vuelo guionizado con código propio; el dueño lo vuela en el teléfono. Objetivo: miércoles 18 de noviembre.
2. **Primer vuelo.** El motor del carril E integrado si está en `main`, las tres alas, el informe completo y los checks con su salida real, en un PR. Objetivo: domingo 22 de noviembre.

Entre compuertas, decide tú los detalles que no cambian la física y anótalos en el punto de control.

## Terminado cuando

- [ ] Las dos compuertas pasaron.
- [ ] Los nueve checks están en `docs/cp/006.md` con su salida real.
- [ ] El punto de control lista lo `estimated`, las fórmulas sin verificar y los Tickets.
- [ ] Un revisor de contexto limpio pasó `REVIEW.md` antes de cada compuerta.
- [ ] El uso de tokens y el tiempo están anotados.

Paradas aceptables: un archivo de otro carril, una dependencia nueva, un cambio que haga falta en el contrato del motor, o una decisión de dirección.

## Modelo y esfuerzo

Opus 5.5 con `/effort high`. Es trabajo de varios archivos donde un error sutil de signo o de unidades hace volar algo que no debería.

## Idioma

Respuestas al dueño en español. Código, commits y nombres en inglés. La interfaz, bilingüe.

## Cierre

Tiene que sentirse como empujar un objeto real: pesado en la pista, ligero cuando el ala por fin lo levanta, terco cuando se acerca a la velocidad del sonido.

Prueba de aceptación, en primera persona: abro la página en el teléfono, elijo el ala de 47°, le pongo poco motor y veo que no cruza Mach 1; vuelvo al hangar, le pongo más, y cruza. En los dos vuelos, el informe me dice por qué.
