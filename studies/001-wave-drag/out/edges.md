# Bordes sónicos y recuento de condiciones

Generado por `studies/001-wave-drag/run.ts` desde `geometry/conditions.json`. No editar a mano. Solo geometría: ningún dato de resistencia.

Planta: alargamiento 3.5, estrechamiento 0.2, envergadura 24.00 in; cuerda en el eje 11.429 in y en la punta 2.286 in (calculadas). Mach normal a un borde: M cos Λ. Borde sónico cuando M cos Λ = 1. "Casi sónico" es solo descriptivo: |Mn − 1| ≤ 0.05.

## Flechas de los bordes

| Flecha en el 25 % | Borde de ataque | Sónico a Mach | Borde de salida | Sónico a Mach |
| ---: | ---: | ---: | ---: | ---: |
| 10.8° | 20.87° | 1.070 | -20.84° | 1.070 |
| 35° | 41.69° | 1.339 | 7.34° | 1.008 |
| 47° | 51.63° | 1.611 | 26.61° | 1.118 |

## Recuento de condiciones

| Subconjunto | T1 | T2 | T3 | T4 | Inicio de la subida |
| --- | ---: | ---: | ---: | ---: | ---: |
| open | 12 | 18 | 6 | 0 | 3 |
| blind | 12 | 18 | 9 | 6 | 3 |
| replica | 4 | 6 | 2 | 0 | 1 |

`open`: muestras de la figura 9 de RM L52B08 (entrenamiento). `blind`: el subconjunto ciego de A.5. `replica`: `47deg-t04` en RM L51I04a.

## Mach normal a cada borde, por condición

| Subconjunto | Configuración | Informe | Mach | Tramo | Mn borde de ataque | Borde de ataque | Mn borde de salida | Borde de salida |
| --- | --- | --- | ---: | --- | ---: | --- | ---: | --- |
| open | 10.8deg-t04 | RM L52B08 | 0.500 | T1 | 0.467 | subsonic | 0.467 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.700 | T1 | 0.654 | subsonic | 0.654 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.850 | T1 | 0.794 | subsonic | 0.794 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.900 | T1 | 0.841 | subsonic | 0.841 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.925 | T2 | 0.864 | subsonic | 0.864 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.950 | T2 | 0.888 | subsonic | 0.888 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 0.975 | T2 | 0.911 | subsonic | 0.911 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 1.000 | T2 | 0.934 | subsonic | 0.935 | subsonic |
| open | 10.8deg-t04 | RM L52B08 | 1.020 | T2 | 0.953 | subsonic, near-sonic | 0.953 | subsonic, near-sonic |
| open | 10.8deg-t04 | RM L52B08 | 1.035 | T2 | 0.967 | subsonic, near-sonic | 0.967 | subsonic, near-sonic |
| open | 10.8deg-t04 | RM L52B08 | 1.085 | T3 | 1.014 | supersonic, near-sonic | 1.014 | supersonic, near-sonic |
| open | 10.8deg-t04 | RM L52B08 | 1.100 | T3 | 1.028 | supersonic, near-sonic | 1.028 | supersonic, near-sonic |
| open | 10.8deg-t04 | RM L52B08 | 1.114 | T3 | 1.041 | supersonic, near-sonic | 1.041 | supersonic, near-sonic |
| open | 35deg-t04 | RM L52B08 | 0.500 | T1 | 0.373 | subsonic | 0.496 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.700 | T1 | 0.523 | subsonic | 0.694 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.850 | T1 | 0.635 | subsonic | 0.843 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.900 | T1 | 0.672 | subsonic | 0.893 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.925 | T2 | 0.691 | subsonic | 0.917 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.950 | T2 | 0.709 | subsonic | 0.942 | subsonic |
| open | 35deg-t04 | RM L52B08 | 0.975 | T2 | 0.728 | subsonic | 0.967 | subsonic, near-sonic |
| open | 35deg-t04 | RM L52B08 | 1.000 | T2 | 0.747 | subsonic | 0.992 | subsonic, near-sonic |
| open | 35deg-t04 | RM L52B08 | 1.020 | T2 | 0.762 | subsonic | 1.012 | supersonic, near-sonic |
| open | 35deg-t04 | RM L52B08 | 1.035 | T2 | 0.773 | subsonic | 1.027 | supersonic, near-sonic |
| open | 35deg-t04 | RM L52B08 | 1.100 | T3 | 0.821 | subsonic | 1.091 | supersonic |
| open | 35deg-t04 | RM L52B08 | 1.130 | T3 | 0.844 | subsonic | 1.121 | supersonic |
| open | 47deg-t04 | RM L52B08 | 0.500 | T1 | 0.310 | subsonic | 0.447 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.696 | T1 | 0.432 | subsonic | 0.622 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.843 | T1 | 0.523 | subsonic | 0.754 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.892 | T1 | 0.554 | subsonic | 0.798 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.916 | T2 | 0.569 | subsonic | 0.819 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.941 | T2 | 0.584 | subsonic | 0.841 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.965 | T2 | 0.599 | subsonic | 0.863 | subsonic |
| open | 47deg-t04 | RM L52B08 | 0.990 | T2 | 0.615 | subsonic | 0.885 | subsonic |
| open | 47deg-t04 | RM L52B08 | 1.010 | T2 | 0.627 | subsonic | 0.903 | subsonic |
| open | 47deg-t04 | RM L52B08 | 1.024 | T2 | 0.636 | subsonic | 0.916 | subsonic |
| open | 47deg-t04 | RM L52B08 | 1.112 | T3 | 0.690 | subsonic | 0.994 | subsonic, near-sonic |
| blind | 10.8deg-t04 | RM L51K16a | 1.600 | T4 | 1.495 | supersonic | 1.495 | supersonic |
| blind | 35deg-t04 | RM L51K16a | 1.600 | T4 | 1.195 | supersonic | 1.587 | supersonic |
| replica | 47deg-t04 | RM L51I04a | 0.500 | T1 | 0.310 | subsonic | 0.447 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.696 | T1 | 0.432 | subsonic | 0.622 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.843 | T1 | 0.523 | subsonic | 0.754 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.892 | T1 | 0.554 | subsonic | 0.798 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.916 | T2 | 0.569 | subsonic | 0.819 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.941 | T2 | 0.584 | subsonic | 0.841 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.965 | T2 | 0.599 | subsonic | 0.863 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 0.990 | T2 | 0.615 | subsonic | 0.885 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 1.010 | T2 | 0.627 | subsonic | 0.903 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 1.024 | T2 | 0.636 | subsonic | 0.916 | subsonic |
| replica | 47deg-t04 | RM L51I04a | 1.088 | T3 | 0.675 | subsonic | 0.973 | subsonic, near-sonic |
| replica | 47deg-t04 | RM L51I04a | 1.112 | T3 | 0.690 | subsonic | 0.994 | subsonic, near-sonic |
| blind | 47deg-t04 | RM L51K16a | 1.600 | T4 | 0.993 | subsonic, near-sonic | 1.431 | supersonic |
| blind | 47deg-t06 | RM L51I04a | 0.500 | T1 | 0.310 | subsonic | 0.447 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.700 | T1 | 0.435 | subsonic | 0.626 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.850 | T1 | 0.528 | subsonic | 0.760 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.900 | T1 | 0.559 | subsonic | 0.805 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.925 | T2 | 0.574 | subsonic | 0.827 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.950 | T2 | 0.590 | subsonic | 0.849 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 0.975 | T2 | 0.605 | subsonic | 0.872 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 1.000 | T2 | 0.621 | subsonic | 0.894 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 1.020 | T2 | 0.633 | subsonic | 0.912 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 1.035 | T2 | 0.643 | subsonic | 0.925 | subsonic |
| blind | 47deg-t06 | RM L51I04a | 1.088 | T3 | 0.675 | subsonic | 0.973 | subsonic, near-sonic |
| blind | 47deg-t06 | RM L51I04a | 1.100 | T3 | 0.683 | subsonic | 0.983 | subsonic, near-sonic |
| blind | 47deg-t06 | RM L51I04a | 1.120 | T3 | 0.695 | subsonic | 1.001 | supersonic, near-sonic |
| blind | 47deg-t06 | RM L51K16a | 1.600 | T4 | 0.993 | subsonic, near-sonic | 1.431 | supersonic |
| blind | 47deg-t09 | RM L51I04a | 0.500 | T1 | 0.310 | subsonic | 0.447 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.696 | T1 | 0.432 | subsonic | 0.622 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.843 | T1 | 0.523 | subsonic | 0.754 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.892 | T1 | 0.554 | subsonic | 0.798 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.916 | T2 | 0.569 | subsonic | 0.819 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.941 | T2 | 0.584 | subsonic | 0.841 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.965 | T2 | 0.599 | subsonic | 0.863 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 0.990 | T2 | 0.615 | subsonic | 0.885 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 1.010 | T2 | 0.627 | subsonic | 0.903 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 1.024 | T2 | 0.636 | subsonic | 0.916 | subsonic |
| blind | 47deg-t09 | RM L51I04a | 1.088 | T3 | 0.675 | subsonic | 0.973 | subsonic, near-sonic |
| blind | 47deg-t09 | RM L51I04a | 1.112 | T3 | 0.690 | subsonic | 0.994 | subsonic, near-sonic |
| blind | 47deg-t09 | RM L51I04a | 1.122 | T3 | 0.697 | subsonic | 1.003 | supersonic, near-sonic |
| blind | 47deg-t09 | RM L51K16a | 1.600 | T4 | 0.993 | subsonic, near-sonic | 1.431 | supersonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.500 | T1 | 0.310 | subsonic | 0.447 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.700 | T1 | 0.435 | subsonic | 0.626 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.850 | T1 | 0.528 | subsonic | 0.760 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.900 | T1 | 0.559 | subsonic | 0.805 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.925 | T2 | 0.574 | subsonic | 0.827 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.950 | T2 | 0.590 | subsonic | 0.849 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 0.975 | T2 | 0.605 | subsonic | 0.872 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.000 | T2 | 0.621 | subsonic | 0.894 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.020 | T2 | 0.633 | subsonic | 0.912 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.035 | T2 | 0.643 | subsonic | 0.925 | subsonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.085 | T3 | 0.674 | subsonic | 0.970 | subsonic, near-sonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.100 | T3 | 0.683 | subsonic | 0.983 | subsonic, near-sonic |
| blind | 47deg-root12-t06 | RM L51I04a | 1.121 | T3 | 0.696 | subsonic | 1.002 | supersonic, near-sonic |
| blind | 47deg-root12-t06 | RM L51K16a | 1.600 | T4 | 0.993 | subsonic, near-sonic | 1.431 | supersonic |

