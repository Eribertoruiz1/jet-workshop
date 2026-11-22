# Registro de congelación

Generado por `studies/001-wave-drag/run.ts` desde `src/freeze.ts`, `src/model.ts` y la verificación numérica, antes de leer ningún dato de resistencia (PREREGISTRATION.md, A.6). El commit que lo contiene no tiene código que abra `bielat-l52b08.csv` ni `bielat-l51i04a-body.csv`.

## Lo que pide A.6

- **Suavizado:** N₀ = 32 términos de la serie de Fourier del cuerpo equivalente. **Ángulos:** m₀ = 8 nodos de Gauss-Legendre por tramo de θ. Los elige la regla del plan (sección 6) sobre los casos de solución conocida: `out/verification.md`. `run.ts` comprueba en cada ejecución que la verificación sigue eligiendo estos valores.
- **E_WD de B1:** 1. Ninguna fuente abierta consultada da un valor (AeroSandbox no lo tiene; los valores típicos de la nota del PM no se confirmaron). Regla del prerregistro, A.9: 1 cuando no hay guía.
- **Anchura de la logística de D2:** 1, en el parámetro de semejanza ξ₀ = (M² − 1)/[(γ + 1)τ]^(2/3) de Spreiter (NACA TN 2726, ec. 30), con γ = 1.4. Ni TN 2726 ni McDevitt (NACA Report 1253) dan una forma analítica ni una anchura de la subida (el Report 1253 solo trae curvas trazadas, su figura 8). Regla del plan, sección 5: si la fuente no la da, 1.
- **Tabla de bordes:** `out/edges.md`, regenerada sin cambios respecto a la compuerta 1.
- **Resultados de la verificación numérica:** `out/verification.md` y `out/verification.json`.

## Otras elecciones numéricas fijadas aquí

- Regla en θ: Gauss-Legendre compuesta en [0, π/2], partida en los ángulos singulares de las líneas de estación, con subdivisión geométrica hacia las líneas fuertes (razón 0.25, tramo menor 0.001 rad; cortes también en las crestas débiles: sí).
- Cuadratura en φ: punto medio con 8 N_max puntos (512 como mínimo).
- Pendiente de W por encima de Mach 1 para el puente P3: diferencia hacia delante con paso 0.01.
- Niveles de cálculo en cada condición: N en 16, 32, 64 y 128; m en 8, 16 y 32. Nominal: (N₀, m₀). Entrada I3: N₀/2 y 2N₀ con m₀. Barrido de convergencia: N₀, 2N₀ y 4N₀ con 4m₀, y m₀, 2m₀ y 4m₀ con 4N₀.

## Rangos de los parámetros libres

- M₀ de P1: [0.8, 0.99]. p de P2: [1, 8]. k de Ak: [0.5, 1.5]. E_WD de B2: [1, 4]. Exponente n de O-1: [0, 1]. kA de O-2: [0.8, 1]. Los cinco vienen de PLAN.md.
- D2, añadidos aquí porque el plan no los fijaba: nivel L de la logística en [0, 20] (en el coeficiente reducido de Spreiter) y centro ξc en [-3, 3].

## Interpretaciones de la regla escritas antes de ver datos

1. **Ala de C.** C es el ala expuesta sola más el fuselaje solo, y las tres resistencias (A2, ala y fuselaje) se calculan en el mismo intervalo del cuerpo equivalente. Así A2 − C es exactamente el término de interferencia con el mismo suavizado.
2. **Inicio de las relaciones O-E, O-1 y O-2.** Es el primer Mach en que el centro de la base más la subida de Lock del modelo actual (sobre las franjas expuestas, con el Mcrit de la relación) llega a pendiente 0.1. Con O-E es el inicio del modelo actual.
3. **M₀ de P2 y P3.** Es el mayor M₀ por debajo del inicio de la relación que da pendiente 0.1 en ese inicio, con el centro de la base. La relación que se usa es la de menor media cuadrática del error con el ala fuera entre O-1 y O-2 (después, el menor error máximo).
4. **D.** El espesor de la raíz engrosada para D es la media del espesor máximo ponderada con la cuerda sobre el ala expuesta. D1 no extrapola: fuera del rango de ξ₀ de las alas de entrenamiento da `NA`. La subida de D es el dato menos el centro de la base.
5. **Ensanche del intervalo.** Para cada entrada, el mayor cambio hacia fuera de cada límite entre sus extremos; los cambios hacia dentro no estrechan. Las líneas base E y E0 no se ensanchan (A.8).
6. **Meseta del inicio de la subida.** La regla de A.7 se aplica con el 1 % del valor, porque el suelo de 0.00005 es de CD.
7. **Cambios por debajo de 1e-6** (en CD, la quincuagésima parte del suelo de 0.00005; en Mach para el inicio) cuentan como cero en la regla de meseta, para que el ruido de la cuadratura no decida.
8. **Coste.** Mediana de 200 repeticiones o de las que quepan en 20 s, lo que llegue antes; el estudio dice cuántas fueron.
9. **Fórmula de Ackeret.** El plan esperaba que el error del ala rectangular cayera como 1/(βA). La verificación muestra que no depende de A: se informa en `out/verification.md` y en el estudio.

Verificación: N₀ 32, m₀ 8, autocomprobación 6.1e-14.
