# Prerregistro · Estudio 001, resistencia de onda: fase A

Brief 004, compuerta 1. Redactado el 15 de noviembre de 2026 por la sesión constructora del carril C. Esta es la revisión 2, que aplica la revisión del PM de la compuerta 1. Cuenta como prerregistro desde que se fusiona en `main`: vale la fecha del commit de merge.

## Cómo está organizado

- **Estructura.** Sigue la tabla 1 de Hofman y otros, "Pre-registration for Predictive Modeling" (arXiv 2311.18807v1, sección 4).
  - **Fase A**, la definición del problema, se escribe antes de entrenar nada. Es este archivo.
  - **Fase B**, los detalles del modelo, se escribe después de elegir el método y antes de mirar los datos de prueba.
- **Cuándo entra la fase B.** Se añade al final de este archivo, con fecha, en el PR de predicciones (compuerta 3), sin tocar el texto de la fase A.
- **Cambios a la fase A.** Todo cambio va en el punto B.5 como enmienda fechada, marcada `post hoc` y con su motivo. Se informa también el resultado con la regla original.
- **Comparación.** Sigue `docs/PROCESS.md`, que es una adaptación nuestra de ASME V&V 20.
- **Anexos.** Forman parte de este prerregistro:
  - `PLAN.md`, que define cada candidato y cada entrada incierta.
  - `out/edges.md`, la tabla de bordes y el recuento de condiciones. La genera `run.ts` a partir de `geometry/conditions.json`; no lleva ninguna cifra escrita a mano.

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

### De los informes reservados, solo geometría y condiciones de ensayo

De NACA RM L51I04a y RM L51K16a, esta sesión conoce lo que dice la hoja `docs/studies/heldout-geometry.md`, ya en `main`. También lo que dicen de esos informes `docs/cp/001.md`, `packages/validation/README.md` y el brief 003. La hoja trae:

- configuraciones, planta, fuselaje y posición del ala;
- coordenadas de los perfiles;
- números de Mach y de Reynolds;
- precisión declarada y correcciones;
- qué figura trae cada magnitud.

No conoce ningún valor de resistencia ni de sustentación de esas configuraciones. El fuselaje aislado de L51I04a es dato abierto por la decisión 0004. Todo queda en el registro de contaminación de `docs/cp/004.md`.

### Ningún candidato calculado

Ningún candidato se ha calculado todavía. El único código del estudio que existe es geométrico: la tabla de bordes y el recuento de condiciones.

## A.1 Pregunta

**Pregunta principal.** ¿Qué método, evaluable en un navegador, predice la resistencia a sustentación nula de estas configuraciones ala-fuselaje mejor que el modelo actual? Interesan dos tramos: de Mach 0.90 a 1.13, y Mach 1.60. La predicción se juzga sobre configuraciones que el método no ha visto.

**Preguntas parciales.** Son las seis del brief 004: inicio, nivel, puente, fuselaje, coste y explicación. El plan dice cómo se responde cada una.

### Expectativa previa

Es juicio, no resultado, y se escribe para que se pueda contrastar. La revisión 2 la corrige con la geometría de los bordes (`out/edges.md`). La teoría lineal, que está detrás de A2 y C, tiene puntos débiles conocidos en tres sitios.

**Mach 1.60 (T4).**
- Las alas de 10.8° y 35° tienen el borde de ataque supersónico. Las cuatro de 47° lo tienen casi exactamente sónico.
- Con un borde de ataque redondeado, la teoría lineal da una resistencia que diverge si el borde es supersónico y es singular si es sónico. Esto es lo que afirma el PM.
  - No lo encontré dicho en Jones (NACA Report 1284) ni en el capítulo 10 de Mason.
  - Se deduce de la estructura de la teoría. La resistencia de perfil en teoría lineal crece con ∫(dz/dx)². Con una nariz redondeada, z ∝ √x, así que ∫ dx/x diverge como un logaritmo. En un borde sónico, el factor 1/√(Mn² − 1) se hace infinito.
  - Se comprobará con el barrido de convergencia del paso 3, antes de la congelación.
- Por tanto, la frase de la revisión 1, "a Mach 1.60 la teoría lineal debería acertar mejor", no se sostiene. El resultado en T4 depende del tratamiento de la nariz, que fija `PLAN.md` antes de calcular. Esperamos intervalos anchos en T4, y más en el grupo de 47°.

**T3 ciego.** Las nueve condiciones tienen el borde de salida casi sónico, con Mach normal entre 0.970 y 1.003. La teoría lineal también es casi singular ahí.

**Datos abiertos.** El ala de 10.8° en T3 tiene los dos bordes recién supersónicos, con Mach normal entre 1.014 y 1.041. El problema de la nariz ya aparece en el entrenamiento.

**Lo que se mantiene de la expectativa.**
- El candidato más probable sigue siendo la regla de áreas con un puente de un parámetro, sobre todo en T2.
- El nivel en T3 y T4 es donde más fácil es que falle la teoría lineal.
- El inicio de la subida sigue siendo difícil de predecir sin calibrar.

## A.2 Variables dependientes

### Qué se predice

1. **`cd0`.** El coeficiente de resistencia a sustentación nula, en cada Mach ensayado.
   - Se mide a CL = 0. No es la resistencia mínima: en estas alas con curvatura, el mínimo cae cerca de CL 0.09.
   - Va sobre la superficie de referencia de la serie: el trapecio llevado al eje, 1.143 pies². La hoja confirma que es la misma en las seis configuraciones.
   - La resistencia está corregida a una presión de base igual a la estática de la corriente libre, en los dos informes reservados según la hoja.
2. **`drag_rise_mach`.** El Mach de inicio de la subida, con la definición de la NACA: el menor Mach en que dCD0/dM = 0.1, a sustentación nula.
3. **`cd0` a Mach 1.60**, en las seis configuraciones de L51K16a.

**Magnitud secundaria.** Sale de las predicciones; no lleva veredicto. Es la subida respecto a Mach 0.50: ΔCD0(M) = CD0(M) − CD0(0.50). Se compara usando solo los centros de los intervalos:

- `E_Δ = [S(M) − S(0.50)] − [D(M) − D(0.50)]`

### Cómo se obtiene el dato `D`

**(a) Curva trazada por la NACA (clase `naca_faired_crossplot`).** Se usan sus muestras en los Mach muestreados: `D = value_adopted` y `u_D = u_total`.
- **En los datos abiertos**, es la figura 9 de RM L52B08.
- **En RM L51I04a**, es la figura 11: la resistencia a sustentación nula de las alas 1 a 4. El carril B la digitaliza en los Mach ensayados que da la hoja. Es el dato de toda condición de L51I04a; deja de ser opcional.

**(b) Parábola por los símbolos.** Se ajusta una parábola CD = a + b CL + c CL² por los símbolos medidos de la polar con |CL| ≤ 0.3, y se evalúa a CL = 0.
- Hacen falta al menos tres niveles de CL distintos. Dos símbolos a menos de 0.02 en CL cuentan como un solo nivel, como en el cruce de comprobación del spike 1.
- El valor se marca como `computed`.
- `u_D` es el mayor `u_total` de los símbolos usados. La precisión declarada en CD es ±0.001 en los dos informes.
- **En RM L51K16a**, es el dato de las seis configuraciones a Mach 1.60, a partir de su figura 6.
- **En RM L51I04a y en los datos abiertos**, (b) se informa como comprobación de (a).
- Si no se puede evaluar, la condición queda como `no evaluable`: se cuenta, se lista y no entra en las tasas.

**(c) Inicio de la subida, en los datos.** Se calcula sobre la secuencia de valores `D` de una configuración, ordenada por Mach: la figura 9 en los abiertos y la figura 11 en L51I04a. Es el mismo cálculo que `sampledDragRiseMach` en `packages/validation/src/score.ts`:
- La pendiente entre muestras consecutivas se asigna al Mach medio del intervalo.
- El inicio es la interpolación lineal de ese Mach medio donde la pendiente cruza 0.1.
- Se añade una regla nueva: no se usa ningún intervalo que cruce el hueco de choques reflejados, Mach 1.04 a 1.08.
- **Si no se llega a 0.1** en las muestras y el texto del informe da el valor, se usa ese valor, marcado como "texto del informe (NACA)". Su `u_D` es 0.005, por el redondeo a la centésima.
- **Si se llega**, `u_D` es la mitad de la distancia en Mach entre los dos puntos medios que rodean el cruce.
- Si no hay ninguna de las dos cosas: `no evaluable`.

**(d) Inicio de la subida, en una predicción.** Es el menor Mach en que la pendiente de la curva predicha, dCD0/dM, llega a 0.1. Se busca entre Mach 0.60 y 1.20, con paso de 0.0005, como `dragRiseMach` en `packages/physics`.
- **Si la curva nominal no llega a 0.1** en ese rango, la predicción es `NA` y cuenta como fallo, en los datos abiertos y en los reservados. La curva nominal usa la mediana de los parámetros y las entradas en su valor nominal.
- **Si la nominal llega pero algún miembro de la envolvente no**, `predicted_max` es 1.20, y se anota.

No se usa ningún dato dentro del hueco de 1.04 a 1.08.

## A.3 Variables independientes

Las entradas de todo método son geometría y condiciones de ensayo, tomadas de la hoja y de RM L52B08. Ninguna sale de un dato de resistencia, salvo los parámetros libres declarados en A.9.

- **Planta.** Alargamiento, estrechamiento, flecha de la línea del 25 % y superficie.
- **Espesor y perfil.**
  - El espesor relativo y su reparto a lo largo de la envergadura. En `47deg-root12-t06`: 12 % en el plano de simetría, bajando en línea recta hasta el 6 % al 40 % de la semienvergadura, y 6 % hacia fuera.
  - Las coordenadas de la tabla I: secciones del 4, 6 y 9 % y la sección de la raíz al 12 %. Con su radio de borde de ataque y, en la del 4 %, su borde de salida romo.
- **Fuselaje.** Ojiva de 6.61 pulgadas con radio de 20 pulgadas, cilindro de 2.25 pulgadas y longitud de 25.15 pulgadas en L51I04a y de 25.12 en L51K16a. El soporte, del diámetro del fuselaje.
- **Posición del ala sobre el fuselaje.** El punto del 25 % de la cuerda media está en la misma estación del fuselaje en todas las alas.
- **Condiciones de ensayo.** Mach y Reynolds de la hoja.

## A.4 Datos de entrenamiento (abiertos)

### Dato principal: la figura 9

Son las 36 muestras de `packages/validation/data/bielat-l52b08.csv`, clase `naca_faired_crossplot`, a CL = 0. Por tramo, según `out/edges.md`:

| Ala | T1 | T2 | T3 | Total |
| --- | ---: | ---: | ---: | ---: |
| 10.8° | 4 | 6 | 3 | 13 |
| 35° | 4 | 6 | 2 | 12 |
| 47° | 4 | 6 | 1 | 11 |
| **Total** | **12** | **18** | **6** | **36** |

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
- **Condiciones.** Las de `docs/studies/heldout-geometry.md`, transcritas a `geometry/conditions.json`.
- **Cuándo se puntúan.** Una sola vez, en el brief 005, después de que `predictions.csv` esté en `main` y con las reglas de este archivo.
- **Acceso.** Este carril no los abre. Las reglas del ciego están en `PLAN.md` y el registro, en `docs/cp/004.md`.

### Subconjuntos

Quedan fijados con la hoja.

- **Ciego.** Los veredictos se calculan solo sobre este subconjunto.
  - `47deg-t06`, `47deg-t09` y `47deg-root12-t06` en RM L51I04a, en todos sus Mach.
  - Las seis configuraciones a Mach 1.60 en RM L51K16a, incluida `47deg-t04`, porque no hay datos abiertos a ese Mach.
- **Réplica.** `47deg-t04` en RM L51I04a, en T1 a T3.
  - Lo es por geometría y por túnel: tiene la misma planta, el mismo perfil, el mismo fuselaje, el mismo túnel y los mismos Mach que el ala de 47° abierta.
  - No depende de lo que averigüe el carril B sobre si es el mismo ensayo.
  - Se puntúa y se informa aparte, sin veredicto.

### Recuento

Lo genera `out/edges.md`.

| Subconjunto | T1 | T2 | T3 | T4 | Inicio |
| --- | ---: | ---: | ---: | ---: | ---: |
| Ciego | 12 | 18 | 9 | 6 | 3 |
| Réplica | 4 | 6 | 2 | 0 | 1 |

T1 se informa sin veredicto.

## A.6 Transformaciones

- **Ningún punto medido se toca.** No se suaviza, no se interpola y no se modifica. Lo derivado sale solo de las reglas de A.2 (parábola, cruce de pendiente, incrementos) y lleva la marca `computed`.
- **Mismos Mach que los datos.** Cada predicción se evalúa en el Mach exacto del dato: el Mach ensayado de la hoja o el Mach muestreado de la figura 9.
- **Elecciones numéricas.** El suavizado de la distribución de áreas, la nariz redondeada, el borde de salida romo y el barrido de convergencia son elecciones numéricas o geométricas:
  - Se fijan en `PLAN.md` y con la verificación contra casos de solución conocida, nunca contra datos de resistencia.
  - Sus alternativas entran en el intervalo predicho como entradas inciertas.
- **Congelación.** Antes del primer commit que lea datos de resistencia, va un commit propio con:
  - el nivel de suavizado y el número de ángulos θ;
  - E_WD de B1 con su fuente;
  - la anchura de la curva de D2;
  - la tabla de bordes (`out/edges.md`);
  - los resultados de la verificación numérica.

  Se considera que un commit lee datos de resistencia si contiene código del estudio que abre `bielat-l52b08.csv` o `bielat-l51i04a-body.csv`, o resultados sacados de ellos. Lo comprueba el historial de git.

## A.7 Métricas y umbrales

### Por condición

Una condición `i` es una configuración, un Mach y una magnitud.

- **Centro.** `S_i` es el centro del intervalo predicho, `(predicted_min + predicted_max) / 2`.
- **Incertidumbre de entrada.** `u_input,i` es su media anchura.
- **Incertidumbre numérica.** `u_num,i` sale del barrido de convergencia:
  - Se barren el número de términos N y el número de ángulos θ, cada uno en un factor 4 como mínimo, con tres niveles: N₀, 2N₀ y 4N₀ (y lo mismo en θ). Cada uno se barre con el otro en su nivel más fino.
  - Hay **meseta** en un eje cuando el último cambio cumple dos condiciones:
    - es como mucho la mitad del anterior;
    - es como mucho el 1 % del valor, o 0.00005 en CD si eso es mayor.
  - **Con meseta en los dos ejes**, `u_num` es la suma de los dos últimos cambios.
  - **Sin meseta en algún eje**, la condición se marca "no converge". El rango completo del barrido entra en `predicted_min` y `predicted_max`, y por tanto en `u_input`; `u_num` vale 0, para no contarlo dos veces.
  - Una divergencia logarítmica cambia lo mismo en cada duplicación, así que no da meseta.
- **Error y cociente.**
  - `E_i = S_i − D_i`.
  - `u_val,i = sqrt(u_D² + u_num² + u_input²)`.
  - `r_i = |E_i| / u_val,i`.
- **Acierto:** `|E_i| ≤ T`. Los umbrales `T` y su procedencia:
  - **0.003 para `cd0` en T2 y T3.** Sale del brief 001 (check 4), donde cubre de Mach 0.90 a 1.12 y era propuesta nuestra sin precedente publicado. T3 llega a 1.122, prácticamente dentro.
  - **0.003 para `cd0` en T4, a Mach 1.60.** Es una extensión de este prerregistro: el brief 001 no cubre ese Mach.
  - **0.03 para `drag_rise_mach`.** Sale del brief 001 (check 6).
  - **0.0020 para `cd0` en T1.** Es el precedente publicado del spike 1; se informa sin veredicto.
- **Cubierta:** el dato cae dentro de `[predicted_min, predicted_max]`. Se informa.
- **Sin cruce.** Una predicción `NA` cuenta como fallo, con `E` indefinido.

### Por clase

Las clases son T2, T3, T4 y `drag_rise_mach`; T1 se informa aparte. Para cada clase se dan:

- el número de condiciones `n` y la tasa de aciertos `H`;
- la fracción de condiciones con `r ≤ 1`;
- el sesgo (media de `E`), la media cuadrática de `E` y el mayor `|E|`;
- la mediana de `u_input`;
- el número de condiciones marcadas "no converge".

### Veredicto por clase

Las tasas del 75 % y del 50 %, y los límites de sesgo y de anchura, son nuevos de este prerregistro. No vienen de ningún brief anterior.

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

**Lo que no se hace.** No se excluye ninguna condición, ni ahora ni después: tampoco las de borde sónico ni las marcadas "no converge".

**T4 en dos grupos.** Además del veredicto, las estadísticas de T4 se informan en dos grupos, fijados ya: `10.8deg-t04` con `35deg-t04`, con el borde de ataque supersónico, y las cuatro de 47°, con el borde de ataque sónico. Los grupos no cambian el veredicto.

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
  - por encima de Mach 1.13 (`MAX_MACH`). Por eso no hay línea base en T4.
- **Inicio de la subida.** `dragRiseMach` sobre las ocho variantes, del mínimo al máximo. `NA` si no hay cruce.
- **La raíz engrosada.** El modelo admite un solo espesor relativo, así que no la representa. Para `47deg-root12-t06`, el intervalo cubre el modelo evaluado con el 12 % y con el 6 %, ocho variantes en cada caso.

### E0: sin subida

Es la banda `baseline-incompressible`: sin términos de Mach y sin subida. Solo aparece en el estudio, como referencia; no va en `predictions.csv`.

Ninguna de las dos líneas base se ajusta.

## A.9 Otros puntos que se fijan ahora

### Candidatos y parámetros libres

La definición de cada uno está en `PLAN.md`.

| Id | Qué es | Parámetros libres |
| --- | --- | ---: |
| A1 | Regla de áreas transónica (Whitcomb; fórmula de Jones, Report 1284, p. 757): resistencia de onda de cuerpo esbelto del cuerpo equivalente, con cortes normales, a Mach 1 | 0 |
| A2 | Regla de áreas supersónica (Jones, Report 1284, pp. 758 y 759): cortes oblicuos de Mach para M > 1, que tienden a A1 cuando M → 1 | 0 |
| Ak | A2 multiplicada por un factor k | 1 |
| B1 | Sears-Haack (Jones, Report 1284, ec. A3) por E_WD, con la forma transónica que AeroSandbox atribuye a Raymer. E_WD = 1, porque no hay ninguna guía en fuente abierta | 0 |
| B2 | Como B1, con E_WD ajustado | 1 |
| C | Teoría lineal: espesor del ala aislada más fuselaje como cuerpo de revolución, sumados sin interferencia | 0 |
| D1 | Semejanza transónica (parámetros de la fuente verificada): la curva colapsada de las dos alas de entrenamiento predice la tercera | no paramétrica |
| D2 | Semejanza transónica con la curva colapsada ajustada a una forma fija | 2 |
| E, E0 | Líneas base | 0 |

**Lo que no se usa en B.** Hay tres cosas sin confirmar en una fuente abierta: la fórmula de Raymer con 0.386 y (M − 1.2)^0.57, los valores típicos de E_WD y la regla de restar de la longitud los tramos de sección constante. No se usan, y el estudio lo dice.

**D1** no es paramétrica. Se informa, pero no puede ser recomendada bajo el tope de dos parámetros.

**Puente (pregunta 3).** Sirve para A y C. B conserva su forma y D su propia curva de colapso.
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
- La media cuadrática de T3 con el ala fuera. Interviene en la recomendación.
- El mayor error del inicio de la subida en el ala que queda fuera, sobre las tres rotaciones. Un `NA` cuenta como fallo.
- La media cuadrática de T2 por separado.
- La comparación con los valores (b) en los Mach de las polares.
- El fuselaje aislado (pregunta 4).

**Coste.** No elimina candidatos.
- Se informa el tiempo de una curva completa, 60 números de Mach para una geometría nueva, incluido el cálculo previo que depende de la geometría: mediana en Node 24, en milisegundos.
- Por encima de 16 ms (un fotograma a 60 por segundo), el estudio dice qué cálculo previo o qué tabla lo haría interactivo.
- Decide el dueño en la compuerta 2.

**Cobertura.** Tampoco elimina candidatos. Cada `NA` cuenta como fallo de quien lo da.

**Orden.**
- Gana la menor métrica principal.
- Hay empate si la diferencia es < 0.0005, la mitad de la precisión declarada en CD.
- En caso de empate, gana el de menos parámetros libres. Si persiste, el de menor error del inicio de la subida en el ala que queda fuera, y después el de menor coste.

**Recomendación.** La decisión es del dueño en la compuerta 2; esto es lo que recomienda el estudio:
- **`construir`:** el primero cumple las cuatro condiciones:
  - mejora a E y a E0 en la métrica principal;
  - su métrica principal es ≤ 0.003;
  - su media cuadrática de T3 con el ala fuera es ≤ 0.003;
  - su mayor error del inicio, con el ala fuera, es ≤ 0.03.

  Mejorar a E es tener menor media cuadrática de `E` donde E predice, y además predecir las muestras donde E no predice.
- **`construir con reservas`:** mejora a E y a E0, pero falla alguna de las otras tres condiciones.
- **`no construir`:** no mejora a E0 o no mejora a E.

**Parámetros de las predicciones finales.** Para cumplir "nada se ajusta con las tres alas a la vez", no se ajusta con las tres juntas. El valor central es la mediana de los tres valores de las rotaciones, y el intervalo usa los tres.

### Regla del intervalo predicho

`predicted_min` y `predicted_max` salen de una envolvente, que luego se ensancha por las entradas inciertas y se extiende por el barrido de convergencia.

**La envolvente** cubre las combinaciones de dos cosas:

1. **La banda de base.**
   - Las ocho variantes parásitas actuales:
     - los factores de forma, congelados en Mach min(M, 0.90);
     - el rozamiento, evaluado al Mach M con el Reynolds de la hoja;
     - el término de sustentación nula del modelo actual (inducida y curvatura), evaluado en min(M, 0.90).
   - Para M ≥ 1.0, además las dos capas límite con factor de forma 1. Es la convención supersónica habitual, pero no está verificada. Entran las dos convenciones porque ninguna está verificada.
2. **Los parámetros libres:** los valores de las tres rotaciones.

**El ensanche.** Cada entrada incierta de la lista de `PLAN.md`, sección 7, se mueve de una en una a su extremo y se mide cuánto cambia cada límite. Los cambios se suman en raíz de la suma de cuadrados:
- `max += sqrt(Σ Δ⁺²)`;
- `min −= sqrt(Σ Δ⁻²)`.
- Si la variante de una entrada no converge, su Δ es la mayor desviación respecto del nominal en todo su barrido.

**La convergencia.** Si la condición nominal no converge, `[min, max]` se extiende para cubrir el rango completo de su barrido (A.7).

**Lo que no entra.** No se añade margen por error del modelo: según V&V 20, ese error es lo que `E` estima.

**El inicio de la subida.** Su intervalo es el mínimo y el máximo del cruce sobre los mismos miembros de la envolvente, ensanchado igual. Los casos sin cruce siguen la regla (d) de A.2.

### Formato de las predicciones

**`predictions.csv`:**

| Columna | Contenido |
| --- | --- |
| `config` | El identificador de la hoja de geometría. |
| `mach` | El Mach ensayado, con tres decimales, para `cd0`. Vacío para `drag_rise_mach`. |
| `quantity` | `cd0` o `drag_rise_mach`. |
| `method` | El identificador del método recomendado, o `baseline-korn-mason-lock`. |
| `predicted_min`, `predicted_max` | Cuatro decimales para `cd0` y tres para Mach. `NA` si no hay predicción. |

Cada condición de la hoja tiene dos filas por magnitud: el método recomendado y la línea base.

**`predictions-all.csv`:**
- Tiene el mismo formato y cubre todas las curvas completas evaluadas en el estudio, con su identificador en `method`.
- Va en el mismo PR que `predictions.csv`.
- Solo el método recomendado lleva veredicto. El resto se puntúa como exploratorio, y el informe de puntuación dice cuántas curvas son.
- Los datos reservados solo se pueden usar a ciegas una vez. Por eso todas las predicciones se escriben antes de verlos.

### Orden y sello

1. Este archivo se fusiona (compuerta 1).
2. El commit de congelación (A.6), antes de leer datos de resistencia.
3. El estudio con datos abiertos (compuerta 2).
4. La fase B, `predictions.csv` y `predictions-all.csv`, en un mismo PR (compuerta 3).
5. Solo después se fusionan los datos del carril B.
6. Puntuación: brief 005, una vez, con estas reglas.

Lo comprueban las fechas de los commits.
