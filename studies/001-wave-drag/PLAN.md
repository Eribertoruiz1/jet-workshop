# Plan · Estudio 001, resistencia de onda

Brief 004, compuerta 1. Fecha: 15 de noviembre de 2026. Esta es la revisión 2, que aplica la revisión del PM de la compuerta 1. Va con `PREREGISTRATION.md`, que fija las métricas, los umbrales y la regla de elección. Este plan dice qué se calcula y cómo. Si los dos dicen cosas distintas, manda el prerregistro.

## 1. Entregables y estructura

| Ruta | Qué es | Compuerta |
| --- | --- | --- |
| `studies/001-wave-drag/PLAN.md` | Este plan | 1 |
| `studies/001-wave-drag/PREREGISTRATION.md` | Fase A ahora; fase B con las predicciones | 1 y 3 |
| `studies/001-wave-drag/geometry/conditions.json` | Planta y condiciones de ensayo, transcritas de la hoja, con su fuente | 1 |
| `studies/001-wave-drag/src/planform.ts`, `conditions.ts`, `edges.ts` | Geometría de la planta, tramos, subconjuntos y tabla de bordes | 1 |
| `studies/001-wave-drag/out/edges.md`, `edges.csv` | Tabla de bordes y recuento de condiciones, generados | 1 |
| `studies/001-wave-drag/geometry/*.json` (resto) | Geometría de RM L52B08 y de la hoja (perfiles, posiciones), con figura, tabla y página de cada cota | 2 |
| `studies/001-wave-drag/src/*.ts` (resto) | Distribución de áreas, integrales de resistencia de onda, candidatos y puntuación | 2 |
| `studies/001-wave-drag/run.ts` | El único comando: regenera todas las tablas, todas las figuras y el texto del estudio | 1, y crece en la 2 |
| `studies/001-wave-drag/out/` | Tablas (Markdown y CSV) y figuras (SVG) generadas | 2 |
| `studies/001-wave-drag/study.template.md` | Texto del estudio con marcadores; `run.ts` los rellena con cifras calculadas | 2 |
| `docs/studies/001-wave-drag-method.md` | El estudio, generado desde la plantilla. Ninguna cifra a mano | 2 |
| `studies/001-wave-drag/predictions.csv` | Predicciones del método recomendado y de la línea base | 3 |
| `studies/001-wave-drag/predictions-all.csv` | Predicciones de todas las curvas evaluadas, mismo formato | 3 |
| `docs/cp/004.md` | Punto de control del carril | todas |

### El comando

Desde la raíz del repositorio:

```
corepack pnpm exec tsx studies/001-wave-drag/run.ts
```

- `run.ts` también ejecuta las comprobaciones numéricas del estudio (sección 6). Siguen ahí, y no en `pnpm test`, por decisión del dueño en la revisión de la compuerta 1.
- No hay que tocar ni `package.json` ni `vitest.config.ts`.

### Lenguaje y dependencias

- El estudio se escribe en TypeScript, porque así puede llamar a `packages/physics` y `packages/validation` por ruta relativa, sin modificarlos.
- No hay dependencias nuevas.
- Las figuras son SVG escritos por el propio script.

## 2. Reglas del ciego, en la práctica

1. **El `.cache/` de la carpeta principal tiene `l51i04a/` y `l51k16a/`.** No se abren ni se listan por dentro. A este worktree solo se copian los archivos de RM L52B08, que es dato abierto.
2. **`git fetch` solo de `main`.** Nunca se hace checkout ni diff de `lane/heldout-data`. No se lee `packages/validation/data/heldout/`; si apareciera antes de tiempo, no se abre y se avisa.
3. **La hoja `docs/studies/heldout-geometry.md` está en `main` desde el PR 4** y es la única fuente de la geometría reservada.
4. **Antes de leer una fuente, se busca en su texto y en su lista de figuras** el nombre de los dos informes, el de sus autores y alas de esta familia (alargamiento 3.5, estrechamiento 0.2, perfil 65A) con otros espesores o a Mach 1.60.
   - Lo que aparezca se mira solo lo justo para descartarlo o confirmarlo.
   - Si es material reservado, se salta esa parte y se anota en el registro de contaminación: qué fuente, qué se vio y qué decisión pudo afectar.
5. **Los subagentes que leen fuentes reciben esta misma regla por escrito.** Devuelven fórmulas y páginas. De un material reservado dicen solo que existe, nunca sus valores.
6. **Las búsquedas en la web no nombran los informes reservados.**

## 3. Geometría

### Ya fijada

En la hoja `docs/studies/heldout-geometry.md`, en `packages/validation/README.md` y en `packages/physics`:

- **Planta.** Alargamiento 3.5, estrechamiento 0.2, envergadura de 24.00 pulgadas y superficie de 1.143 pies². Cuerdas de 11.430 pulgadas en el eje y de 2.286 en la punta. Ala media, secciones en la dirección de la corriente, sin torsión ni diedro.
  - Las flechas de los bordes salen de esta planta en `src/planform.ts`. Es geometría pura de un trapecio, deducida en el código y no citada.
- **Fuselaje.** Cilindro de 2.25 pulgadas de diámetro y ojiva de 6.61 pulgadas con radio de 20 pulgadas. La longitud es de 25.15 pulgadas en L51I04a y en L52B08, y de 25.12 en L51K16a.
  - El script comprobará que la ojiva es tangente, es decir, que (R² + L²) / 2R da 20 pulgadas.
- **Soporte.** En los dos informes reservados tiene el diámetro del fuselaje, 2.25 pulgadas, justo detrás de la base. El cuerpo equivalente sigue, por tanto, como cilindro, y la integral de cuerpo esbelto no depende de dónde se corte (sección 5).
- **Posición del ala.** El punto del 25 % de la cuerda media está en la misma estación del fuselaje en todas las alas (L51K16a, PDF p. 5).
  - En el ala de 47°, el vértice está a 8.748 pulgadas de la nariz (L51I04a, figura 3), así que el punto del 25 % de la cuerda media queda a 16.61 pulgadas. Este valor lo calculó el carril B y el script lo recalculará.
  - De ahí salen los vértices del ala de 35° y de 10.8°, a 10.49 y 12.86 pulgadas, también calculados.
  - En las alas abiertas, la figura 3 de RM L52B08 se lee en el paso 2. Si da otra posición, para esas alas manda RM L52B08 y se anota.
- **Perfiles.** Las coordenadas de la tabla I que transcribe la hoja: secciones del 4, 6 y 9 % y la de la raíz al 12 %.
  - El espesor local de una sección es `t(x) = z_ext(x) + z_int(x)` en la misma estación, porque las dos ordenadas se dan positivas a cada lado de la cuerda.
  - Entre estaciones se interpola en línea recta.
  - En las alas abiertas se usa la tabla del 4 %. En el paso 2 se compara con la tabla de RM L52B08.
- **La raíz engrosada** (`47deg-root12-t06`). En cada estación de cuerda, la ordenada se interpola en línea recta a lo largo de la envergadura: desde la sección de la raíz, en el plano de simetría, hasta la del 6 %, al 40 % de la semienvergadura. Hacia fuera, la del 6 %. Es la lectura literal de la hoja; su ambigüedad entra como I6.

### Nariz redondeada

Es el punto 1c de la revisión, y se fija ahora, antes de calcular.

- **El problema.** Los perfiles 65A tienen el borde de ataque redondeado. Según la hoja, el radio es de 0.0016c, 0.0024c, 0.0056c y 0.0099c para las secciones del 4, 6 y 9 % y la de la raíz. En una nariz redondeada la pendiente dz/dx es infinita, y la teoría lineal no vale allí cuando el borde es sónico o supersónico (prerregistro, A.1).
- **Nominal: nariz poligonal de la tabla.**
  - `t(0) = 0` en x/c = 0, y recta hasta la primera estación tabulada, x/c = 0.5 %. La nariz es una cuña de pendiente finita.
  - No hay ningún parámetro: las estaciones son las de la tabla del informe.
  - Las secciones del 6, 9 y 12 % tabulan en x/c = 0 una ordenada de extradós distinta de cero: 0.061, 0.156 y 0.301. Se debe a que la línea media desplaza el punto del borde de ataque. Se toma `t(0) = 0` igualmente, y la diferencia queda dentro de I8.
- **Alternativa (I8): nariz redondeada.**
  - De x/c = 0 a 0.5 %, la semiespesor es `y = a·√x + b·x`, con `a = √(2r)` del radio de la tabla y `b` tal que `y` iguala a la tabla en x/c = 0.5 %. Más atrás, la tabla.
  - La pendiente en x = 0 es infinita, como la del perfil real.
- **Qué se espera.**
  - Con borde de ataque subsónico, que es la mayoría de T1 a T3, la elección de nariz debería pesar poco.
  - Con borde supersónico o sónico, pesa mucho: el ala de 10.8° abierta en T3, y las seis de T4.
  - La variante redondeada no debería converger en esos casos, y entonces su rango entra en el intervalo (sección 6 y prerregistro, A.7).

### Borde de salida romo

La sección del 4 % termina con un espesor de 0.105 % de la cuerda en cada cara. Las del 6, 9 y 12 % cierran en cero.

- **Nominal: abierto.** El espesor del borde de salida sigue aguas abajo como una estela de espesor constante. Así el área no cae de golpe, porque una caída brusca haría infinita la integral de cuerpo esbelto.
- **Alternativa (I7): cerrado.** El último tramo tabulado, de 95 a 100 %, cierra en cero.
- La resistencia de base del propio borde de salida no se modela, y se dice.

## 4. Base subsónica, común a todos los candidatos

Todos los candidatos suman su término de onda a la misma base:

`CD0(M) = base(M) + W(M)`

**`base(M)`** es la banda actual de ocho variantes: cuatro factores de forma por dos estados de capa límite.
- **Funciones.** Se evalúa con `parasiteDrag` de `packages/physics`, sin modificarla, más el término de sustentación nula del modelo. El término de onda de Korn y Lock queda fuera: se usa `cd − parts.wave`.
- **Mach de los factores.** Los factores de forma y el término de sustentación nula se congelan en Mach min(M, 0.90). Algunas fórmulas de factor de forma no están definidas por encima de Mach 1; Shevell, por ejemplo, tiene una raíz de 1 − M² cos² Λ.
- **Reynolds.** `parasiteDrag` no admite un Reynolds propio: usa la recta de RM L52B08 de `tunnel.ts`, extrapolada por encima de Mach 1.12.
  - El Reynolds de los reservados (L51I04a figura 5, leída a ojo en la hoja; L51K16a, 2.7 millones) entra por I5.
  - El script comprueba que esos valores caen dentro del rango de I5 y, si no, lo ensancha hasta cubrirlos.
- **Factor de forma 1.** Para M ≥ 1.0 se añaden las dos variantes de capa límite con factor de forma 1. Es la convención supersónica habitual, sin verificar (`UNVERIFIED`).
- **Espesor.** El de cada configuración. En `47deg-root12-t06`, la base es la envolvente de la evaluada con el 6 % y con el 12 %, porque `parasiteDrag` admite un solo espesor; es la misma regla que la línea base.

**`W(M)`** es el término de onda de cada candidato, con su puente.

Hasta M 0.90, y con el 4 %, la base coincide con la banda actual. La pregunta del estudio es `W(M)`.

## 5. Candidatos

### A · Regla de áreas

Fórmulas verificadas en Jones, NACA Report 1284 (1956).

**A1, a Mach 1** (p. 757).
- `D/q = −(1/2π) ∫∫ S''(x) S''(x₁) log|x − x₁| dx dx₁`, donde `S` es el área cortada por planos normales a la corriente.
- Jones la da como D = −(ρV²/4π) ∫∫…, que con q = ρV²/2 es la misma.
- Solo intervienen los tramos donde S'' ≠ 0. Con el cuerpo continuado en cilindro, el resultado no depende de la longitud del cilindro.

**A2, para M > 1** (pp. 758 y 759).
- **Planos de Mach.** `X = x − y′ cos θ − z′ sin θ`, con `y′ = √(M² − 1) y` y `z′ = √(M² − 1) z`.
- **Área equivalente.** Para cada θ, `S(X, θ) = s(X, θ) sin μ`, donde `s` es el área cortada por el plano oblicuo y μ el ángulo de Mach.
- **Desarrollo de Fourier.** Con x = x₀ cos φ, se desarrolla `S′(X, θ) = Σ Aₙ sin nφ`. Entonces `D′(θ) = (πρV²/8) Σ n Aₙ²`, es decir, `D′/q = (π/4) Σ n Aₙ²`.
- **Media.** `D = (1/2π) ∫₀^2π D′(θ) dθ`.
- **Comprobación del desarrollo.** `A₁ = (2/π) S(X₀)/X₀` y `A₂ = 2A₁ − (4/π) v/X₀²`.
- Cuando M tiende a 1, los cortes son normales y A2 tiende a A1.
- **Aviso de Jones** (p. 759): en algunos casos hicieron falta más de 20 términos para que la serie convergiera.
- **Otro dato de Jones** (p. 759): en el experimento de Whitcomb, la teoría lineal coincide con los datos a partir de Mach 1.08 aproximadamente. Es una configuración de otra familia; no se usa como dato.

**Ak.** A2 por un factor k, acotado en [0.5, 1.5]: un parámetro libre.

**Numérica.**
- `S(X, θ)` en N estaciones a lo largo del cuerpo equivalente.
  - Para el ala, se integra el espesor local a lo largo de la traza del plano sobre la planta.
  - Para el fuselaje, el área se calcula de forma analítica.
  - Se cuenta solo el ala expuesta.
- El nivel de suavizado es el número N de términos de Fourier. El método de Eminton y Lord, que usa Harris en TM X-947, se usa solo como comprobación cruzada si TM X-947 lo documenta. No es una variante de las predicciones.

### B · Sears-Haack con factor empírico

Redefinido en la revisión 2 con piezas verificables.

**Nivel supersónico: `E_WD · (D/q)_SH`.**
- La resistencia del cuerpo de Sears-Haack es `(D/q)_SH = (9π/2)(A_max/l)²`.
  - Sale de Jones, ec. A3, p. 762: C_D = (9/8)π² (r_max/x₀)² sobre el área máxima, con longitud 2x₀.
- `A_max` es la mayor área normal del conjunto.
- `l` nominal es la longitud del fuselaje. El fuselaje sigue en el soporte con el mismo diámetro, así que la longitud no está definida; el rango entra como I9.

**Forma en Mach.** Es la curva normalizada de AeroSandbox, `approximate_CD_wave` en `aerosandbox/library/aerodynamics/transonic.py`, versión `master` leída el 15-11-2026, cuyo texto cita a Raymer:
- la ley de Lock entre Mcrit y Mdd;
- tramos de Hermite hasta 1 en Mach 1.05 y en Mach 1.2, con un pico de unos 1.23 hacia Mach 1.10;
- una asíntota hacia 0.8 por encima de 1.2, que el texto atribuye a Raymer.

**Mcrit.** El de Korn y Mason con kA = 0.87, como el modelo actual. AeroSandbox usa 0.95 por defecto; se anota.

**Lo que no se usa.**
- La fórmula de Raymer con 0.386 y (M − 1.2)^0.57 venía en la revisión 1 de este plan, escrita de memoria. No está en AeroSandbox ni en las fuentes descargadas.
- Los valores típicos de E_WD (1.2, de 1.8 a 2.2 y de 2.5 a 3) y la regla de restar los tramos de sección constante. Vienen de la memoria del PM y no están en ninguna fuente abierta consultada.

**Variantes.**
- **B1.** E_WD = 1, por la regla del prerregistro cuando no hay guía.
- **B2.** E_WD libre, acotado en [1, 4]: un parámetro.

### C · Teoría lineal por piezas

- **Ala aislada.** La resistencia de onda por espesor, en teoría lineal supersónica.
- **Fuselaje aislado.** Como cuerpo de revolución.
- **Suma.** Las dos, sin interferencia.
- **Cálculo.** Cada componente se calcula con la misma integral de campo lejano que A2. Es la resistencia de la teoría lineal, el resultado que Jones atribuye a Hayes en p. 757.
- **Para qué sirve.** C contra A2 mide la interferencia ala-fuselaje.
- **Tratamiento de la nariz y del borde de salida:** el mismo que en A.

### D · Semejanza transónica

**Parámetros.** Se usan exactamente los de la fuente verificada:
- Spreiter, NACA TN 2726 (descargada), sustituida por Report 1153.
- `UNVERIFIED` hasta leerla.

**Referencia propuesta por el PM.** McDevitt, NACA Report 1253: correlación de alas rectangulares con estas reglas. Copia en PDAS, 1.5 MB. La descarga necesita el OK del dueño.

**Variantes.**
- **D1, la curva propia.** Las subidas de las dos alas de entrenamiento se escalan con los parámetros. Su media, interpolada en el parámetro transónico, predice la tercera. No es paramétrica.
- **D2.** La curva colapsada se ajusta con una logística de dos parámetros: su nivel y su centro libres. La anchura se fija con la fuente; si no la da, en 1. La anchura queda fijada en el commit de congelación.

**Qué se espera.** Las tres alas tienen el mismo espesor y alargamiento, y solo cambia la flecha. Si la flecha no entra en los parámetros, D no puede separar las alas, y el estudio lo dirá. Su valor está en extrapolar al espesor.

### E y E0 · Líneas base

- **E.** El modelo actual, `korn-mason-lock`, con sus ocho variantes.
- **E0.** `baseline-incompressible`, sin subida.

Las reglas de `NA` están en el prerregistro, A.8.

### Puentes (pregunta 3), para A y C

Unen la base con el nivel de onda `W(1)` a Mach 1. Por encima de Mach 1 manda el método de nivel: A2, Ak o C. En todos, `W(M) = 0` por debajo de M₀.

| Id | Forma | Parámetro libre |
| --- | --- | --- |
| P1 | `W(M) = W(1) · [(M − M₀) / (1 − M₀)]⁴` para M₀ < M < 1 | M₀, en [0.80, 0.99] |
| P2 | La misma forma con exponente p | p, en [1, 8]. M₀ se despeja para que la pendiente valga 0.1 en el inicio de la mejor relación de inicio (O-1 u O-2, la de menor error con el ala fuera) |
| P3 | Hermite cúbica de (M₀, 0, pendiente 0) a (1, W(1), pendiente de W por encima de 1) | ninguno; M₀ se despeja como en P2 |

P2 y P3 heredan el parámetro de su relación de inicio, que cuenta en el total.

### Relaciones de inicio (pregunta 1)

| Id | Relación | Parámetro libre |
| --- | --- | --- |
| O-E | Korn y Mason con flecha simple, kA = 0.87: el modelo actual | 0 |
| O-1 | Korn y Mason con flecha efectiva, cos Λₑ = (cos Λ½)ⁿ, kA = 0.87 | n, en [0, 1] |
| O-2 | Korn y Mason con flecha simple y kA libre | kA, en [0.80, 1.00] |
| curva | El cruce de pendiente 0.1 de la curva completa de cada candidato; `NA` si no cruza | los del candidato |

### Recuento de combinaciones

Se evalúan todas y se informan todas:

- A2 con P1, P2 y P3;
- Ak con P1 y P3. Ak con P2 queda fuera porque sumaría tres parámetros;
- C con P1, P2 y P3;
- B1 y B2;
- D1 y D2;
- E y E0.

Son 14 curvas completas, más las relaciones de inicio aisladas. Ninguna combinación pasa de dos parámetros libres.

Las 14 curvas, salvo E0, van también en `predictions-all.csv` en la compuerta 3. E va además en `predictions.csv`.

## 6. Verificación numérica

Se hace antes del commit de congelación y sin datos de resistencia. Fija el nivel de suavizado y el número de ángulos, y da `u_num`.

### Cuerpos de revolución

1. **Cuerpo de Sears-Haack.** El código tiene que dar `(9π/2)(A_max/l)²` (Jones, ec. A3).
2. **Cuerpo de arco parabólico cerrado.** Su resistencia de cuerpo esbelto tiene forma cerrada, que se verificará en la fuente.
3. **Ojiva y cilindro.** Convergencia con N. No tiene forma cerrada.

### Alas

Añadidas en la revisión 2.

4. **Ala elíptica de perfil biconvexo** (Jones, ec. A5, p. 762).
   - El espesor es `z = z_max (1 − x²/a² − y²/b²)`.
   - La resistencia es `C_D = 4 (z_max/a)² · [1 / √(M² − 1 + a²/b²)] · [2 − (M² − 1) / (M² − 1 + a²/b²)]`, sobre la superficie en planta.
   - Es una forma cerrada de teoría lineal, con bordes afilados.
   - Sirve con bordes subsónicos y supersónicos. Se prueba a varios Mach entre 1.05 y 1.6 y con varios cocientes b/a.
5. **Ala rectangular de gran alargamiento con perfil biconvexo.** Debe tender a `16τ²/(3β)` de Ackeret a medida que crece el alargamiento.
   - **Fuente.** La fórmula de Ackeret no aparece escrita en las fuentes descargadas. Se confirma de forma indirecta: el límite de la ec. A5 cuando b/a → ∞ es `4(z_max/a)²/β`. Coincide con aplicar 16τ²/(3β) sección a sección al ala elíptica, porque la media de cuerda por espesor relativo al cuadrado vale 3/4 del valor en el eje.
   - **Cómo se comprueba.** Se informa la desviación contra el alargamiento, que debería caer como 1/(βA).

### Nivel de suavizado

El elegido es el menor N que reproduce los casos 1, 2, 4 y 5 dentro del 1 % y converge en el caso 3. Es el criterio del punto 2 de la revisión: el suavizado también tiene que pasar las alas.

### Convergencia

Es el punto 3 de la revisión, y aplica a cada condición del estudio, con datos abiertos y en las predicciones.

- **Barrido.** N en N₀, 2N₀ y 4N₀, y el número de ángulos θ en n₀, 2n₀ y 4n₀, cada uno con el otro en su nivel más fino. N₀ y n₀ son los fijados por la verificación.
- **Meseta.** El último cambio es como mucho la mitad del anterior y como mucho el 1 % del valor, o 0.00005 en CD si eso es mayor. Con meseta en los dos ejes, `u_num` es la suma de los dos últimos cambios.
- **"No converge".** Si falta la meseta en algún eje, el rango completo del barrido entra en `predicted_min` y `predicted_max`. Prerregistro, A.7.
- **La afirmación del PM sobre la nariz** se comprueba aquí:
  - El barrido se pasa sobre las alas reales en T4 y en el T3 abierto de 10.8°, con nariz poligonal y con nariz redondeada.
  - Si la resistencia con nariz redondeada crece como log N con borde supersónico, queda confirmada en lo numérico.
  - El resultado va en el commit de congelación, antes de mirar datos.

### Commit de congelación

Prerregistro, A.6. Va con:

- N₀ y n₀;
- E_WD de B1 (= 1, sin fuente) y la razón;
- la anchura de D2 con su fuente;
- `out/edges.md`, regenerado sin cambios;
- las tablas de esta sección.

## 7. Entradas inciertas

Esta es la lista de las entradas inciertas: la sensibilidad y el ensanche del intervalo usan esta lista, y solo esta.

| Id | Entrada | Nominal | Extremos |
| --- | --- | --- | --- |
| I1 | Posición del ala a lo largo del fuselaje | Punto del 25 % de la cuerda media a 16.61 pulgadas (calculado) | ±0.005 pulgadas si la cota está impresa en número; ±0.05 pulgadas si se calcula o se mide sobre el dibujo |
| I2 | Coordenadas del perfil entre estaciones | Interpolación lineal | Spline cúbica de la tabla, salvo en el tramo de nariz, que es I8 |
| I3 | Suavizado | N₀ | Los dos niveles vecinos, N₀/2 y 2N₀ |
| I4 | Cierre del cuerpo equivalente | Cilindro continuo: el soporte tiene el diámetro del fuselaje | Solo si la figura 3 de RM L52B08 muestra otro soporte en las alas abiertas: transición a ese diámetro |
| I5 | Reynolds | La recta de `tunnel.ts` | ±10 %, ensanchado si hace falta para cubrir el Reynolds de la hoja. Se aplica como cociente de coeficientes de rozamiento, con `turbulentCf` y `mixedCf` exportadas, sobre los términos de ala y fuselaje |
| I6 | Ambigüedades de la hoja; en la raíz engrosada, el reparto de ordenadas | Interpolación lineal de ordenadas a lo largo de la envergadura | Perfil del 6 % escalado al espesor local |
| I7 | Borde de salida del 4 % | Abierto, con estela de espesor constante | Cerrado en el último tramo |
| I8 | Nariz | Poligonal de la tabla | Redondeada con el radio de la tabla (sección 3) |
| I9 | Longitud `l` de Sears-Haack (solo B) | Longitud del fuselaje | De la nariz al borde de salida del ala en el eje (fin de la variación de área) a la longitud del fuselaje |

La discretización en θ y en N no es una entrada: es `u_num`, o el rango de "no converge".

## 8. Cómo se responde cada pregunta

1. **Inicio.** Se compara, con el ala fuera de cada rotación, el error de O-E, O-1, O-2 y del inicio implícito de cada curva. `NA` es fallo.
2. **Nivel.** Se comparan A2, Ak, B, C y D en T3, con el ala fuera, y su subida entre Mach 1.0 y 1.13 frente a la figura 9.
3. **Puente.** Se comparan P1, P2 y P3 en T2, con el ala fuera. En el hueco de 1.04 a 1.08 no hay datos, así que ningún ajuste se apoya ahí.
4. **Fuselaje.** Se aplica A1 y A2 al fuselaje aislado, sin parámetros, frente a `bielat-l51i04a-body.csv`.
   - Es la prueba más limpia de la integral, porque no hay ala.
   - Se juzga el nivel a M ≥ 1.0. Por debajo, solo se informa.
5. **Coste.**
   - Se mide el tiempo de una curva completa de 60 Mach para una geometría nueva, cálculo de áreas incluido: mediana de 200 repeticiones, en Node 24 con `performance.now()`.
   - Se informa qué geometría necesita cada método.
   - Por encima de 16 ms, el estudio dice qué cálculo previo o qué tabla lo haría interactivo; por ejemplo, áreas precalculadas por ángulo, o una tabla en Mach. No elimina candidatos.
6. **Explicación.** Una figura generada para la lección: la distribución de áreas del ala de 35° y su fuselaje, con el cuerpo de Sears-Haack de la misma longitud y el mismo volumen encima, a Mach 1. Además, la descomposición fuselaje, ala e interferencia (A2 frente a C).

### Bordes sónicos

La tabla `out/edges.md`, generada, da el Mach normal a cada borde en cada condición. El estudio informa los errores con esa tabla al lado, y T4 en sus dos grupos: 10.8° con 35°, y las cuatro de 47°. No se excluye ninguna condición.

### Otras dos trampas que el estudio tiene que medir

**Cuerpo esbelto no es ala delgada.**
- La teoría de cuerpo esbelto pide que la semienvergadura sea pequeña frente a la longitud en la escala de Mach: β·s/c pequeño, donde s es la semienvergadura y c la cuerda en la raíz.
- La teoría lineal pide que el flujo no sea transónico (parámetro de semejanza grande) y bordes que no sean sónicos.
- El script calcula estos criterios para cada ala y cada Mach.

**Resistencia mínima no es resistencia a sustentación nula.**
- Todo el estudio usa la resistencia a sustentación nula, CL = 0.
- La resistencia de onda por curvatura a sustentación nula no se modela, y se dice.

## 9. Tablas y figuras

Todas las genera `run.ts`:

- **La tabla de bordes y el recuento de condiciones.** Ya existe.
- **Por candidato y combinación:**
  - el error con el ala fuera en cada rotación, en T2, en T3 y en el inicio;
  - la métrica principal;
  - los parámetros libres y sus valores ajustados en cada rotación;
  - el coste en milisegundos;
  - las condiciones marcadas "no converge".
- **Por ala:** CD0 contra Mach, con las muestras de la figura 9 y los valores (b) de las polares, la base, E, E0 y los mejores candidatos con el ala fuera.
- **Fuselaje aislado** frente a A1 y A2.
- **Verificación numérica:** tablas de la sección 6, con los cuerpos, las alas y el barrido de la nariz.
- **Sensibilidad** del método recomendado, por entrada (I1 a I9).
- **Validez:** los criterios de la sección 8 por ala y por Mach.
- **La figura de la lección.**

## 10. Fuentes

Descargadas el 15-11-2026 con el OK del dueño, en `.cache/sources/` de este worktree, que no se sube:

| Archivo | Fuente | Estado |
| --- | --- | --- |
| `naca-tr-1284.pdf` | Jones, NACA Report 1284 (1956). NTRS 19930092281 | Leído entero. Verificado: A1 (p. 757), A2 y el desarrollo de Fourier (pp. 758 y 759), Sears-Haack (A3) y el ala elíptica (A5, p. 762). No trata la nariz redondeada. |
| `naca-tr-1273.pdf` | Whitcomb, NACA Report 1273 (1956). NTRS 19930092271 | Pasado por el cortafuegos; sin leer todavía |
| `nasa-tm-x-947.pdf` | Harris, NASA TM X-947 (1964), copia de PDAS | Pasado por el cortafuegos; sin leer todavía |
| `nasa-tr-r-72.pdf` | Whitcomb y Sevier, NASA TR R-72 (1960), copia de PDAS | Pasado por el cortafuegos; sin leer todavía |
| `mason-config-aero-supersonic.pdf` | Mason, Configuration Aerodynamics, capítulo 10 (2016) | Bajado del espejo `archive.aoe.vt.edu`, porque `dept.aoe.vt.edu` no respondía. Buscado por texto: trata los bordes subsónicos y supersónicos solo para la sustentación. No da la fórmula de Ackeret ni trata la nariz redondeada. Sus ecuaciones son imágenes |
| `naca-tn-2726.pdf` | Spreiter, NACA TN 2726 (1952). NTRS 19930083364 | Pasado por el cortafuegos; sin leer todavía |

Los SHA-256 completos de los archivos leídos están en `docs/cp/004.md`, pegados de la salida de `sha256sum`. En el código, toda fórmula sin confirmar lleva `// UNVERIFIED`, y el estudio la lista.

**Otras fuentes.**
- **AeroSandbox**, `transonic.py`, versión `master` del 15-11-2026, leído como página web por un subagente: es la forma de B. No contiene E_WD ni la fórmula de Raymer con 0.386.
- **Pendiente del OK del dueño:** McDevitt, NACA Report 1253, copia de PDAS, 1.5 MB.
- **Probablemente no accesibles en abierto:** Sears (1947), Haack (1941), Eminton y Lord (1956) y el libro de Raymer. Se citan a través de Jones o Harris, con su página.

## 11. Subagentes

Los permite el brief para leer fuentes largas: Report 1273, TM X-947 y TN 2726. Cada uno:

- recibe la regla del ciego por escrito (sección 2, puntos 4 y 5);
- devuelve fórmulas con número de ecuación y página, y la lista de figuras con resultados de configuraciones reservadas, solo los títulos;
- deja anotados sus tokens y su tiempo en el punto de control.

No hacen falta subagentes para calcular ni para revisar.

## 12. Pasos

| Paso | Qué | Para en |
| --- | --- | --- |
| 0 | Plan, prerregistro y tabla de bordes | **Compuerta 1** |
| 1 | Verificación del resto de fórmulas (Report 1273, TM X-947, TN 2726 y, con OK, Report 1253) y registro de contaminación | |
| 2 | Geometría de RM L52B08 y de la hoja a `geometry/*.json`, con citas | |
| 3 | Núcleo numérico y verificación (sección 6): cuerpos, alas, convergencia y nariz. Fija N₀, n₀ y `u_num` sin datos de resistencia | |
| 3b | **Commit de congelación** (prerregistro, A.6) | |
| 4 | Candidatos con datos abiertos: rotaciones, tablas, figuras y coste; pregunta 4 con el fuselaje | |
| 5 | Sensibilidad de los candidatos que encabecen la tabla | |
| 6 | Borrador del estudio, generado, con la recomendación de la regla A.9 | **Compuerta 2** |
| 7 | Con el método elegido por el dueño: fase B, `predictions.csv` y `predictions-all.csv` | **Compuerta 3** |

## 13. Riesgos

- **Bordes sónicos.**
  - Las seis condiciones de T4 tienen el borde de ataque supersónico o sónico, y las nueve del T3 ciego, el borde de salida casi sónico.
  - Es donde la teoría lineal es singular o depende de la nariz.
  - El intervalo lo recoge (I8 y "no converge"), pero puede quedar más ancho que el umbral. Entonces la clase no puede salir `acierta`, por diseño.
- **Pocas muestras supersónicas.** T3 tiene seis muestras abiertas, y el ala de 47° solo una. La recomendación exige además la media cuadrática de T3 con el ala fuera.
- **La teoría lineal cerca de Mach 1.** Puede sobreestimar el nivel. Ak y el puente lo pueden absorber, pero a costa de parámetros.
- **Fuentes primarias inaccesibles.** Sears, Haack, Eminton y Lord, y Raymer.
- **La base supersónica.** Factor de forma por encima de Mach 1, otro túnel y otro Reynolds en L51K16a. Puede pesar tanto como el término de onda a Mach 1.60.
- **El dato de L51K16a sale de la parábola.** En el spike 1 la parábola quedó por debajo de la figura 9 hasta 0.0009 (`docs/cp/001.md`, Open).

## 14. Lo que este carril necesita de otros

- **Carril B:** la figura 11 de L51I04a, digitalizada en los Mach ensayados de la hoja. Ya no es opcional, según la revisión del PM.
- **Ningún cambio en archivos de otros carriles.**
