# Verificación numérica de la integral de resistencia de onda

Generado por `studies/001-wave-drag/run.ts`. No editar a mano. Ningún dato de resistencia: solo casos de solución conocida y la geometría de las alas. Todos los valores son `computed`.

## Niveles fijados

- **N₀ = 32** términos de la serie de Fourier (el suavizado). Es el menor de 8, 16, 32, 64 que reproduce los casos 1, 2, 4 y 5 dentro del 1.00 % con 16 nodos por tramo en θ, y con el que el caso 3 converge en N₀, 2N₀ y 4N₀ con la regla de meseta del prerregistro (A.7).
- **m₀ = 8** nodos de Gauss-Legendre por tramo en θ. Es el menor de 2, 4, 8, 16 que hace lo mismo con N₀.
- Regla en θ: Gauss-Legendre compuesta en [0, π/2], partida en los ángulos singulares β cos θ* = |tan Λ| de cada línea de estación tabulada, con subdivisión geométrica (razón 0.25, tramo menor 0.001 rad) hacia las líneas fuertes: borde de ataque, estación del 0.5 % y borde de salida.
- Cuadratura en φ: regla del punto medio con 8 N_max puntos (como mínimo 512). No es un suavizado.
- Barrido de convergencia de cada condición: N en 32, 64 y 128 con 32 nodos por tramo; nodos en 8, 16 y 32 con N = 128.

## Casos de solución conocida

Error relativo, calculado menos exacto, dividido por el exacto.

- Caso 1: cuerpo de Sears-Haack, D/q = (9π/2)(A_max/l)² (Jones, Report 1284, ec. A3, p. 762).
- Caso 2: cuerpo de arco parabólico, D/q = (128/3π)(A_max/l)². Forma cerrada deducida aquí por dos vías (`UNVERIFIED` en fuente impresa); la suma de la serie que usa vale 0.041666666667 frente a 1/24 = 0.041666666667.
- Caso 4: ala elíptica de perfil biconvexo (Jones, Report 1284, ec. A5, p. 762).
- Caso 5: ala rectangular de perfil biconvexo frente a 16τ²/(3β) de Ackeret (`UNVERIFIED` en fuente; confirmada como límite del caso 4).

### Contra N, con 16 nodos por tramo en θ

| Caso | Configuración | Mach | N = 8 | N = 16 | N = 32 | N = 64 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Sears-Haack, M = 1 (cortes normales) | 1.00 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 2 | Arco parabólico, M = 1 (cortes normales) | 1.00 | -0.05 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.05 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.20 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.40 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.60 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.05 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.20 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.40 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.60 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.05 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.20 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.40 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.60 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.05 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.20 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.40 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.60 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 5 | Ala rectangular, A = 2 (βA = 1.5) | 1.25 | -3.03 % | -0.94 % | -0.29 % | -0.09 % |
| 5 | Ala rectangular, A = 4 (βA = 3.0) | 1.25 | -3.24 % | -1.02 % | -0.31 % | -0.09 % |
| 5 | Ala rectangular, A = 8 (βA = 6.0) | 1.25 | -3.48 % | -1.10 % | -0.32 % | -0.08 % |
| 5 | Ala rectangular, A = 16 (βA = 12.0) | 1.25 | -3.92 % | -1.17 % | -0.35 % | -0.10 % |
| 5 | Ala rectangular, A = 32 (βA = 24.0) | 1.25 | -4.03 % | -1.25 % | -0.36 % | -0.09 % |
| 5 | Ala rectangular, A = 2 (βA = 2.5) | 1.60 | -3.14 % | -1.00 % | -0.30 % | -0.09 % |
| 5 | Ala rectangular, A = 4 (βA = 5.0) | 1.60 | -3.35 % | -1.07 % | -0.32 % | -0.08 % |
| 5 | Ala rectangular, A = 8 (βA = 10.0) | 1.60 | -3.86 % | -1.15 % | -0.34 % | -0.10 % |
| 5 | Ala rectangular, A = 16 (βA = 20.0) | 1.60 | -4.00 % | -1.21 % | -0.35 % | -0.09 % |
| 5 | Ala rectangular, A = 32 (βA = 40.0) | 1.60 | -4.13 % | -1.34 % | -0.38 % | -0.11 % |

### Contra el número de nodos por tramo en θ, con N₀ = 32

| Caso | Configuración | Mach | m = 2 | m = 4 | m = 8 | m = 16 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Sears-Haack, M = 1 (cortes normales) | 1.00 | 0.00 % | 0.00 % | 0.00 % | 0.00 % |
| 2 | Arco parabólico, M = 1 (cortes normales) | 1.00 | -0.00 % | -0.00 % | -0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.05 | 0.02 % | 0.00 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.20 | 0.31 % | 0.04 % | 0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.40 | 1.29 % | 0.18 % | 0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 0.5 | 1.60 | 3.01 % | 0.40 % | -0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.05 | 0.27 % | 0.04 % | 0.00 % | -0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.20 | 3.68 % | 0.48 % | -0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.40 | 12.12 % | 1.20 % | -0.01 % | -0.00 % |
| 4 | Ala elíptica, b/a = 1 | 1.60 | 22.54 % | 1.37 % | -0.01 % | -0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.05 | 3.28 % | 0.43 % | -0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.20 | 25.86 % | 1.25 % | -0.00 % | 0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.40 | 52.48 % | -2.81 % | 0.11 % | -0.00 % |
| 4 | Ala elíptica, b/a = 2 | 1.60 | 68.47 % | -8.61 % | 0.17 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.05 | 11.47 % | 1.17 % | -0.01 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.20 | 53.59 % | -3.11 % | 0.11 % | -0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.40 | 75.08 % | -12.93 % | 0.02 % | 0.00 % |
| 4 | Ala elíptica, b/a = 3 | 1.60 | 73.72 % | -17.43 % | -0.66 % | 0.00 % |
| 5 | Ala rectangular, A = 2 (βA = 1.5) | 1.25 | 10.24 % | -1.00 % | -0.27 % | -0.29 % |
| 5 | Ala rectangular, A = 4 (βA = 3.0) | 1.25 | 7.36 % | -0.54 % | -0.30 % | -0.31 % |
| 5 | Ala rectangular, A = 8 (βA = 6.0) | 1.25 | 11.34 % | -1.45 % | -0.23 % | -0.32 % |
| 5 | Ala rectangular, A = 16 (βA = 12.0) | 1.25 | 7.91 % | -0.61 % | -0.34 % | -0.35 % |
| 5 | Ala rectangular, A = 32 (βA = 24.0) | 1.25 | 11.67 % | -1.45 % | -0.26 % | -0.36 % |
| 5 | Ala rectangular, A = 2 (βA = 2.5) | 1.60 | 6.54 % | -0.48 % | -0.31 % | -0.30 % |
| 5 | Ala rectangular, A = 4 (βA = 5.0) | 1.60 | 12.02 % | -0.47 % | -0.42 % | -0.32 % |
| 5 | Ala rectangular, A = 8 (βA = 10.0) | 1.60 | 7.10 % | -0.57 % | -0.34 % | -0.34 % |
| 5 | Ala rectangular, A = 16 (βA = 20.0) | 1.60 | 12.39 % | -0.49 % | -0.45 % | -0.35 % |
| 5 | Ala rectangular, A = 32 (βA = 40.0) | 1.60 | 7.60 % | -0.56 % | -0.39 % | -0.38 % |

**Lo que dice el caso 5.** El error no cae como 1/(βA), como esperaba el plan: con la regla en θ fijada, el ala rectangular da el valor de Ackeret con cualquier alargamiento de la tabla. La resistencia por espesor de un ala rectangular de bordes supersónicos no depende del alargamiento en estos casos (resultado calculado, sin fuente). Con la regla del punto medio en θ, en cambio, el error crecía como βA/n_θ: la singularidad de D′(θ) en θ = π/2 es lo que obligó a cambiar la regla.

## Caso 3: ojiva y cilindro del modelo, cuerpo solo

| Mach | CD con N = 32 | N = 64 | N = 128 | Meseta |
| ---: | ---: | ---: | ---: | --- |
| 1.00 | 0.00328 | 0.00328 | 0.00328 | sí |
| 1.10 | 0.00321 | 0.00321 | 0.00321 | sí |
| 1.60 | 0.00298 | 0.00298 | 0.00298 | sí |

CD sobre la superficie de referencia de 1.143 pies². A Mach mayor que 1 el corte de Mach del cuerpo de revolución se proyecta de forma exacta, no con la aproximación de cuerpo esbelto.

## Autocomprobación del cálculo de áreas

La integral rápida a lo largo de la envergadura frente a la de referencia (tramos y punto medio), en 6000 cortes al azar de las seis geometrías y sus variantes de nariz, borde de salida, interpolación y raíz: mayor diferencia relativa 6.1e-14.

## La afirmación del PM sobre la nariz redondeada

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

Tiempo de esta verificación: 116 s.
