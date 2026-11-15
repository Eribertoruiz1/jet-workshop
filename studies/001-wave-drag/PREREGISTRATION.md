# Prerregistro · Estudio 001, resistencia de onda: fase A

Brief 004, compuerta 1. Redactado el 15 de noviembre de 2026 por la sesión constructora del carril C. Cuenta como prerregistro desde que se fusiona en `main`: vale la fecha del commit de merge.

## Cómo está organizado

- **Estructura.** Sigue la tabla 1 de Hofman y otros, "Pre-registration for Predictive Modeling" (arXiv 2311.18807v1, sección 4).
  - **Fase A**, la definición del problema, se escribe antes de entrenar nada. Es este archivo.
  - **Fase B**, los detalles del modelo, se escribe después de elegir el método y antes de mirar los datos de prueba.
- **Cuándo entra la fase B.** Se añade al final de este archivo, con fecha, en el PR de predicciones (compuerta 3), sin tocar el texto de la fase A.
- **Cambios a la fase A.** Todo cambio va en el punto B.5 como enmienda fechada, marcada `post hoc` y con su motivo. Se informa también el resultado con la regla original.
- **Comparación.** Sigue `docs/PROCESS.md`, que es una adaptación nuestra de ASME V&V 20. El plan de trabajo está en `PLAN.md`, en esta misma carpeta.

## 0. Lo que ya se ha visto

Hofman y otros piden declarar qué se conoce de los datos antes de modelar. Lo declaramos así.

### Los datos abiertos no son vírgenes

El spike 1 los leyó y los comparó con el modelo actual. Esta sesión ha leído sus cifras en `docs/cp/001.md` y en el brief 004:

- **Inicio de la subida.**
  - Korn falla por −0.09, −0.02 y +0.12 de Mach.
  - Según las muestras de la figura 9, la subida empieza en Mach 0.921 (10.8°) y 0.951 (35°).
  - El texto del informe da 0.92 (10.8°) y 0.97 (47°).
- **Tamaño de la subida.** Entre Mach 0.90 y el pico, la figura 9 sube 0.0123, 0.0089 y 0.0077.
- **Fuselaje aislado.** Su resistencia, de Mach 0.50 a 1.13.

La comparación con datos abiertos es, por tanto, un conjunto de desarrollo. Sirve para elegir un método, no para afirmar que funciona. Lo único ciego es la prueba con datos reservados.

### De los informes reservados, solo condiciones de ensayo

De NACA RM L51I04a y RM L51K16a, esta sesión conoce lo que dicen `docs/cp/001.md`, `packages/validation/README.md` y el brief 003. Son configuraciones y condiciones de ensayo:

- **L51I04a.** El ala de 47° con tres espesores y con la raíz engrosada, en el túnel de 8 pies de Langley.
- **L51K16a.** Mach 1.60, en el túnel supersónico de 4 por 4 pies, con Reynolds de 2.7 millones sobre la cuerda media. Ensaya las alas de 10.8°, 35° y 47° al 4 %, y la de 47° al 4, 6 y 9 % y con la raíz engrosada.

No conoce ningún valor de resistencia ni de sustentación de esas configuraciones. El fuselaje aislado de L51I04a es dato abierto por la decisión 0004. Todo queda en el registro de contaminación de `docs/cp/004.md`.

### Ningún candidato calculado

Cuando se escribe este archivo, no existe código del estudio.

## A.1 Pregunta

**Pregunta principal.** ¿Qué método, evaluable en un navegador, predice la resistencia a sustentación nula de estas configuraciones ala-fuselaje mejor que el modelo actual? Interesan dos tramos: de Mach 0.90 a 1.13, y Mach 1.60. La predicción se juzga sobre configuraciones que el método no ha visto.

**Preguntas parciales.** Son las seis del brief 004: inicio, nivel, puente, fuselaje, coste y explicación. El plan dice cómo se responde cada una.

**Expectativa previa.** Es juicio, no resultado, y se escribe para que se pueda contrastar:

- Candidato más probable: la regla de áreas supersónica, con un puente de un parámetro.
- Nivel: el riesgo principal es que la teoría lineal sobreestime el nivel cerca de Mach 1, donde el flujo no es lineal.
- Mach 1.60: allí la teoría lineal debería acertar mejor.
- Inicio de la subida: es lo más difícil de predecir sin calibrar.

## A.2 Variables dependientes

### Qué se predice

1. **`cd0`.** El coeficiente de resistencia a sustentación nula, en cada Mach ensayado.
   - Se mide a CL = 0. No es la resistencia mínima: en estas alas con curvatura, el mínimo cae cerca de CL 0.09.
   - Va sobre la superficie de referencia del informe: el trapecio llevado al eje, 1.143 pies² en esta serie.
   - Usa la corrección de la serie: la presión de base se iguala a la estática de la corriente libre.
   - La hoja `docs/studies/heldout-geometry.md` manda sobre estas definiciones. Si da otra superficie o corrección, la predicción usa la de la hoja y lo dice.
2. **`drag_rise_mach`.** El Mach de inicio de la subida, con la definición de la NACA: el menor Mach en que dCD0/dM = 0.1, a sustentación nula.
3. **`cd0` a Mach 1.60**, en las configuraciones de L51K16a.

**Magnitud secundaria.** Sale de las predicciones; no lleva veredicto. Es la subida respecto a Mach 0.50: ΔCD0(M) = CD0(M) − CD0(0.50). Se compara usando solo los centros de los intervalos:

- `E_Δ = [S(M) − S(0.50)] − [D(M) − D(0.50)]`

### Cómo se obtiene el dato `D`

Se aplica la misma regla a los datos abiertos y a los reservados.

**(a) Curva trazada por la NACA.** Si existe una curva de resistencia a sustentación nula contra Mach (clase `naca_faired_crossplot`), se usan sus muestras en los Mach muestreados: `D = value_adopted` y `u_D = u_total`. Es el dato principal cuando existe.

**(b) Parábola por los símbolos.** Si no hay curva de la NACA, se ajusta una parábola CD = a + b CL + c CL² por los símbolos medidos de la polar con |CL| ≤ 0.3, y se evalúa a CL = 0.
- Hacen falta al menos tres niveles de CL distintos. Dos símbolos a menos de 0.02 en CL cuentan como un solo nivel, como en el cruce de comprobación del spike 1.
- El valor se marca como `computed`.
- `u_D` es el mayor `u_total` de los símbolos usados.
- Si no se puede evaluar, la condición queda como `no evaluable`: se cuenta, se lista y no entra en las tasas.
- Si existen (a) y (b), (b) se informa como comprobación.

**(c) Inicio de la subida.** Se calcula sobre la secuencia de valores `D` de una configuración, ordenada por Mach. Es el mismo cálculo que `sampledDragRiseMach` en `packages/validation/src/score.ts`:
- La pendiente entre muestras consecutivas se asigna al Mach medio del intervalo.
- El inicio es la interpolación lineal de ese Mach medio donde la pendiente cruza 0.1.
- Se añade una regla nueva: no se usa ningún intervalo que cruce el hueco de choques reflejados, Mach 1.04 a 1.08.
- **Si no se llega a 0.1** en las muestras y el texto del informe da el valor, se usa ese valor, marcado como "texto del informe (NACA)". Su `u_D` es 0.005, por el redondeo a la centésima.
- **Si se llega**, `u_D` es la mitad de la distancia en Mach entre los dos puntos medios que rodean el cruce.
- Si no hay ninguna de las dos cosas: `no evaluable`.

No se usa ningún dato dentro del hueco de 1.04 a 1.08.

## A.3 Variables independientes

Las entradas de todo método son geometría y condiciones de ensayo. Ninguna sale de un dato de resistencia, salvo los parámetros libres declarados en A.9.

- **Planta.** Alargamiento, estrechamiento, flecha de la línea del 25 % y superficie.
- **Espesor y perfil.**
  - El espesor relativo y su reparto a lo largo de la envergadura.
  - La distribución de espesor del perfil: coordenadas NACA 65A de la tabla de RM L52B08 para el 4 %. Para otros espesores, lo que diga la hoja de geometría.
- **Fuselaje.** Cilindro de 2.25 pulgadas, ojiva de 6.61 pulgadas con radio de 20 pulgadas, longitud de 25.15 pulgadas.
- **Posición del ala sobre el fuselaje.** La figura 3 de RM L52B08; en los reservados, la hoja.
- **Condiciones de ensayo.** Mach y Reynolds de la hoja.

## A.4 Datos de entrenamiento (abiertos)

### Dato principal: la figura 9

Son las 36 muestras de `packages/validation/data/bielat-l52b08.csv`, clase `naca_faired_crossplot`, a CL = 0. Por tramo:

| Ala | T1 (M ≤ 0.90) | T2 (0.90 < M ≤ 1.04) | T3 (1.04 < M ≤ 1.20) |
| --- | ---: | ---: | ---: |
| 10.8° | 4 | 6 | 3 |
| 35° | 4 | 6 | 2 |
| 47° | 4 | 6 | 1 |
| **Total** | **12** | **18** | **6** |

### Dato secundario: los símbolos de las polares

Los símbolos de las figuras 5(b), 6(b) y 7(b) son medidos. Se convierten a CL = 0 con la regla (b) en cada Mach de polar. Se informan, pero no deciden la elección.

### El fuselaje aislado

`bielat-l51i04a-body.csv` solo se usa en la pregunta 4. No ajusta ningún parámetro.

### Particiones

Son tres rotaciones, siempre dejando un ala fuera:

| Rotación | Se ajusta con | Se prueba en |
| --- | --- | --- |
| R1 | 35° y 47° | 10.8° |
| R2 | 10.8° y 47° | 35° |
| R3 | 10.8° y 35° | 47° |

### Tramos de Mach

Valen para los datos abiertos y los reservados:

- **T1:** M ≤ 0.90.
- **T2:** 0.90 < M ≤ 1.04, la subida.
- **T3:** 1.04 < M ≤ 1.20, el supersónico bajo del túnel transónico.
- **T4:** M = 1.60. No hay datos abiertos a este Mach.

## A.5 Datos de prueba (reservados)

- **Qué son.** NACA RM L51I04a y RM L51K16a, digitalizados por el carril B (brief 003) en dos pasadas, en `packages/validation/data/heldout/`.
- **Condiciones.** Las de `docs/studies/heldout-geometry.md`.
- **Cuándo se puntúan.** Una sola vez, en el brief 005, después de que `predictions.csv` esté en `main` y con las reglas de este archivo.
- **Acceso.** Este carril no los abre. Las reglas del ciego están en `PLAN.md` y el registro, en `docs/cp/004.md`.

### Subconjuntos

- **Ciego.** Todas las configuraciones que no están en los datos abiertos, en todos sus Mach: el ala de 47° con otros espesores y la de raíz engrosada. Además, todas las configuraciones a Mach 1.60, porque no hay datos abiertos a ese Mach. Los veredictos se calculan solo sobre este subconjunto.
- **Réplica.** Una configuración reservada que la hoja identifique como igual a una abierta, por ejemplo el ala de 47° al 4 % en L51I04a, en tramos transónicos. Se puntúa y se informa aparte; no cuenta para el veredicto, porque esa ala se usó para entrenar.

## A.6 Transformaciones

- **Ningún punto medido se toca.** No se suaviza, no se interpola y no se modifica. Lo derivado sale solo de las reglas de A.2 (parábola, cruce de pendiente, incrementos) y lleva la marca `computed`.
- **Mismos Mach que los datos.** Cada predicción se evalúa en el Mach exacto del dato: el Mach ensayado de la hoja o el Mach muestreado de la figura 9.
- **Suavizado de la distribución de áreas.** La integral de resistencia de onda lo necesita. Es una elección numérica:
  - Se fija con la verificación contra cuerpos de solución conocida, nunca contra datos de resistencia.
  - Los demás niveles de suavizado entran en la sensibilidad, no en la elección.
  - `PLAN.md` dice cuáles son.

## A.7 Métricas y umbrales

### Por condición

Una condición `i` es una configuración, un Mach y una magnitud.

- **Centro.** `S_i` es el centro del intervalo predicho, `(predicted_min + predicted_max) / 2`.
- **Incertidumbre de entrada.** `u_input,i` es su media anchura.
- **Incertidumbre numérica.** `u_num,i` vale 0, salvo que el estudio de convergencia diga otra cosa. En ese caso, es el cambio entre los dos niveles de discretización más finos.
- **Error y cociente.**
  - `E_i = S_i − D_i`.
  - `u_val,i = sqrt(u_D² + u_num² + u_input²)`.
  - `r_i = |E_i| / u_val,i`.
- **Acierto:** `|E_i| ≤ T`. Los umbrales `T` salen del brief 001 y se fijaron antes de este estudio:
  - 0.003 para `cd0` en T2, T3 y T4. Es la meta del spike 1 entre Mach 0.90 y 1.12, propuesta nuestra sin precedente publicado.
  - 0.03 para `drag_rise_mach`, también meta del spike 1.
  - 0.0020 para `cd0` en T1. Es el precedente publicado; se informa sin veredicto.
- **Cubierta:** el dato cae dentro de `[predicted_min, predicted_max]`. Se informa.

### Por clase

Las clases son T2, T3, T4 y `drag_rise_mach`; T1 se informa aparte. Para cada clase se dan:

- el número de condiciones `n` y la tasa de aciertos `H`;
- la fracción de condiciones con `r ≤ 1`;
- el sesgo (media de `E`), la media cuadrática de `E` y el mayor `|E|`;
- la mediana de `u_input`.

### Veredicto por clase

- **`acierta`:** `H ≥ 0.75`, `|sesgo| ≤ T/2` y mediana de `u_input` ≤ `T`. La última condición impide que un intervalo ancho apruebe por ser ancho.
- **`falla`:** `H < 0.50`, o `|sesgo| > T`.
- **`parcial`:** cualquier otro caso.
- **`no evaluable`:** `n = 0`.
- **Muestra pequeña.** Con `n < 4`, el veredicto lleva la marca "n pequeño".

### Veredictos del método recomendado

Hay dos, y se calculan sobre el subconjunto ciego.

**Transónico** (clases T2, T3 y `drag_rise_mach`):

- **`funciona`:** T3 y `drag_rise_mach` en `acierta`, y T2 no en `falla`.
- **`falla`:** T3 o `drag_rise_mach` en `falla`.
- **`parcial`:** cualquier otro caso.

**Mach 1.60:** el veredicto de la clase T4.

### Contra la línea base

En cada clase se dan las mismas estadísticas para la línea base.

- Si la línea base no tiene predicción en una condición (`NA`), esa condición cuenta como fallo suyo.
- El método recomendado "mejora la línea base" en una clase si su `H` es mayor. Si las dos `H` son iguales, mejora si su media cuadrática de `E` es menor en las condiciones que predicen los dos.

## A.8 Líneas base

### E: el modelo actual, tal como está

Es la banda `korn-mason-lock` de `packages/validation`, con sus ocho variantes, llamada sin modificar y a CL = 0.

- **Donde el modelo da un valor**, aunque lo marque fuera de rango, ese valor es la predicción de la línea base.
- **Donde no da valor**, la predicción es `NA` (sin predicción). Son dos casos:
  - por encima de Mdd + 0.05, donde la aplicación ya no dibuja la curva (`beyondLock`);
  - por encima de Mach 1.13 (`MAX_MACH`).
- **Inicio de la subida.** `dragRiseMach` sobre las ocho variantes, del mínimo al máximo.
- **Geometrías que el modelo no representa.** El modelo admite un solo espesor relativo, así que no representa la raíz engrosada. Para esas configuraciones, el intervalo cubre el modelo evaluado con el espesor de la raíz y con el de la punta, ocho variantes en cada caso.

### E0: sin subida

Es la banda `baseline-incompressible`: sin términos de Mach y sin subida. Solo aparece en el estudio, como referencia; no va en `predictions.csv`.

Ninguna de las dos líneas base se ajusta.

## A.9 Otros puntos que se fijan ahora

### Candidatos y parámetros libres

La definición de cada uno está en `PLAN.md`.

| Id | Qué es | Parámetros libres |
| --- | --- | ---: |
| A1 | Regla de áreas transónica (Whitcomb): resistencia de onda de cuerpo esbelto del cuerpo equivalente, con cortes normales, a Mach 1 | 0 |
| A2 | Regla de áreas supersónica (Jones, Harris): cortes oblicuos de Mach para M > 1, que tienden a A1 cuando M → 1 | 0 |
| Ak | A2 multiplicada por un factor k | 1 |
| B1 | Procedimiento de Raymer: Sears-Haack por E_WD, con E_WD fijo, de una guía accesible anotada antes de comparar con datos; si no hay ninguna, E_WD = 1 | 0 |
| B2 | Procedimiento de Raymer con E_WD ajustado | 1 |
| C | Teoría lineal: espesor del ala aislada más fuselaje como cuerpo de revolución, sumados sin interferencia | 0 |
| D1 | Semejanza transónica (parámetros de la fuente verificada): la curva colapsada de las dos alas de entrenamiento predice la tercera | no paramétrica |
| D2 | Semejanza transónica con la curva colapsada ajustada a una forma fija | 2 |
| E, E0 | Líneas base | 0 |

D1 no es paramétrica. Se informa, pero no puede ser recomendada bajo el tope de dos parámetros.

**Puente (pregunta 3).** Sirve para A y C. B conserva el esquema de Raymer y D su propia curva de colapso.
- Hay como mucho tres formas, cada una con un solo parámetro libre: P1, P2 y P3 de `PLAN.md`.

**Inicio de la subida (pregunta 1).** Se evalúan:
- el inicio que resulta de la curva completa de cada candidato;
- la relación de Korn y Mason (O-E, la línea base);
- Korn y Mason con un exponente de flecha (O-1, un parámetro);
- Korn y Mason con kA libre (O-2, un parámetro).

**Tope de parámetros.** El método recomendado, sumando todas sus piezas, tiene como mucho dos parámetros libres.

**Candidatos nuevos.** Se pueden añadir candidatos que aparezcan durante el estudio, con dos condiciones:
- Se evalúan solo con datos abiertos, se fechan, se marcan "añadido después de la compuerta 1" y se informan.
- No llegan a las predicciones salvo que el dueño los elija en la compuerta 2.

**Todo se informa.** Se informa cada candidato y cada variante evaluados, incluidos los descartados.

### Regla de elección (datos abiertos, compuerta 2)

**Ajuste.** Cada parámetro libre se ajusta por mínimos cuadrados de `E` sobre las muestras de la figura 9 de las dos alas de entrenamiento con M > 0.90 (T2 y T3), usando el centro de la banda.
- Un parámetro de una relación de inicio se ajusta, en cambio, por mínimos cuadrados del error del inicio de la subida.
- Cada parámetro tiene el rango físico acotado que declara `PLAN.md`.
- Nada se ajusta con las tres alas a la vez.

**Métrica principal.** Es la media cuadrática de `E` del ala que queda fuera, sobre sus muestras T2 y T3 de la figura 9, juntando las tres rotaciones. Son 24 muestras, y cada una se puntúa solo cuando su ala queda fuera.

**Métricas secundarias.**
- El mayor error del inicio de la subida en el ala que queda fuera, sobre las tres rotaciones.
- La media cuadrática de T2 y la de T3 por separado.
- La comparación con los valores (b) en los Mach de las polares.
- El fuselaje aislado (pregunta 4).

**Requisitos para competir.**
- **Coste.** Hay que calcular la curva completa, 60 números de Mach para una geometría nueva, incluido el cálculo previo que depende de la geometría. La mediana de tiempo tiene que ser ≤ 16 ms (un fotograma a 60 por segundo), en Node 24 en la máquina de la sesión. Se informa en milisegundos.
- **Cobertura.** Predecir todas las magnitudes de A.2.

**Orden.**
- Gana la menor métrica principal.
- Hay empate si la diferencia es < 0.0005, la mitad de la precisión declarada en CD.
- En caso de empate, gana el de menos parámetros libres. Si persiste, el de menor error del inicio de la subida en el ala que queda fuera, y después el de menor coste.

**Recomendación.** La decisión es del dueño en la compuerta 2; esto es lo que recomienda el estudio:
- **`construir`:** el primero mejora a E y a E0 en la métrica principal, su métrica principal es ≤ 0.003 y su mayor error del inicio, con el ala fuera, es ≤ 0.03.
  - Mejorar a E es tener menor media cuadrática de `E` donde E predice, y además predecir las muestras donde E no predice.
- **`construir con reservas`:** mejora a E y a E0, pero falla una de las dos metas.
- **`no construir`:** no mejora a E0 o no mejora a E.

**Parámetros de las predicciones finales.** Para cumplir "nada se ajusta con las tres alas a la vez", no se ajusta con las tres juntas. El valor central es la mediana de los tres valores de las rotaciones, y el intervalo usa los tres.

### Regla del intervalo predicho

`predicted_min` y `predicted_max` salen de una envolvente que luego se ensancha por la incertidumbre de las entradas.

**La envolvente** cubre las combinaciones de dos cosas:

1. **La banda de base.**
   - Las ocho variantes parásitas actuales:
     - los factores de forma, congelados en Mach min(M, 0.90);
     - el rozamiento, evaluado al Mach M con el Reynolds de la hoja;
     - el término de sustentación nula del modelo actual (inducida y curvatura), evaluado en min(M, 0.90).
   - Para M ≥ 1.0, además las dos capas límite con factor de forma 1. Es la convención supersónica habitual, pero no está verificada. Entran las dos convenciones porque ninguna está verificada.
2. **Los parámetros libres:** los valores de las tres rotaciones.

**El ensanche.** Cada entrada incierta de `PLAN.md` se mueve de una en una a su extremo y se mide cuánto cambia cada límite. Los cambios se suman en raíz de la suma de cuadrados:
- `max += sqrt(Σ Δ⁺²)`;
- `min −= sqrt(Σ Δ⁻²)`.

**Lo que no entra.** No se añade margen por error del modelo: según V&V 20, ese error es lo que `E` estima.

**El inicio de la subida.** Su intervalo es el mínimo y el máximo del cruce sobre los mismos miembros de la envolvente, ensanchado igual.

### Formato de `predictions.csv`

| Columna | Contenido |
| --- | --- |
| `config` | El identificador de la hoja de geometría. |
| `mach` | El Mach ensayado, con tres decimales, para `cd0`. Vacío para `drag_rise_mach`. |
| `quantity` | `cd0` o `drag_rise_mach`. |
| `method` | El identificador del método recomendado, o `baseline-korn-mason-lock`. |
| `predicted_min`, `predicted_max` | Cuatro decimales para `cd0` y tres para Mach. `NA` si no hay predicción. |

Cada condición de la hoja tiene dos filas por magnitud: el método recomendado y la línea base.

### Orden y sello

1. Este archivo se fusiona (compuerta 1).
2. El estudio con datos abiertos (compuerta 2).
3. La fase B y `predictions.csv`, en un mismo PR, cuando la hoja ya está en `main` (compuerta 3).
4. Solo después se fusionan los datos del carril B.
5. Puntuación: brief 005, una vez, con estas reglas.

Lo comprueban las fechas de los commits.
