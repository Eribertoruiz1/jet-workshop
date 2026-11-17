# Estudio 001 · Cómo cruzar Mach 1: método para la resistencia de onda

Borrador de la compuerta 2 del brief 004 (carril C). **Generado por `studies/001-wave-drag/run.ts` desde `studies/001-wave-drag/study.template.md`: ninguna cifra de este texto está escrita a mano.** Las cifras vienen marcadas con su clase: `measured` y `NACA faired` son datos; `computed` es cálculo de este estudio; `report text` es una cifra del texto de un informe; lo que va como **juicio** es opinión de la sesión constructora.

## 1. Resumen

- **Recomendación de la regla A.9 del prerregistro:** B1, **construir con reservas**. Condiciones que no cumple: mayor error del inicio NA > 0.03.
- Métrica principal de B1 (media cuadrática de E en T2 y T3 con el ala fuera, 24 muestras, `computed`): 0.0029; en T3: 0.0028. La línea base E da 0.0035 en las 10 muestras que predice de las 24; E0 da 0.0084.
- Las tres primeras curvas de la tabla: B1, B2 y Ak-P1.
- **Juicio.** B1 es la curva más sencilla de todas: el nivel de un cuerpo de Sears-Haack con la misma área máxima y la misma longitud que el conjunto, sin ningún parámetro, y la forma en Mach de AeroSandbox. Tiene la menor métrica principal de las curvas que pueden recomendarse, pero no predice bien el inicio: su forma no llega a pendiente 0.1 en 2 de las tres alas. La regla de áreas (A y C) predice bien el inicio con el puente P1 pero sobrestima mucho el nivel del ala de 10.8°, y en T3 con borde de ataque supersónico no converge. Lo que el dueño elige en esta compuerta es, por tanto, entre un método que acierta el nivel y no el inicio, y otro que acierta el inicio y no el nivel.
- **Una advertencia que pesa sobre B1.** El prerregistro declaró (sección 0) que ya se conocían las subidas de la figura 9. B1 se fijó con E_WD = 1 por la regla "sin guía" y su nivel se calculó antes de leer datos (`docs/cp/004.md`, paso 3), pero la coincidencia con esas subidas puede ser suerte de esta familia de alas. La prueba a ciegas es la que lo dirá.

## 2. Qué se pregunta

Las seis preguntas del brief 004: el inicio de la subida, su nivel entre Mach 1.0 y 1.13, el puente entre el tramo subsónico y el supersónico, el fuselaje aislado, el coste y la explicación. Todo se juzga con el ala que queda fuera en tres rotaciones (R1: 10.8° fuera; R2: 35°; R3: 47°), como fija el prerregistro (A.4 y A.9).

## 3. Datos

- **Figura 9 de NACA RM L52B08** (`NACA faired`, 36 muestras): el dato `D` de todas las comparaciones.
- **Símbolos de las polares** (`measured`): convertidos a sustentación nula con una parábola (regla b, `computed`); solo comprobación.
- **Fuselaje aislado de RM L51I04a** (`measured`, dato abierto por la decisión 0004): pregunta 4.
- **Inicio de la subida:** de las muestras con la regla (c), salvo el ala de 47°, donde las muestras no llegan a 0.1 sin cruzar el hueco de 1.04 a 1.08 y se usa el texto del informe (`report text`: RM L52B08, p. 8, "from 0.92 to 0.97").
- **Nada de los datos reservados.** El registro de contaminación está en `docs/cp/004.md`.

## 4. Métodos

Definición completa en `studies/001-wave-drag/PLAN.md`. En breve:

- **Base común:** la banda actual de ocho variantes parásitas (factores de forma congelados en Mach 0.90, rozamiento al Mach de cada punto), más dos variantes con factor de forma 1 a partir de Mach 1. Coincide con la banda actual hasta Mach 0.90.
- **A, regla de áreas** (Jones, NACA Report 1284, pp. 757 a 759): A1 con cortes normales a Mach 1, A2 con planos de Mach por encima. Ak multiplica A2 por k.
- **C, teoría lineal por piezas:** ala expuesta sola más fuselaje solo, con la misma integral; A2 − C es la interferencia.
- **Puentes** entre la base y el nivel de Mach 1: P1 (cuarta potencia con M₀ libre), P2 (exponente libre) y P3 (Hermite), los dos últimos con M₀ de la relación de inicio O-1.
- **B, Sears-Haack** (Jones, ec. A3) por E_WD con la forma de AeroSandbox; B1 con E_WD = 1, B2 con E_WD ajustado.
- **D, semejanza transónica** de Spreiter (NACA TN 2726, ec. 30): D1 es la media de las curvas propias de las dos alas de entrenamiento; D2, una logística de anchura 1.
- **E y E0:** el modelo actual y la base sin subida, de `packages/validation`, sin cambios.

### Verificación numérica (antes de leer datos)

Salida completa en `studies/001-wave-drag/out/verification.md`; el registro de congelación, en `out/freeze.md` (commit de congelación a83a2eb).

- **N₀ = 32** términos de la serie de Fourier (el suavizado). Es el menor de 8, 16, 32, 64 que reproduce los casos 1, 2, 4 y 5 dentro del 1.00 % con 16 nodos por tramo en θ, y con el que el caso 3 converge en N₀, 2N₀ y 4N₀ con la regla de meseta del prerregistro (A.7).
- **m₀ = 8** nodos de Gauss-Legendre por tramo en θ. Es el menor de 2, 4, 8, 16 que hace lo mismo con N₀.
- Regla en θ: Gauss-Legendre compuesta en [0, π/2], partida en los ángulos singulares β cos θ* = |tan Λ| de cada línea de estación tabulada, con subdivisión geométrica (razón 0.25, tramo menor 0.001 rad) hacia las líneas fuertes: borde de ataque, estación del 0.5 % y borde de salida.
- Cuadratura en φ: regla del punto medio con 8 N_max puntos (como mínimo 512). No es un suavizado.
- Barrido de convergencia de cada condición: N en 32, 64 y 128 con 32 nodos por tramo; nodos en 8, 16 y 32 con N = 128.

### La nariz: la afirmación del PM, comprobada

Barrido en N hasta 4096 sobre las alas reales con borde de ataque supersónico o sónico, con nariz poligonal (nominal) y redondeada (I8), m₀ nodos por tramo en θ. CD de onda del conjunto ala-fuselaje (A2).

| Configuración | Mach | Mn borde de ataque | Nariz | N = 32 | N = 64 | N = 128 | N = 256 | N = 512 | N = 1024 | N = 2048 | N = 4096 |
| --- | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| open-10.8 | 1.114 | 1.041 | poligonal | 0.01685 | 0.02029 | 0.02343 | 0.02715 | 0.03183 | 0.03672 | 0.03923 | 0.04030 |
| open-10.8 | 1.114 | 1.041 | redondeada | 0.01683 | 0.02021 | 0.02323 | 0.02664 | 0.03074 | 0.03558 | 0.04090 | 0.04650 |
| 10.8deg-t04 | 1.600 | 1.495 | poligonal | 0.00777 | 0.00864 | 0.00947 | 0.01043 | 0.01164 | 0.01293 | 0.01362 | 0.01391 |
| 10.8deg-t04 | 1.600 | 1.495 | redondeada | 0.00777 | 0.00862 | 0.00941 | 0.01030 | 0.01136 | 0.01261 | 0.01398 | 0.01543 |
| 35deg-t04 | 1.600 | 1.195 | poligonal | 0.00797 | 0.00918 | 0.01031 | 0.01150 | 0.01300 | 0.01479 | 0.01614 | 0.01666 |
| 35deg-t04 | 1.600 | 1.195 | redondeada | 0.00797 | 0.00916 | 0.01026 | 0.01137 | 0.01271 | 0.01430 | 0.01615 | 0.01809 |
| 47deg-t04 | 1.600 | 0.993 | poligonal | 0.00818 | 0.00991 | 0.01195 | 0.01409 | 0.01613 | 0.01690 | 0.01724 | 0.01732 |
| 47deg-t04 | 1.600 | 0.993 | redondeada | 0.00817 | 0.00988 | 0.01185 | 0.01380 | 0.01540 | 0.01599 | 0.01645 | 0.01664 |

Incremento de CD en cada duplicación de N:

| Configuración | Mach | Nariz | → 64 | → 128 | → 256 | → 512 | → 1024 | → 2048 | → 4096 | Tendencia al final |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| open-10.8 | 1.114 | poligonal | 0.00344 | 0.00314 | 0.00372 | 0.00468 | 0.00489 | 0.00252 | 0.00106 | decrece: converge |
| open-10.8 | 1.114 | redondeada | 0.00338 | 0.00301 | 0.00342 | 0.00410 | 0.00484 | 0.00532 | 0.00560 | crece o se mantiene: no converge |
| 10.8deg-t04 | 1.600 | poligonal | 0.00087 | 0.00082 | 0.00096 | 0.00121 | 0.00129 | 0.00069 | 0.00029 | decrece: converge |
| 10.8deg-t04 | 1.600 | redondeada | 0.00086 | 0.00079 | 0.00088 | 0.00106 | 0.00125 | 0.00138 | 0.00144 | crece o se mantiene: no converge |
| 35deg-t04 | 1.600 | poligonal | 0.00120 | 0.00113 | 0.00119 | 0.00150 | 0.00179 | 0.00136 | 0.00051 | decrece: converge |
| 35deg-t04 | 1.600 | redondeada | 0.00119 | 0.00110 | 0.00112 | 0.00134 | 0.00159 | 0.00185 | 0.00194 | crece o se mantiene: no converge |
| 47deg-t04 | 1.600 | poligonal | 0.00173 | 0.00204 | 0.00214 | 0.00204 | 0.00077 | 0.00034 | 0.00008 | decrece: converge |
| 47deg-t04 | 1.600 | redondeada | 0.00171 | 0.00197 | 0.00194 | 0.00161 | 0.00059 | 0.00046 | 0.00019 | decrece: converge |

Una divergencia logarítmica da el mismo incremento en cada duplicación; una que crece más deprisa, incrementos crecientes. La lectura de esta tabla está en `docs/cp/004.md` y en el estudio.

Tiempo de esta verificación: 93 s.

**Lectura (juicio sobre cifras `computed`).** Con borde de ataque supersónico, la nariz redondeada hace divergir la resistencia de la teoría lineal: el incremento por duplicación crece. Con la nariz poligonal de la tabla converge, pero solo con N del orden de miles y a un valor muy alto, porque el primer tramo de la tabla es una cuña muy abierta que la teoría lineal cuenta entera. Con borde casi sónico (47° a Mach 1.6) las dos narices convergen tarde. En esas condiciones la teoría lineal no tiene un valor bien definido para estas alas: depende del suavizado.

## 5. Resultados con datos abiertos

### Tabla principal

Métrica principal: media cuadrática de E = S − D (S el centro del intervalo predicho) en las 24 muestras T2 y T3, cada ala cuando queda fuera. Umbral 0.003 en CD y 0.03 en Mach. Todo `computed` frente a `NACA faired`.

| Puesto | Curva | Parámetros libres | Métrica principal (T2 y T3) | T3 | T2 | Mayor error del inicio | Aciertos (|E| ≤ 0.003) | Sesgo | Sin predicción | No converge | Mejora a E | Mejora a E0 | Coste, ms |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| 1 | B1 | 0 | 0.0029 | 0.0028 | 0.0029 | NA | 58 % | -0.0011 | 0 | 0 | sí | sí | 135.1 |
| 2 | B2 | 1 | 0.0029 | 0.0036 | 0.0027 | NA | 54 % | -0.0008 | 0 | 0 | sí | sí | 135.1 |
| 3 | Ak-P1 | 2 | 0.0039 | 0.0060 | 0.0029 | NA | 71 % | 0.0011 | 0 | 15 | sí | sí | 1783.6 |
| 4 | D2 | 2 | 0.0043 | 0.0037 | 0.0044 | NA | 42 % | 0.0001 | 0 | 0 | no | sí | 0.3 |
| 5 | A2-P1 | 1 | 0.0059 | 0.0087 | 0.0046 | 0.014 | 71 % | 0.0033 | 0 | 14 | sí | sí | 1783.6 |
| 6 | C-P1 | 1 | 0.0060 | 0.0088 | 0.0046 | 0.014 | 67 % | 0.0034 | 0 | 14 | sí | sí | 1783.6 |
| 7 | A2-P2 | 2 | 0.0064 | 0.0087 | 0.0055 | 0.030 | 46 % | 0.0043 | 0 | 11 | sí | sí | 1783.6 |
| 8 | C-P2 | 2 | 0.0065 | 0.0088 | 0.0055 | 0.030 | 42 % | 0.0044 | 0 | 11 | sí | sí | 1783.6 |
| 9 | Ak-P3 | 2 | 0.0064 | 0.0041 | 0.0070 | NA | 33 % | 0.0021 | 0 | 14 | no | sí | 1783.6 |
| 10 | A2-P3 | 1 | 0.0109 | 0.0087 | 0.0116 | 0.085 | 42 % | 0.0073 | 0 | 14 | no | no | 1783.6 |
| 11 | C-P3 | 1 | 0.0110 | 0.0088 | 0.0116 | 0.085 | 38 % | 0.0074 | 0 | 14 | no | no | 1783.6 |
| 12 | D1 | no paramétrica | 0.0038 | 0.0033 | 0.0038 | 0.044 | 38 % | -0.0002 | 2 | 0 | no | no | 0.3 |
| 13 | E | 0 | 0.0035 | 0.0025 | 0.0036 | 0.126 | 25 % | -0.0011 | 14 | 0 | no | no | 2.1 |
| 14 | E0 | 0 | 0.0084 | 0.0105 | 0.0076 | NA | 25 % | -0.0073 | 0 | 0 | no | no | 2.1 |

El coste es la mediana del tiempo de una curva de 60 Mach para una geometría nueva, en milisegundos (sección 7).

### Parámetros ajustados

| Curva | Qué es | Parámetros ajustados en cada rotación |
| --- | --- | --- |
| A2-P1 | Regla de áreas (A1 a Mach 1, A2 por encima) con el puente P1 | R1: M₀ 0.870; R2: M₀ 0.863; R3: M₀ 0.861 |
| A2-P2 | Regla de áreas con el puente P2 (exponente libre, M0 de la relación de inicio) | R1: p 8.00, O-1 0.627; R2: p 8.00, O-1 0.547; R3: p 8.00, O-1 1.000 |
| A2-P3 | Regla de áreas con el puente P3 (Hermite, M0 de la relación de inicio) | R1: O-1 0.627; R2: O-1 0.547; R3: O-1 1.000 |
| Ak-P1 | Regla de áreas por un factor k, con P1 | R1: M₀ 0.849, k 0.830; R2: M₀ 0.800, k 0.645; R3: M₀ 0.801, k 0.659 |
| Ak-P3 | Regla de áreas por un factor k, con P3 | R1: k 0.672, O-1 0.627; R2: k 0.500, O-1 0.547; R3: k 0.500, O-1 1.000 |
| C-P1 | Teoría lineal por piezas (ala sola más fuselaje solo) con P1 | R1: M₀ 0.872; R2: M₀ 0.864; R3: M₀ 0.861 |
| C-P2 | Teoría lineal por piezas con P2 | R1: p 8.00, O-1 0.627; R2: p 8.00, O-1 0.547; R3: p 8.00, O-1 1.000 |
| C-P3 | Teoría lineal por piezas con P3 | R1: O-1 0.627; R2: O-1 0.547; R3: O-1 1.000 |
| B1 | Sears-Haack por E_WD = 1 con la forma de AeroSandbox | ninguno |
| B2 | Sears-Haack por E_WD ajustado con la forma de AeroSandbox | R1: E_WD 1.074; R2: E_WD 1.025; R3: E_WD 1.037 |
| D1 | Semejanza transónica: media de las curvas propias de las dos alas de entrenamiento | ninguno |
| D2 | Semejanza transónica: logística ajustada (anchura fijada) | R1: L 4.753, ξc 0.789; R2: L 5.231, ξc 0.445; R3: L 4.593, ξc -0.081 |
| E | Línea base: el modelo actual, korn-mason-lock | ninguno |
| E0 | Línea base: baseline-incompressible, sin subida | ninguno |

Parámetros que acaban en el borde de su rango:

- A2-P2, R1: p = 8.000, rango [1, 8]
- A2-P2, R2: p = 8.000, rango [1, 8]
- A2-P2, R3: rel:O-1 = 1.000, rango [0, 1]
- A2-P2, R3: p = 8.000, rango [1, 8]
- A2-P3, R3: rel:O-1 = 1.000, rango [0, 1]
- Ak-P1, R2: M0 = 0.800, rango [0.8, 0.99]
- Ak-P3, R2: k = 0.500, rango [0.5, 1.5]
- Ak-P3, R3: rel:O-1 = 1.000, rango [0, 1]
- Ak-P3, R3: k = 0.500, rango [0.5, 1.5]
- C-P2, R1: p = 8.000, rango [1, 8]
- C-P2, R2: p = 8.000, rango [1, 8]
- C-P2, R3: rel:O-1 = 1.000, rango [0, 1]
- C-P2, R3: p = 8.000, rango [1, 8]
- C-P3, R3: rel:O-1 = 1.000, rango [0, 1]

**Juicio.** Un parámetro en el borde dice que la forma de esa curva no encaja con los datos aunque se le dé libertad, no que el rango sea corto.

### Predicciones por ala

| Ala fuera | Mach | Tramo | D (figura 9) | u_D | B1: S | B2: S | Ak-P1: S | E: S | B1: E | B2: E | Ak-P1: E | E: E |
| --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10.8° | 0.925 | T2 | 0.0132 | 0.0010 | 0.0136 [0.0117, 0.0155] | 0.0138 [0.0119, 0.0157] | 0.0123 [0.0104, 0.0141]* | NA | 0.0004 | 0.0006 | -0.0009 | NA |
| 10.8° | 0.950 | T2 | 0.0167 | 0.0010 | 0.0151 [0.0131, 0.0171] | 0.0154 [0.0134, 0.0174] | 0.0152 [0.0133, 0.0171]* | NA | -0.0016 | -0.0012 | -0.0014 | NA |
| 10.8° | 0.975 | T2 | 0.0209 | 0.0010 | 0.0168 [0.0148, 0.0189] | 0.0173 [0.0152, 0.0194] | 0.0215 [0.0193, 0.0237]* | NA | -0.0040 | -0.0036 | 0.0006 | NA |
| 10.8° | 1.000 | T2 | 0.0230 | 0.0010 | 0.0186 [0.0162, 0.0210] | 0.0192 [0.0167, 0.0216] | 0.0327 [0.0297, 0.0356]* | NA | -0.0045 | -0.0038 | 0.0097 | NA |
| 10.8° | 1.020 | T2 | 0.0234 | 0.0010 | 0.0204 [0.0179, 0.0229] | 0.0211 [0.0186, 0.0236] | 0.0276 [0.0250, 0.0302] | NA | -0.0031 | -0.0023 | 0.0042 | NA |
| 10.8° | 1.035 | T2 | 0.0235 | 0.0010 | 0.0218 [0.0192, 0.0244] | 0.0226 [0.0200, 0.0253] | 0.0270 [0.0236, 0.0304]* | NA | -0.0017 | -0.0009 | 0.0035 | NA |
| 10.8° | 1.085 | T3 | 0.0231 | 0.0010 | 0.0257 [0.0229, 0.0284] | 0.0268 [0.0240, 0.0296] | 0.0328 [0.0210, 0.0447]* | NA | 0.0026 | 0.0037 | 0.0097 | NA |
| 10.8° | 1.100 | T3 | 0.0228 | 0.0010 | 0.0261 [0.0233, 0.0289] | 0.0273 [0.0244, 0.0301] | 0.0304 [0.0203, 0.0406]* | NA | 0.0033 | 0.0045 | 0.0076 | NA |
| 10.8° | 1.114 | T3 | 0.0224 | 0.0010 | 0.0262 [0.0234, 0.0289] | 0.0274 [0.0245, 0.0302] | 0.0287 [0.0197, 0.0377]* | NA | 0.0038 | 0.0050 | 0.0063 | NA |
| 35° | 0.925 | T2 | 0.0116 | 0.0010 | 0.0105 [0.0088, 0.0122] | 0.0105 [0.0088, 0.0122] | 0.0119 [0.0102, 0.0137] | 0.0126 [0.0110, 0.0143] | -0.0011 | -0.0011 | 0.0003 | 0.0010 |
| 35° | 0.950 | T2 | 0.0128 | 0.0010 | 0.0111 [0.0094, 0.0128] | 0.0111 [0.0094, 0.0128] | 0.0135 [0.0116, 0.0153] | 0.0156 [0.0139, 0.0172] | -0.0017 | -0.0016 | 0.0007 | 0.0028 |
| 35° | 0.975 | T2 | 0.0164 | 0.0010 | 0.0128 [0.0110, 0.0146] | 0.0128 [0.0110, 0.0146] | 0.0161 [0.0141, 0.0181] | 0.0207 [0.0190, 0.0223] | -0.0036 | -0.0035 | -0.0003 | 0.0043 |
| 35° | 1.000 | T2 | 0.0190 | 0.0010 | 0.0149 [0.0127, 0.0170] | 0.0150 [0.0128, 0.0172] | 0.0199 [0.0174, 0.0223] | NA | -0.0041 | -0.0040 | 0.0009 | NA |
| 35° | 1.020 | T2 | 0.0196 | 0.0010 | 0.0169 [0.0146, 0.0191] | 0.0170 [0.0147, 0.0193] | 0.0181 [0.0156, 0.0207] | NA | -0.0028 | -0.0026 | -0.0015 | NA |
| 35° | 1.035 | T2 | 0.0198 | 0.0010 | 0.0183 [0.0159, 0.0207] | 0.0185 [0.0161, 0.0209] | 0.0176 [0.0152, 0.0200] | NA | -0.0016 | -0.0014 | -0.0023 | NA |
| 35° | 1.100 | T3 | 0.0193 | 0.0010 | 0.0216 [0.0190, 0.0241] | 0.0219 [0.0192, 0.0245] | 0.0167 [0.0145, 0.0189]* | NA | 0.0022 | 0.0025 | -0.0026 | NA |
| 35° | 1.130 | T3 | 0.0185 | 0.0010 | 0.0215 [0.0189, 0.0240] | 0.0218 [0.0192, 0.0243] | 0.0164 [0.0142, 0.0186]* | NA | 0.0030 | 0.0033 | -0.0021 | NA |
| 47° | 0.916 | T2 | 0.0097 | 0.0010 | 0.0101 [0.0085, 0.0116] | 0.0101 [0.0085, 0.0116] | 0.0105 [0.0090, 0.0121]* | 0.0100 [0.0085, 0.0115] | 0.0004 | 0.0004 | 0.0009 | 0.0004 |
| 47° | 0.941 | T2 | 0.0100 | 0.0010 | 0.0100 [0.0085, 0.0116] | 0.0100 [0.0085, 0.0116] | 0.0110 [0.0095, 0.0126]* | 0.0100 [0.0085, 0.0115] | 0.0000 | 0.0000 | 0.0010 | 0.0000 |
| 47° | 0.965 | T2 | 0.0113 | 0.0010 | 0.0100 [0.0085, 0.0115] | 0.0100 [0.0085, 0.0115] | 0.0119 [0.0103, 0.0135]* | 0.0100 [0.0085, 0.0115] | -0.0013 | -0.0013 | 0.0006 | -0.0013 |
| 47° | 0.990 | T2 | 0.0137 | 0.0010 | 0.0100 [0.0084, 0.0115] | 0.0100 [0.0084, 0.0115] | 0.0133 [0.0117, 0.0149]* | 0.0100 [0.0085, 0.0115] | -0.0037 | -0.0037 | -0.0003 | -0.0037 |
| 47° | 1.010 | T2 | 0.0155 | 0.0010 | 0.0104 [0.0087, 0.0121] | 0.0104 [0.0087, 0.0122] | 0.0138 [0.0120, 0.0156] | 0.0099 [0.0084, 0.0114] | -0.0050 | -0.0050 | -0.0016 | -0.0055 |
| 47° | 1.024 | T2 | 0.0164 | 0.0010 | 0.0127 [0.0109, 0.0145] | 0.0128 [0.0110, 0.0146] | 0.0138 [0.0120, 0.0156] | 0.0100 [0.0085, 0.0115] | -0.0038 | -0.0037 | -0.0026 | -0.0065 |
| 47° | 1.112 | T3 | 0.0172 | 0.0010 | 0.0181 [0.0161, 0.0201] | 0.0184 [0.0164, 0.0204] | 0.0142 [0.0121, 0.0163]* | 0.0148 [0.0132, 0.0163] | 0.0009 | 0.0012 | -0.0030 | -0.0025 |

S es el centro del intervalo predicho y, entre corchetes, el intervalo. * marca "no converge". E = S − D.

### Figuras

![Ala de 10.8°](../../studies/001-wave-drag/out/fig-wing-10.8.svg)

![Ala de 35°](../../studies/001-wave-drag/out/fig-wing-35.svg)

![Ala de 47°](../../studies/001-wave-drag/out/fig-wing-47.svg)

### Pregunta 1: el inicio de la subida

### Relaciones de inicio aisladas

| Relación | R1 (10.8° fuera) | R2 (35° fuera) | R3 (47° fuera) | Media cuadrática | Mayor |E| |
| --- | --- | --- | --- | ---: | ---: |
| O-E | 0.836 frente a 0.921 (parámetro 0.000) | 0.933 frente a 0.951 (parámetro 0.000) | 1.096 frente a 0.970 (parámetro 0.000) | 0.088 | 0.126 |
| O-1 (elegida para P2 y P3) | 0.836 frente a 0.921 (parámetro 0.627) | 0.888 frente a 0.951 (parámetro 0.547) | 1.096 frente a 0.970 (parámetro 1.000) | 0.095 | 0.126 |
| O-2 | 0.790 frente a 0.921 (parámetro 0.824) | 0.899 frente a 0.951 (parámetro 0.840) | 1.158 frente a 0.970 (parámetro 0.916) | 0.136 | 0.188 |

### Inicio implícito de cada curva completa

| Curva | R1: predicho [intervalo] | R2 | R3 | Dato (regla c) | Mayor |E| |
| --- | --- | --- | --- | --- | ---: |
| A2-P1 | 0.935 [0.935, 0.936] | 0.947 [0.945, 0.949] | 0.976 [0.974, 0.977] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.014 |
| A2-P2 | 0.908 [0.906, 0.910] | 0.942 [0.937, 0.946] | 1.000 [1.000, 1.000] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.030 |
| A2-P3 | 0.836 [0.836, 0.836] | 0.888 [0.888, 0.888] | 0.999 [0.999, 0.999] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.085 |
| Ak-P1 | 0.934 [0.933, 0.935] | 0.961 [0.957, 0.965] | NA (NA: la curva nominal no llega a 0.1) | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |
| Ak-P3 | 0.836 [0.836, 0.836] | NA (NA: la curva nominal no llega a 0.1) | 0.999 [0.999, 0.999] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |
| C-P1 | 0.936 [0.935, 0.937] | 0.947 [0.945, 0.949] | 0.975 [0.973, 0.976] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.014 |
| C-P2 | 0.908 [0.906, 0.910] | 0.941 [0.937, 0.945] | 1.000 [1.000, 1.000] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.030 |
| C-P3 | 0.836 [0.836, 0.836] | 0.888 [0.888, 0.888] | 0.999 [0.999, 0.999] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.085 |
| B1 | NA (NA: la curva nominal no llega a 0.1) | NA (NA: la curva nominal no llega a 0.1) | 1.008 [1.008, 1.009] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |
| B2 | 1.022 [1.006, 1.039] | NA (NA: la curva nominal no llega a 0.1) | 1.008 [1.008, 1.009] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |
| D1 | 0.965 [0.965, 0.965] | 0.950 [0.950, 0.950] | 0.950 [0.950, 0.950] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.044 |
| D2 | NA (NA: la curva nominal no llega a 0.1) | NA (NA: la curva nominal no llega a 0.1) | NA (NA: la curva nominal no llega a 0.1) | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |
| E | 0.836 [0.836, 0.836] | 0.932 [0.932, 0.933] | 1.096 [1.095, 1.096] | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | 0.126 |
| E0 | NA (sin subida) | NA (sin subida) | NA (sin subida) | 10.8°: 0.921 (muestras); 35°: 0.951 (muestras); 47°: 0.970 (texto del informe) | NA |

**Juicio.** Ninguna relación de inicio de un parámetro mejora a la del modelo actual con el ala fuera: la flecha efectiva (O-1) no puede mover el ala de 10.8°, cuya flecha en la mitad de la cuerda es casi nula, y la kA libre (O-2) empeora. El mejor inicio lo da la curva completa A2 o C con el puente P1.

### Pregunta 2: el nivel entre Mach 1.0 y 1.13

Ver la columna T3 de la tabla principal y las figuras. La regla de áreas sobrestima mucho el ala de 10.8°: su criterio de cuerpo esbelto falla (tabla de validez, abajo), y su borde de ataque es supersónico en T3.

### Pregunta 3: el puente

Mayor error del inicio con el ala fuera, en Mach: A2-P1 0.014, A2-P2 0.030, A2-P3 0.085; con C: 0.014, 0.030 y 0.085. P2 y P3 toman M₀ de la relación de inicio y heredan su error.

### La anchura de los intervalos donde el borde de ataque es supersónico

En los datos abiertos, el ala de 10.8° en T3 (Mach normal al borde de ataque en la tabla y en `out/edges.md`). Descomposición del intervalo: la banda de base con los parámetros, el cambio hacia fuera de cada entrada incierta y si el barrido converge.

| Curva | Mach | Mn borde de ataque | Banda de base y parámetros | I1 | I2 | I3 | I5 | I7 | I8 | I9 | Converge | Intervalo final | Anchura |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | ---: |
| B1 | 1.085 | 1.014 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0016 | sí | [0.0229, 0.0284] | 0.0055 |
| B1 | 1.100 | 1.028 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0017 | sí | [0.0233, 0.0289] | 0.0055 |
| B1 | 1.114 | 1.041 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0017 | sí | [0.0234, 0.0289] | 0.0055 |
| B2 | 1.085 | 1.014 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0017 | sí | [0.0240, 0.0296] | 0.0056 |
| B2 | 1.100 | 1.028 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0018 | sí | [0.0244, 0.0301] | 0.0057 |
| B2 | 1.114 | 1.041 | 0.0038 | — | — | — | 0.0002 | — | — | 0.0018 | sí | [0.0245, 0.0302] | 0.0057 |
| Ak-P1 | 1.085 | 1.014 | 0.0038 | 0.0083 | 0.0084 | 0.0036 | 0.0002 | 0.0092 | 0.0080 | — | no | [0.0210, 0.0447] | 0.0237 |
| Ak-P1 | 1.100 | 1.028 | 0.0038 | 0.0065 | 0.0067 | 0.0033 | 0.0002 | 0.0073 | 0.0064 | — | no | [0.0203, 0.0406] | 0.0203 |
| Ak-P1 | 1.114 | 1.041 | 0.0038 | 0.0055 | 0.0056 | 0.0028 | 0.0002 | 0.0062 | 0.0053 | — | no | [0.0197, 0.0377] | 0.0180 |
| A2-P1 | 1.085 | 1.014 | 0.0038 | 0.0100 | 0.0102 | 0.0044 | 0.0002 | 0.0111 | 0.0097 | — | no | [0.0236, 0.0514] | 0.0278 |
| A2-P1 | 1.100 | 1.028 | 0.0038 | 0.0079 | 0.0081 | 0.0040 | 0.0002 | 0.0089 | 0.0078 | — | no | [0.0228, 0.0464] | 0.0237 |
| A2-P1 | 1.114 | 1.041 | 0.0038 | 0.0066 | 0.0068 | 0.0034 | 0.0002 | 0.0075 | 0.0064 | — | no | [0.0220, 0.0430] | 0.0209 |
| C-P1 | 1.085 | 1.014 | 0.0038 | 0.0100 | 0.0102 | 0.0044 | 0.0002 | 0.0111 | 0.0097 | — | no | [0.0237, 0.0516] | 0.0279 |
| C-P1 | 1.100 | 1.028 | 0.0038 | 0.0079 | 0.0081 | 0.0040 | 0.0002 | 0.0088 | 0.0078 | — | no | [0.0229, 0.0466] | 0.0237 |
| C-P1 | 1.114 | 1.041 | 0.0038 | 0.0066 | 0.0068 | 0.0034 | 0.0002 | 0.0075 | 0.0064 | — | no | [0.0222, 0.0431] | 0.0209 |
| D2 | 1.085 | 1.014 | 0.0038 | — | — | — | 0.0002 | — | — | — | sí | [0.0168, 0.0208] | 0.0041 |
| D2 | 1.100 | 1.028 | 0.0038 | — | — | — | 0.0002 | — | — | — | sí | [0.0174, 0.0214] | 0.0040 |
| D2 | 1.114 | 1.041 | 0.0038 | — | — | — | 0.0002 | — | — | — | sí | [0.0180, 0.0220] | 0.0040 |

**Lectura (juicio).** Donde la regla de áreas no converge, el prerregistro hace entrar la falta de convergencia dos veces: cada variante geométrica que no converge cuenta con todo su barrido (I1, I2, I7 e I8), y además el intervalo se extiende al barrido completo. Por eso el desplazamiento del ala de la entrada I1, una fracción de centésima de pulgada, aparece con un cambio del orden del suavizado. La regla se aplicó tal como está; es una pregunta para el PM antes de la fase B (sección 10). B y D no tienen este problema porque no tienen integral que converger. Con intervalos así, más anchos que el umbral de 0.003, la regla de A.7 impide que A o C salgan `acierta` en T3 aunque su centro acertara: es lo que el plan anunciaba en sus riesgos.

A Mach 1.60 (T4, sin datos abiertos) la verificación ya da el barrido del término de onda de A2 en las alas con borde de ataque supersónico y sónico (tabla de la nariz, columnas N = 32 a 128): es la parte del intervalo que vendrá de la convergencia.

### Pregunta 4: el fuselaje aislado

Modelo: rozamiento del fuselaje (banda turbulento y mixto, `model`) más su propia resistencia de onda A1 o A2 (`computed`, sin parámetros). Se juzga el nivel desde Mach 1.0.

| Mach | α, grados | D (medido) | u_D | Rozamiento (banda) | Onda A1/A2 del fuselaje | Modelo (banda) | E (centro) |
| ---: | ---: | ---: | ---: | --- | ---: | --- | ---: |
| 0.500 | 0.1 | 0.0019 | 0.0010 | 0.0031 a 0.0033 | — | 0.0031 a 0.0033 | NA |
| 0.700 | 0.1 | 0.0031 | 0.0010 | 0.0030 a 0.0032 | — | 0.0030 a 0.0032 | NA |
| 0.850 | 0.1 | 0.0031 | 0.0010 | 0.0029 a 0.0031 | — | 0.0029 a 0.0031 | NA |
| 0.900 | 0.2 | 0.0031 | 0.0010 | 0.0029 a 0.0031 | — | 0.0029 a 0.0031 | NA |
| 0.925 | 0.1 | 0.0032 | 0.0010 | 0.0028 a 0.0031 | — | 0.0028 a 0.0031 | NA |
| 0.950 | 0.1 | 0.0034 | 0.0010 | 0.0028 a 0.0031 | — | 0.0028 a 0.0031 | NA |
| 0.975 | 0.1 | 0.0037 | 0.0010 | 0.0028 a 0.0030 | — | 0.0028 a 0.0030 | NA |
| 1.000 | 0.0 | 0.0044 | 0.0010 | 0.0028 a 0.0030 | 0.0033 | 0.0061 a 0.0063 | 0.0018 |
| 1.020 | 0.2 | 0.0049 | 0.0010 | 0.0028 a 0.0030 | 0.0033 | 0.0060 a 0.0063 | 0.0013 |
| 1.035 | 0.0 | 0.0055 | 0.0010 | 0.0028 a 0.0030 | 0.0033 | 0.0060 a 0.0063 | 0.0007 |
| 1.085 | 0.0 | 0.0062 | 0.0010 | 0.0027 a 0.0030 | 0.0032 | 0.0060 a 0.0062 | -0.0001 |
| 1.100 | 0.1 | 0.0064 | 0.0010 | 0.0027 a 0.0030 | 0.0032 | 0.0059 a 0.0062 | -0.0003 |
| 1.130 | 0.0 | 0.0061 | 0.0010 | 0.0027 a 0.0029 | 0.0032 | 0.0059 a 0.0061 | -0.0000 |

### Comprobación con los valores (b) de las polares

| Ala | Mach | Valor (b), computed | u_D | Figura 9 en ese Mach | B1 | B2 | Ak-P1 | E |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10.8° | 0.500 | 0.0102 | 0.0010 | 0.0101 | 0.0106 | 0.0106 | 0.0106 | 0.0106 |
| 10.8° | 0.850 | 0.0105 | 0.0010 | 0.0104 | 0.0109 | 0.0110 | 0.0108 | 0.0153 |
| 10.8° | 1.000 | 0.0234 | 0.0010 | 0.0230 | 0.0181 | 0.0187 | 0.0325 | NA |
| 10.8° | 1.100 | 0.0228 | 0.0010 | 0.0228 | 0.0253 | 0.0264 | 0.0247 | NA |
| 35° | 0.500 | 0.0091 | 0.0010 | 0.0096 | 0.0104 | 0.0104 | 0.0104 | 0.0104 |
| 35° | 0.850 | 0.0103 | 0.0010 | 0.0104 | 0.0104 | 0.0104 | 0.0105 | 0.0104 |
| 35° | 0.900 | 0.0107 | 0.0011 | 0.0110 | 0.0105 | 0.0105 | 0.0110 | 0.0112 |
| 35° | 1.000 | 0.0184 | 0.0010 | 0.0190 | 0.0145 | 0.0146 | 0.0193 | NA |
| 35° | 1.100 | 0.0190 | 0.0010 | 0.0193 | 0.0207 | 0.0210 | 0.0165 | NA |
| 47° | 0.500 | 0.0079 | 0.0010 | 0.0085 | 0.0101 | 0.0101 | 0.0101 | 0.0101 |
| 47° | 0.843 | 0.0095 | 0.0010 | 0.0093 | 0.0100 | 0.0100 | 0.0101 | 0.0100 |
| 47° | 0.990 | 0.0128 | 0.0010 | 0.0137 | 0.0099 | 0.0099 | 0.0132 | 0.0100 |
| 47° | 1.112 | 0.0169 | 0.0010 | 0.0172 | 0.0183 | 0.0187 | 0.0140 | 0.0148 |

### Validez de las teorías

| Ala | Mach | β s/c_r | ξ₀ | Ã | A τ^(1/3) | Mn borde de ataque | Mn borde de salida |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 10.8deg-t04 | 0.925 | 0.40 | -0.69 | 1.60 | 1.20 | 0.864 | 0.864 |
| 10.8deg-t04 | 0.950 | 0.33 | -0.47 | 1.60 | 1.20 | 0.888 | 0.888 |
| 10.8deg-t04 | 0.975 | 0.23 | -0.24 | 1.60 | 1.20 | 0.911 | 0.911 |
| 10.8deg-t04 | 1.000 | 0.00 | 0.00 | 1.60 | 1.20 | 0.934 | 0.935 |
| 10.8deg-t04 | 1.020 | 0.21 | 0.19 | 1.60 | 1.20 | 0.953 | 0.953 |
| 10.8deg-t04 | 1.035 | 0.28 | 0.34 | 1.60 | 1.20 | 0.967 | 0.967 |
| 10.8deg-t04 | 1.085 | 0.44 | 0.85 | 1.60 | 1.20 | 1.014 | 1.014 |
| 10.8deg-t04 | 1.100 | 0.48 | 1.00 | 1.60 | 1.20 | 1.028 | 1.028 |
| 10.8deg-t04 | 1.114 | 0.52 | 1.15 | 1.60 | 1.20 | 1.041 | 1.041 |
| 35deg-t04 | 0.925 | 0.40 | -0.69 | 1.60 | 1.20 | 0.691 | 0.917 |
| 35deg-t04 | 0.950 | 0.33 | -0.47 | 1.60 | 1.20 | 0.709 | 0.942 |
| 35deg-t04 | 0.975 | 0.23 | -0.24 | 1.60 | 1.20 | 0.728 | 0.967 |
| 35deg-t04 | 1.000 | 0.00 | 0.00 | 1.60 | 1.20 | 0.747 | 0.992 |
| 35deg-t04 | 1.020 | 0.21 | 0.19 | 1.60 | 1.20 | 0.762 | 1.012 |
| 35deg-t04 | 1.035 | 0.28 | 0.34 | 1.60 | 1.20 | 0.773 | 1.027 |
| 35deg-t04 | 1.100 | 0.48 | 1.00 | 1.60 | 1.20 | 0.821 | 1.091 |
| 35deg-t04 | 1.130 | 0.55 | 1.32 | 1.60 | 1.20 | 0.844 | 1.121 |
| 47deg-t04 | 0.916 | 0.42 | -0.77 | 1.60 | 1.20 | 0.569 | 0.819 |
| 47deg-t04 | 0.941 | 0.36 | -0.55 | 1.60 | 1.20 | 0.584 | 0.841 |
| 47deg-t04 | 0.965 | 0.28 | -0.33 | 1.60 | 1.20 | 0.599 | 0.863 |
| 47deg-t04 | 0.990 | 0.15 | -0.09 | 1.60 | 1.20 | 0.615 | 0.885 |
| 47deg-t04 | 1.010 | 0.15 | 0.10 | 1.60 | 1.20 | 0.627 | 0.903 |
| 47deg-t04 | 1.024 | 0.23 | 0.23 | 1.60 | 1.20 | 0.636 | 0.916 |
| 47deg-t04 | 1.112 | 0.51 | 1.13 | 1.60 | 1.20 | 0.690 | 0.994 |

β s/c_r es el criterio de cuerpo esbelto (pequeño es bueno); A τ^(1/3) < 1 es el de McDevitt para la teoría de cuerpo esbelto a Mach 1 (Report 1253, resumen); ξ₀ y Ã son los parámetros de Spreiter; Mn es el Mach normal a cada borde (sónico en 1).

## 6. Sensibilidad (paso 5)

Para las curvas que encabezan la tabla, el mayor cambio hacia fuera de cada límite por entrada incierta, en las condiciones T2 y T3:

| Curva | Entrada | Mayor cambio hacia abajo | Mayor cambio hacia arriba | Condición del mayor cambio |
| --- | --- | ---: | ---: | --- |
| B1 | I5 | 0.00001 | 0.00021 | 10.8° a Mach 0.925 |
| B1 | I9 | 0.00069 | 0.00169 | 10.8° a Mach 1.114 |
| B2 | I5 | 0.00001 | 0.00021 | 10.8° a Mach 0.925 |
| B2 | I9 | 0.00072 | 0.00181 | 10.8° a Mach 1.114 |
| Ak-P1 | I1 | 0.00000 | 0.00826 | 10.8° a Mach 1.085 |
| Ak-P1 | I2 | 0.00000 | 0.00844 | 10.8° a Mach 1.085 |
| Ak-P1 | I3 | 0.00256 | 0.00361 | 10.8° a Mach 1.085 |
| Ak-P1 | I5 | 0.00001 | 0.00021 | 10.8° a Mach 0.925 |
| Ak-P1 | I7 | 0.00000 | 0.00920 | 10.8° a Mach 1.085 |
| Ak-P1 | I8 | 0.00002 | 0.00804 | 10.8° a Mach 1.085 |

## 7. Coste (pregunta 5)

- A y C: 1783.6 ms por curva (11 repeticiones en el tiempo máximo de 20 s). No es interactivo: casi todo es el cálculo de las áreas oblicuas y la serie en cada Mach por encima de 1.
- B: 135.1 ms, casi todo el área máxima de la geometría.
- E: 2.1 ms.
- **Qué lo haría interactivo (juicio).** El término de onda solo depende de la geometría y del Mach. Al soltar un control se calcula la tabla de A2 en los Mach por encima de 1 (el coste de arriba); mientras se arrastra, la curva se interpola en esa tabla, en microsegundos. Para B basta precalcular el área máxima, que no depende del Mach.

## 8. Explicación (pregunta 6)

![Áreas del ala de 35°](../../studies/001-wave-drag/out/fig-area-35.svg)

La resistencia de onda cerca de Mach 1 depende de cómo cambia el área de la sección normal a lo largo del avión. El conjunto ala-fuselaje (azul) tiene un salto de área donde empieza el ala; el cuerpo de Sears-Haack de la misma longitud y el mismo volumen (verde) es el que menos resistencia tiene. La diferencia entre las dos curvas es lo que la regla de áreas convierte en resistencia.

![Descomposición](../../studies/001-wave-drag/out/fig-decomposition-35.svg)

## 9. Recomendación

**Regla A.9:** B1, construir con reservas (mayor error del inicio NA > 0.03).

**Juicio de la sesión constructora.** Para la lección, el método con más fundamento físico es la regla de áreas con el puente P1: predice el inicio y se explica con una imagen. Pero falla el nivel del ala de 10.8° y no converge con borde supersónico, y la regla del prerregistro no lo elige. Si el dueño elige B1, la predicción a ciegas probará si el nivel de Sears-Haack con E_WD = 1 vale para otros espesores (6 y 9 %) y a Mach 1.60, donde no hay ningún dato abierto; su inicio ya sabemos que falla.

## 10. Preguntas para el PM y el dueño

1. **Doble cuenta de la falta de convergencia** en el intervalo (sección 5): ¿se mantiene la regla de A.9 para la fase B, o se enmienda para que una variante que no converge cuente con su valor en N₀? Si se enmienda, es `post hoc` y se informa con las dos reglas.
2. **Inicio de B:** la forma de AeroSandbox no llega a pendiente 0.1 en dos alas. Para la fase B, ¿la recomendación lleva el inicio de otra relación (por ejemplo O-E, sin parámetros) o se deja `NA`?
3. **El nivel de la regla de áreas en el ala de 10.8°.** ¿Vale la pena un candidato nuevo (A.9 permite añadirlos marcados "después de la compuerta 1") que use la regla de áreas solo donde el criterio de cuerpo esbelto se cumple?

## 11. Límites y fórmulas sin verificar

- Sin verificar en fuente impresa: la forma cerrada del cuerpo de arco parabólico (deducida), la fórmula de Ackeret (solo como límite de la ec. A5 de Jones), el factor de forma 1 en supersónico, la forma de B tal como la escribe AeroSandbox frente a Raymer, y la afirmación sobre la nariz (comprobada solo en lo numérico).
- La resistencia de base del borde de salida romo no se modela. La resistencia de onda por curvatura a sustentación nula tampoco.
- D no ve la flecha: sus parámetros no la tienen (Spreiter no trata alas en flecha).
- Tres alas son pocas: con dos parámetros cualquier curva pasa cerca de dos alas; por eso solo cuenta el ala que queda fuera.

## 12. Medido, calculado y juicio

- **Medido o NACA faired:** solo las columnas D, u_D y los valores de las polares y del fuselaje.
- **Calculado:** todo lo demás de las tablas y figuras, regenerable con `corepack pnpm exec tsx studies/001-wave-drag/run.ts`.
- **Juicio:** los párrafos marcados así, la sección 9 y las preguntas de la sección 10.

## 13. La apuesta

Si B1 se elige y la prueba a ciegas sale bien en los espesores del 6 y 9 % y a Mach 1.60, el proyecto tendrá un nivel de resistencia de onda sin parámetros que se explica con una sola figura. Si sale mal, sabremos que la coincidencia con las alas abiertas era de esta familia y no del método, antes de haber construido nada encima.
