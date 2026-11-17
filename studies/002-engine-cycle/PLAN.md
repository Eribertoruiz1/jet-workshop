# Plan · Estudio 002, ciclo del motor

Brief 007, compuerta 1. Fecha: 16 de noviembre de 2026.

Nada de este plan está calculado. Las respuestas a las seis preguntas son previsiones, y cada una dice cómo se va a medir. No se ha abierto ningún informe: de cada fuente se conoce solo su ficha de NTRS (título, autores, fecha, resumen y tamaño). Lo que se dice aquí del contenido de un informe, y toda cifra de un motor, viene de la pista del brief o de memoria y está **sin verificar** hasta leer la fuente.

Las preguntas para el PM y lo que hace falta del dueño están en `docs/cp/007.md`.

## 1. Entregables y estructura

| Ruta | Qué es | Compuerta |
| --- | --- | --- |
| `studies/002-engine-cycle/PLAN.md` | Este plan | 1 |
| `packages/physics/src/propulsion/units.ts` | El único sitio donde se convierten libras, libras por hora, grados Rankine y pies | 2 |
| `packages/physics/src/propulsion/gas.ts` | Propiedades del gas: entalpía y función de entropía del aire y de los productos de combustión | 2 |
| `packages/physics/src/propulsion/cycle.ts` | Componentes y punto de diseño | 2 |
| `packages/physics/src/propulsion/offdesign.ts` | Emparejamiento fuera de diseño | 2 |
| `packages/physics/src/propulsion/limits.ts` | Límites, regla de daño y fallo | 2 (temperatura de turbina), 3 (el resto) |
| `packages/physics/src/propulsion/design.ts`, `engine.ts`, `index.ts` | `designEngine` y el `EngineModel` del contrato | 2 |
| `packages/physics/test/propulsion/*.test.ts` | Pruebas del check 2 | 2 y 3 |
| `packages/physics/data/engines/j47/*.csv` y `README.md` | Medidas del J47 y su ficha de procedencia | 2 |
| `studies/002-engine-cycle/run.ts` | El único comando: regenera tablas, figuras y el texto del estudio | 2, y crece en la 3 |
| `studies/002-engine-cycle/out/` | Tablas (Markdown y CSV) y figuras (SVG), generadas | 2 y 3 |
| `studies/002-engine-cycle/pycycle/` | El mismo ciclo en pyCycle, con su `requirements.txt` | 3 |
| `studies/002-engine-cycle/PREREGISTRATION.md` | Métricas y umbrales para el motor reservado; después, las predicciones | 3 |
| `docs/studies/002-engine-cycle.md` | El estudio, generado desde una plantilla. Ninguna cifra a mano | 2 (borrador con el J47), 3 (completo) |
| `docs/cp/007.md` | Punto de control | todas |

**El comando**, desde la raíz: `corepack pnpm exec tsx studies/002-engine-cycle/run.ts`.

- El estudio se escribe en TypeScript para llamar al modelo por ruta relativa. Las figuras son SVG escritos por el script. No hay dependencias nuevas de npm.
- **pyCycle es Python y es pesado.** `run.ts` lo ejecuta si encuentra su entorno; si no, usa el CSV `computed` que deja la última ejecución, ya confirmado en el repositorio, y lo dice en la salida. Es una decisión que el PM puede revocar.

## 2. Reglas del ciego, en la práctica

1. No se abre ningún informe de ensayo del J71 ni del J85. No se nombran en ninguna búsqueda.
2. Las fuentes se piden a NTRS por su número de ficha, no por búsqueda libre. Las búsquedas que hagan falta nombran el J47 o el título de un método.
3. Antes de leer una fuente se mira su índice, su lista de figuras y sus símbolos. Si trae resultados de un motor reservado, esa parte se salta y se anota en el registro de contaminación.
4. **Riesgo conocido: los resúmenes de varios motores.** RM E51J15 (Fleming) resume "varios motores" sin nombrarlos en su ficha. Un motor puede aparecer con una denominación anterior a la definitiva. Ese informe lo criba primero un subagente, que devuelve solo la lista de motores que trae y en qué figuras; después se leen solo las figuras del J47 y las de motores no reservados.
5. Los subagentes que lean fuentes reciben estas reglas por escrito. De un material reservado dicen solo que existe.
6. Las condiciones del motor reservado llegarán en `docs/studies/heldout-engines.md`. Hoy no está en `main`.

## 3. El modelo que se va a construir

Un turborreactor de un eje. Estaciones: 0 aire libre, 2 entrada del compresor, 3 salida del compresor, 4 entrada de la turbina, 5 salida de la turbina, 7 entrada de la tobera (salida del postquemador), 8 garganta.

- **Punto de diseño del jugador.** Parado a nivel del mar en día estándar (101 325 Pa, 288.15 K, Mach 0), gas a fondo, sin postquemador. Las cuatro decisiones valen ahí.
- **Punto de referencia, por dentro.** El motor se construye a partir de un punto de referencia cualquiera: una condición de vuelo y lo que el motor hace en ella. `designEngine` usa el punto de diseño del jugador. La comparación con el J47 usa un punto de ensayo (sección 6), porque el túnel no ensayó parado a nivel del mar. Así el ancla del J47 no pasa por el modelo fuera de diseño.
- **Nivel de tecnología.** No lo elige el jugador. Son los rendimientos de los componentes (compresor, cámara, turbina, tobera), las pérdidas de presión y el poder calorífico del combustible. Se toman de las medidas del J47, con su clase de dato, y se aplican a cualquier diseño. Lejos del J47 eso es una extrapolación: `estimated`.
- **Geometría fija.** Al diseñar se calculan una vez el área de paso de la turbina y la de la tobera. Fuera de diseño no cambian. Con el postquemador encendido la tobera se abre lo justo para que la turbina no note el postquemador; es la tobera variable ideal, `estimated`.
- **El mando.** `throttle` pide vueltas del eje, en línea recta entre el ralentí y el 100 %, como la palanca del J47. La temperatura de la turbina no se manda: sale del emparejamiento. No hay limitador automático, así que a fondo el motor puede pasar su límite, y entonces se daña.
- **Toma de aire.** Contra los datos del J47 no se aplica ninguna pérdida: la presión total de entrada es la del ensayo. En vuelo, recuperación total en subsónico y una ley estándar de recuperación en supersónico, `estimated` y `// UNVERIFIED` hasta encontrarla en fuente abierta.
- **Tobera.** Convergente. La tobera convergente-divergente queda fuera (Tickets): a Mach alto el modelo pierde empuje por expansión incompleta, y es lo que le pasa a un motor así.
- **Estado.** Solo lo que el contrato permite integrar: el daño acumulado de cada límite y el fallo. Las vueltas siguen al mando sin retraso: los transitorios están fuera de alcance.

## 4. Las seis preguntas

### 4.1 Gas

**Candidatos.**

- G1: un solo calor específico para todo el motor (γ = 1.4).
- G2: uno para el aire frío y otro para el gas caliente.
- G3: calor específico variable con la temperatura y con la relación combustible-aire, a partir de los coeficientes de NASA Glenn (NASA/TP-2002-211556) para N₂, O₂, Ar, CO₂ y H₂O, con combustión completa y sin disociación.

**Previsión.** G3 es la referencia y es la que irá en el modelo. G1 falla por varios puntos en empuje y más en consumo, como avisa el brief. G2 queda a uno o dos puntos de G3 sin postquemador y se separa con postquemador, donde el gas pasa de 1800 K.

**Cómo se mide.**

- G1 y G2 contra G3: `computed` contra `computed`, en las condiciones de ensayo del J47.
- Las tres contra las medidas del J47, con `E` y `u_val`.
- G3 contra pyCycle, que sí calcula el equilibrio químico: mide lo que cuesta no modelar la disociación.

**Por qué G3 no cuesta más.** Con combustión completa y pobre, la composición del gas es lineal en la relación combustible-aire. Bastan dos tablas, la del aire y la de lo que añade el combustible, y cualquier mezcla es su combinación. Se calculan una sola vez.

### 4.2 Fuera de diseño

Los tres candidatos comparten el ciclo y el gas. Cambia cómo se describe el compresor.

- **A. Turbina y tobera bloqueadas.** Con las dos gargantas bloqueadas, la turbina trabaja siempre con la misma relación de expansión, y la conservación de la masa y de la energía fija el punto de funcionamiento sin mapa. Con un gas de propiedades constantes queda una sola línea, función de las vueltas corregidas. Con el gas G3 esa línea depende además, poco, de la temperatura absoluta de entrada y de la relación combustible-aire: no se da por hecho que una sola línea baste (sección 4.5). Dos añadidos necesarios:
  - cuando la tobera deja de estar bloqueada (poco gas, poca velocidad), se resuelve su gasto real con una iteración de una variable;
  - para saber a qué vueltas corresponde cada punto hace falta una ley de trabajo del compresor. La más simple: el trabajo por unidad de masa crece con el cuadrado de las vueltas. Es el eslabón más débil de A, y es `model`.
- **B. A, con las tendencias empíricas de Morris** (NASA TM 78653) para los rendimientos fuera de diseño. Según su ficha, supone que el compresor trabaja en su línea de máximo rendimiento.
- **C. Mapas genéricos escalados**, como GENENG (NASA TN D-6552), con el emparejamiento completo.

**Nota del 16 de noviembre, tras leer las fuentes de método y antes de abrir ningún dato del J47.** El modelo de compresor de B son tres gráficos de Robbins y Dugan, de ocho compresores que Morris no nombra. Los mapas del listado de GENENG son ilustrativos, según el propio informe, así que C necesita otra fuente de mapas. Las dos cosas están preguntadas al PM (`docs/cp/007.md`, preguntas 13 y 14). No cambian el motor v0, que es A, ni el criterio de acierto.

**Previsión.** A acierta cerca del régimen máximo, digamos por encima del 85 % de las vueltas, y se degrada a pocas vueltas, donde el rendimiento del compresor cae y la tobera se desbloquea. En altura, el error dominante es el de Reynolds, y afecta a los tres por igual si no se corrige. C es más fiel a pocas vueltas, pero su mapa es de otro compresor: gana forma y pierde procedencia.

**Qué se construye.** El motor v0 de la compuerta 2 es A. El estudio de la compuerta 3 mide A, B y C contra el J47 y recomienda.

**Reynolds.** Se mide primero cuánto predice de más el modelo sin corrección, en función del índice de Reynolds de entrada. Si se añade una corrección, se calibra con RM E52L16 (J47-GE-25), se comprueba con los puntos de altura de RM E9G09 (otro J47, anterior) y cuenta como parámetro libre. Su validación de verdad es el motor reservado.

### 4.3 Límites

Cada límite tiene un identificador, una cifra con fuente y una regla de daño. Las cifras se leerán de las fuentes; aquí solo va de dónde.

| Identificador | Qué limita | De dónde saldría la cifra | Previsión de estado |
| --- | --- | --- | --- |
| `turbine-inlet-temperature` | El material de la turbina | El límite de operación que den los informes del J47. En esa época se medía a la salida de la turbina: se pasa a la entrada con el ciclo, y esa cifra es `computed`, no `measured` | `validated` cerca del J47 |
| `compressor-exit-temperature` | El material de las últimas etapas del compresor | El J47 no se acerca a este límite, así que no da la cifra. Fuente por encontrar | `estimated` |
| `compressor-surge-margin` | El bombeo del compresor | Los datos de pérdida del J47 (RM E9I26, RM E54L20a) y, para otros diseños, NASA SP-36 | Cerca del J47, por ver; lejos, `estimated` |
| `combustor-blowout` | La llama se apaga en altura | Los límites de operación en altura de RM E9I26 y el rendimiento de combustión de RM E9L02, con un parámetro de carga de la cámara | Calibrado con el J47; lejos, `estimated` |
| `afterburner-blowout` | El postquemador se apaga | RM E51E08 y RM E50G13: presión mínima a la entrada del postquemador | Calibrado con el J47D; lejos, `estimated` |

- **Dos clases de fallo.** Los de material destruyen el motor por daño acumulado. Los de llama y de bombeo lo paran en el acto. En los dos casos el contrato dice lo mismo: empuje y consumo a cero, y el fallo nombra su límite.
- **El postquemador que se apaga no rompe el motor.** El motor sigue en seco. El contrato no tiene cómo decirlo: es una pregunta al PM.
- **Regla de daño, v0.** El daño crece con el exceso sobre el límite multiplicado por el tiempo, y el motor falla al agotar un presupuesto en kelvin-segundo; por encima de un techo, falla en el acto. Es `estimated`. Para la compuerta 3 se buscará una fuente abierta de rotura por fluencia del material de los álabes del J47, que daría una regla exponencial con procedencia.
- **Compuerta 2:** solo `turbine-inlet-temperature`, con su fallo. El resto, en la compuerta 3.

### 4.4 Tamaño y masa

**Previsión.**

- **Diámetro.** Lo fija el gasto de aire: el área de entrada del compresor es el gasto dividido por lo que deja pasar un metro cuadrado a un Mach axial dado. Ancla: el diámetro y el gasto del J47, de sus informes.
- **Masa.** Crece con el gasto de aire algo más que en proporción, y con la relación de compresión, porque hacen falta más etapas. Fuentes candidatas: NASA TM X-2406 (Sagerser, Lieblein y Krebs) y NASA CR-159481 (Onat y Klees). Ancla: la masa del J47.
- **Estado.** Todo lo que no sea el propio J47 es `estimated`. El contrato ya lo prevé con `massEvidence`.

### 4.5 Coste

**Previsión.** Una llamada cuesta unos pocos microsegundos, muy por debajo de los 0.1 ms del check 7.

- **Una sola vez, al diseñar:** las tablas del gas, el punto de diseño, las dos áreas, las cifras de los límites, la masa y el diámetro.
- **En cada llamada:** las condiciones totales de entrada, el emparejamiento resuelto con un número fijo de iteraciones, la expansión en la tobera y el daño.
- **Tabla de la línea de funcionamiento, solo si hace falta.** Si resolver en cada llamada no cupiera en el presupuesto, se tabularía la línea al diseñar. Con el gas G3 esa tabla necesita dos ejes, las vueltas corregidas y la temperatura total de entrada: con uno solo, el mismo régimen corregido a 219 K y a 390 K de entrada daría el mismo punto, y no lo es. Con la tobera sin bloquear hace falta un tercero, la relación entre la presión ambiente y la de entrada. El error de una tabla frente a la solución directa es un error de forma del modelo: se mediría aparte y no entraría en `u_num`.
- Sin arrays de trabajo en `step`. Solo los dos objetos pequeños que exige el contrato.
- El vuelo integra con Runge-Kutta de orden 4, así que puede llamar cuatro veces por paso. Sigue sobrando.

**Cómo se mide.** Mediana de muchas llamadas en Node 24, en condiciones de vuelo variadas, tras calentar. Se informa la cifra y la máquina.

### 4.6 Explicación

**Propuesta: el motor en corte, con la temperatura dibujada a lo largo.** Una sola imagen: el perfil del motor de la toma a la tobera y, encima, la curva de temperatura del gas en cada estación. El compresor la sube un poco, la cámara la dispara, la turbina se queda con lo que necesita el compresor, y lo que sobra sale por la tobera. Una línea horizontal marca lo que aguanta la turbina. Subir la temperatura de diseño acerca el pico a esa línea: es la prueba de aceptación del brief, vista.

Descartadas: el diagrama temperatura-entropía, que es exacto pero pide explicar la entropía; y el diagrama de flujos de energía, que enseña el reparto pero esconde los límites.

## 5. Datos del J47

**Lo que se espera encontrar** (por los títulos y resúmenes de NTRS):

| Informe | Para qué |
| --- | --- |
| RM E9G09 | Prestaciones del conjunto: empuje, gasto de aire, gasto de combustible y consumo, de 5000 a 50 000 pies a Mach 0.21, y de Mach 0.21 a 0.97 a 25 000 pies, en todo el rango de vueltas |
| RM E9G28, RM E9L02, RM E9K10 | Compresor, cámara y turbina del mismo motor en la misma campaña. Son las entradas medidas de la comparación sin parámetros libres. **No estaban en el brief** |
| RM E52L16 | J47-GE-25: componentes y conjunto frente al índice de Reynolds |
| RM E9I26, RM E51J15 | Límites de operación; por qué las prestaciones no se generalizan con la altura |

**Cómo se guardan.**

- Un CSV por informe y por tabla o figura, en las unidades del informe. La conversión a SI se hace al cargar, en `units.ts`, con su prueba.
- Cada fila lleva su clase de dato: `measured` (símbolo o tabla), `NACA faired` (curva sin símbolos) o `report text`.
- Si el informe trae la cifra en una tabla, se usa la tabla. Si no, se digitaliza con `tools/digitize/`, sin modificarlo, en dos pasadas independientes; la segunda la hace un subagente que no ve la primera.
- **Cada punto digitalizado lleva en su fila** el valor de la pasada A, el de la pasada B, su incertidumbre de digitalización (la mayor entre la diferencia de pasadas y un píxel del escaneo) y su incertidumbre total, que la compone en raíz de suma de cuadrados con la precisión que declare el informe. Es lo que pide `REVIEW.md`, punto 4, y lo que ya escribe `tools/digitize/compare.py`.
- La ficha (`README.md`, en inglés) dice documento, página, figura o tabla, variante del motor, combustible, tobera, definición de cada magnitud corregida y la precisión que declare el informe.
- **Qué empuje.** Cada columna dice si es empuje neto o del chorro, y a cuál se refiere el consumo específico.

**Para la compuerta 2, lo mínimo:** RM E9G09 y los tres informes de componentes. El resto entra en la compuerta 3.

## 6. La comparación

Dos niveles, los dos sin ajustar nada punto a punto.

- **Nivel 1, cierre del ciclo.** Mide el gas (pregunta 1) y la contabilidad del ciclo. Cero parámetros libres.
  - Entradas, medidas en cada punto de ensayo: gasto de aire, relación de compresión, rendimientos de compresor, cámara y turbina, y pérdida de presión.
  - **Hace falta una entrada más.** Con las anteriores, el equilibrio de trabajo entre compresor y turbina fija la caída de temperatura en la turbina, pero no la temperatura a la que entra el gas. El cierre previsto es el área de la tobera, que es geometría del motor (`report text`), con su coeficiente de descarga si el informe lo da: la continuidad en la tobera fija entonces la temperatura.
  - Salidas con ese cierre: empuje, gasto de combustible, consumo y temperatura de salida de la turbina.
  - **Cierre alternativo,** si el informe no da el área o su coeficiente: la temperatura medida a la salida de la turbina. Entonces el gasto de combustible deja de ser una predicción independiente, porque casi sale de un balance de energía con esa temperatura. Se diría, y en ese caso se puntuaría solo el empuje.
  - Cuál de los dos cierres se usa se anota en el punto de control al leer el informe, antes de calcular.
  - **Coeficientes de la tobera.** El empuje depende del coeficiente de velocidad de la tobera. Si el informe lo mide, entra como medida. Si no, se toma 1, se declara como supuesto y no se ajusta nunca mirando el empuje. El estudio dará cuánto cambia el empuje por cada punto de ese coeficiente: unos pocos puntos de coeficiente son del orden del umbral de acierto, así que no es un detalle.
- **Nivel 2, predicción fuera de diseño.** El motor se ancla en un solo punto de ensayo, el de menor altura y menor Mach a régimen máximo, y todo lo demás (otras alturas, otros Mach, otras vueltas) se predice.
  - El ancla es el punto de referencia del motor (sección 3). No se traslada a nivel del mar.
  - **Qué sale del ancla.** Medido: gasto de aire, relación de compresión, vueltas, los rendimientos de compresor, cámara y turbina y la pérdida de presión, todos en ese punto. Calculado a partir de lo medido, con el cierre del nivel 1: la temperatura de entrada a la turbina, que nadie midió; es `computed`. De texto del informe: el poder calorífico del combustible y las vueltas de ralentí. Los coeficientes de la tobera, como en el nivel 1.
  - **Las dos áreas del modelo se calculan siempre en el ancla,** por continuidad, una vez cerrado su estado. El área geométrica que dé el informe solo sirve de cierre. Con ese cierre, el área calculada en el ancla coincide con la del informe por construcción; si el informe no la da, el ancla se cierra con la temperatura medida a la salida de la turbina.
  - **La constante de la ley de vueltas** de A sale del trabajo del compresor y de las vueltas en el ancla. No se ajusta con ningún otro punto.
  - **Ninguna constante se promedia sobre los puntos que se puntúan.** Los rendimientos del nivel 2 son los del ancla y se mantienen constantes; que no lo sean en la realidad es justo el error que se quiere medir.
  - Los puntos del ancla no se puntúan.

**Recuento de parámetros libres.**

- Lo medido que entra tal cual, en el punto donde se midió, no es un parámetro libre: es una entrada. Se lista con su fuente.
- Todo lo que se fije mirando más de un punto, o mirando las magnitudes que luego se puntúan, es un parámetro libre: una tendencia de rendimiento con las vueltas, la corrección de Reynolds, un coeficiente de tobera ajustado. Cada uno nombra los datos con que se fijó.
- El estudio da, por variante, la lista de entradas y el número de parámetros libres. Para A en el nivel 2 el número previsto es cero.
- **Esa cuenta es una lectura del brief, y el PM tiene que confirmarla** (punto de control, pregunta 12). Trata lo que se lee en el ancla, un solo punto, como entrada y no como calibración. Si no vale, lo que sale del ancla y se aplica a otros puntos (los rendimientos, la temperatura y la constante de la ley de vueltas) pasa a contarse como parámetro libre. El estudio dará las dos cuentas.

**Lo que se informa**, por magnitud y por condición de ensayo, como manda `docs/PROCESS.md`. La estructura es una adaptación nuestra de ASME V&V 20, no el estándar; el estudio lo dirá donde la use.

- `E = S − D`, en la unidad de la magnitud y en porcentaje de lo medido.
- `u_val = sqrt(u_D² + u_num² + u_input²)`.
  - `u_D`: la incertidumbre total del punto medido: la precisión que declare el informe, compuesta con la de digitalización. Si el informe no declara ninguna, se dice, y se usa una estimación propia con su motivo.
  - `u_input`: la media anchura de la banda del modelo al mover cada entrada medida dentro de su incertidumbre.
  - `u_num`: `docs/PROCESS.md` lo da por cero mientras el modelo sea algebraico. Este itera, así que no lo es: se estima afinando la tolerancia de las iteraciones, y se informa. Es una segunda diferencia con la regla 2, y también se dirá.
- La lista de entradas y el número de parámetros libres de cada variante.

**Criterio de acierto con el J47. Tiene que estar fusionado en `main` antes de abrir ningún informe con resultados del J47** (`docs/PROCESS.md`, regla 3). Escribirlo aquí no basta: por eso esta compuerta va en un PR, y no se abre ningún informe del J47 hasta que el dueño ordene su merge. Mientras tanto solo se leen las fuentes de método.

- Un punto es un acierto si `|E| ≤ max(u_val, 5 % de lo medido)`, en empuje neto y en gasto de combustible; en gasto de aire, con el 3 %.
- Una región de ensayo (una altura y un Mach, por encima del 85 % de las vueltas) cuenta como comparada con acierto si aciertan al menos tres de cada cuatro de sus puntos en las tres magnitudes.
- El motor da `validated` solo dentro de las regiones con acierto y solo para diseños cercanos al J47. En todo lo demás, `estimated`.
- **Qué es "el J47" en las decisiones del jugador.** Las decisiones valen parado a nivel del mar, y el túnel no ensayó ahí. El diseño equivalente del J47 es por tanto `computed`: lo que da el modelo, anclado en el punto de ensayo, al llevarlo a ese punto de diseño. Si el informe trae en su texto las cifras nominales a nivel del mar, se comparan con las calculadas y se informa la diferencia; no las sustituyen. No se usa ninguna cifra de memoria.
- Los umbrales del 5 %, el 3 %, el 85 % y los tres cuartos son una propuesta propia, sin precedente publicado. El PM puede cambiarlos antes del merge de este plan; después, cualquier cambio es una enmienda `post hoc`.
- Si el nivel 2 no acierta, se dice y el motor entero se queda como `estimated`.

**pyCycle** (check 4): el mismo turborreactor en el punto de diseño y en varios puntos fuera de diseño. Es `computed` contra `computed`; nunca se presenta como medida.

**Motor reservado** (compuerta 3): prerregistro con la estructura del estudio 001, fusionado antes de calcular ninguna predicción.

## 7. Pruebas del check 2

- **Ciclo ideal contra su solución cerrada.** Con gas de calor específico constante y rendimientos iguales a uno. La fórmula de libro supone expansión completa hasta la presión ambiente y desprecia la masa del combustible; el modelo lleva tobera convergente y cuenta el combustible. Para que la comparación sea exacta y no a unos puntos, la prueba tiene dos casos, y en los dos la forma cerrada se deduce en la propia prueba, con la masa del combustible incluida:
  - tobera sin bloquear, donde la convergente expande del todo y vale la fórmula de expansión completa;
  - tobera bloqueada, con la forma cerrada de salida sónica y su empuje de presión.
  Se busca la cita de las dos; hasta tenerla, `// UNVERIFIED`.
- **Conservación de la energía en cada componente:** entalpía que entra, más calor, menos trabajo, igual a entalpía que sale. Y el trabajo de la turbina iguala al del compresor.
- **Contrato:** mismas entradas, misma salida; `step` no cambia sus argumentos; tras un fallo, empuje y consumo son cero y el fallo no se borra.
- **Un fallo por cada límite,** con su identificador.
- **Unidades:** ida y vuelta de cada conversión.
- **Diseños imposibles:** cada razón de rechazo tiene su caso.

## 8. Riesgos

1. **El calendario.** La compuerta 2 es el miércoles 18. Antes de abrir datos del J47 tienen que llegar el merge de este plan y el OK a las descargas. Digitalizar cuatro informes en dos pasadas es lo más lento. Si no llega todo, la compuerta 2 sale con RM E9G09 y los rendimientos de componentes en el régimen máximo, y lo dice.
2. **La ley de vueltas de A.** Si falla contra la línea de funcionamiento medida del J47, v0 pasa a comparar por temperatura de salida de turbina en vez de por vueltas, y la ley queda como `estimated`.
3. **Variantes del J47.** RM E9G09 y RM E52L16 son motores distintos de la misma familia. No se mezclan en una misma comparación sin decirlo.
4. **pyCycle con Python 3.14.** Esta máquina tiene 3.14.2 y puede que OpenMDAO no lo admita todavía. Si no, hará falta otro intérprete; se dirá antes de instalar nada.
5. **Conocimiento previo.** El modelo que escribe esto recuerda cifras de catálogo de motores de la época. No se usa ninguna sin fuente; ver el registro de contaminación.
