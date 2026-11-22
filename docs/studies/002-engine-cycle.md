# Estudio 002 · El ciclo del motor: borrador con el J47

Estudio del brief 007 (carril E). **Borrador de la compuerta 2:** contiene el motor v0 y su comparación con el J47. Las preguntas del estudio que comparan métodos (gas, modelos fuera de diseño, límites, masa), pyCycle y la predicción a ciegas llegan en la compuerta 3.

**Generado por `studies/002-engine-cycle/run.ts` desde `studies/002-engine-cycle/study.template.md`: ninguna cifra de este texto está escrita a mano.** Cada cifra lleva su clase: `measured` es una medida del informe; `report text`, una cifra de su texto; `computed`, un cálculo de este estudio; `estimated`, un valor sin medida detrás. Lo que va como **juicio** es opinión de la sesión constructora. Las páginas son las del PDF de cada informe.

## 1. Resumen

- **El motor v0 no reproduce el J47 dentro del criterio prerregistrado.** De 14 regiones de ensayo, 11 cuentan como comparadas y **0 aciertan**. De 43 puntos puntuados, 5 aciertan en las tres magnitudes a la vez.
- **Consecuencia, fijada antes de calcular:** el motor entero queda como `estimated`. Ninguna salida suya lleva `validated`.
- Mediana del error en valor absoluto (`computed` contra `measured`): empuje neto 9.2 %, gasto de combustible 4.7 %, gasto de aire 5.4 %. Máximos: 21.6 %, 18.9 % y 12.3 %.
- **La forma del error es clara** (sección 6): el modelo da de menos al bajar las vueltas y de más a régimen máximo lejos del ancla.
- **Lo que sí cuadra:** el área de tobera que el modelo necesita en el ancla está a un 0.4 % de la geométrica del informe, y el motor llevado a nivel del mar da el gasto de aire nominal a un 0.5 % y la relación de compresión a un 0.1 % (secciones 3 y 4).
- **Parámetros:** cero ajustados a los puntos puntuados; 13 valores medidos y 3 de texto tomados de una sola corrida, el ancla (sección 3).

## 2. Datos

Todo es del General Electric J47 ensayado en 1949 en el túnel de altura de Lewis, con la tobera estándar de 280 pulgadas cuadradas.

| Informe | Qué se usa | Clase |
| --- | --- | --- |
| NACA RM E9G09, tabla I (pp. 17 y 18) | Las 97 corridas: condición, vueltas, empuje, gasto de aire y de combustible, temperatura de escape | `measured` |
| NACA RM E9G28, tabla I (pp. 14 y 15) | Corrida 1: presión y temperatura a la entrada y a la salida del compresor | `measured` |
| NACA RM E9L02, tabla I (pp. 18 y 19) | Corrida 1: presiones de la cámara; combustible | `measured` y `report text` |
| NACA RM E9K10, tabla I (pp. 18 y 19) | Corrida 1: presiones y temperatura de la turbina | `measured` |

- **Son tablas, no curvas.** No se digitalizó nada. Cada tabla se leyó dos veces, por dos lectores independientes que no vieron la lectura del otro. Las dos lecturas coinciden en todas las celdas; una prueba lo comprueba. La ficha está en `packages/physics/data/engines/j47/README.md`.
- **Las columnas derivadas cuadran.** El Mach, el consumo específico, la relación combustible-aire y la relación de temperaturas del motor, recalculados desde las otras columnas, coinciden con lo impreso en las 97 corridas.
- **Lo que el informe no declara.** No da la precisión del empuje ni del gasto de combustible. Las incertidumbres de la sección 5 son, salvo la del gasto de aire, estimación propia.

## 3. El ancla

El modelo se ancla en una sola corrida, la 1: 5000 pies, Mach 0.23, 7895 rpm. Es la de menor altura y menor Mach a régimen máximo, como fijó el plan. No se puntúa.

| Valor del ancla (`measured`) | Cifra | Unidad del informe | Fuente |
| --- | --- | --- | --- |
| Presión estática del túnel | 1740 | lb/ft² | RM E9G09, tabla I |
| Presión total a la entrada | 1806 | lb/ft² | RM E9G28, tabla I |
| Temperatura total a la entrada | 512 | °R | RM E9G28, tabla I |
| Vueltas | 7895 | rpm | RM E9G09, tabla I |
| Gasto de aire | 81.08 | lb/s | RM E9G09, tabla I |
| Presión total a la salida del compresor | 9339 | lb/ft² | RM E9G28, tabla I |
| Temperatura total a la salida del compresor | 902 | °R | RM E9G28, tabla I |
| Presión total a la entrada de la turbina | 8977 | lb/ft² | RM E9K10, tabla I |
| Presión total a la salida de la turbina | 3465 | lb/ft² | RM E9K10, tabla I |
| Temperatura total a la salida de la turbina | 1740 | °R | RM E9K10, tabla I |
| Presión total en la tobera sobre la de entrada | 1.865 | sin unidad | RM E9G09, tabla I |
| Gasto de combustible | 5300 | lb/h | RM E9G09, tabla I |
| Empuje del chorro, de la balanza | 4880 | lbf | RM E9G09, tabla I |
| Poder calorífico inferior (`report text`) | 18550 | Btu/lb | RM E9L02, p. 14 |
| Relación hidrógeno-carbono del combustible (`report text`) | 0.155 | en masa | RM E9L02, p. 14 |
| Vueltas nominales (`report text`) | 7900 | rpm | RM E9G09, p. 3 |

Con esos valores, y con el gas del modelo (aire y productos de combustión con calor específico variable, coeficientes de NASA Glenn), se calcula una vez todo lo que el modelo mantiene constante. El informe no da el coeficiente de descarga de la tobera, así que el ciclo se cierra con la temperatura medida a la salida de la turbina, como preveía el plan.

| En el ancla | Modelo (`computed`) | Informe | Nota |
| --- | --- | --- | --- |
| Temperatura de entrada a la turbina | 1148.7 K (2068 °R) | 2080 °R, calculada por el informe | Nadie la midió. El informe descuenta los sangrados; el modelo no |
| Rendimiento adiabático del compresor | 0.779 | 0.788 | El informe usa calor específico constante |
| Rendimiento politrópico del compresor | 0.822 | no lo da | El que usa el modelo |
| Rendimiento adiabático de la turbina | 0.770 | 0.798 | El informe declara un error máximo de ±3 % a presión alta |
| Rendimiento politrópico de la turbina | 0.749 | no lo da | El que usa el modelo |
| Rendimiento de combustión | 0.962 | 0.952 | El informe declara ±0.04 |
| Pérdida de presión de la cámara | 0.0388 | 0.0388, medida | Es el mismo cociente de presiones medidas |
| Pérdida de presión del conducto de salida | 0.0279 | no la da | De dos presiones medidas |
| Coeficiente de empuje de la tobera | 0.9973 | figura 3: nube entre 0.96 y 1.00 por encima de 1.8 | Empuje del chorro medido entre el ideal del modelo |
| Área efectiva de la tobera | 0.1817 m² | 0.1825 m² (280 in² por 1.01) | Cociente 0.996: el coeficiente de descarga que el informe no da |
| Área efectiva de paso de la turbina | 0.0746 m² | no la da |  |

- **La comprobación que vale:** el área de tobera que necesita el modelo para dejar pasar el gasto medido coincide con la geométrica del informe. No se usó para cerrar.
- **Por qué no coinciden los rendimientos.** El modelo los recalcula con su gas y sin sangrados. Los informes los definen con calor específico constante o con sus gráficos, y restan del gasto de la turbina los sangrados que midieron: 1.74 lb/s de fugas del compresor y 0.42 lb/s de refrigeración, un 2.7 % del aire.
- **Recuento.** Cero parámetros ajustados a los puntos puntuados. Del ancla se toman 13 valores medidos y 3 de texto: los de la primera tabla.

## 4. El J47 parado a nivel del mar

El túnel no ensayó ahí. Estas cifras son las del modelo anclado llevado a nivel del mar, y son las que definen "el J47" entre las decisiones del jugador.

| Parado a nivel del mar, 7900 rpm | Modelo anclado (`computed`) | Nominal del informe (`report text`) | Diferencia |
| --- | --- | --- | --- |
| Empuje | 5426 lbf | 5000 lbf | +8.5 % |
| Gasto de aire | 93.6 lb/s | 94 lb/s | -0.5 % |
| Relación de compresión | 5.10  | 5.1  | -0.1 % |
| Gasto de combustible | 6098 lb/h | 5250 lb/h | +16.2 % |
| Temperatura de salida de la turbina | 1283 °F | 1275 °F | +8 °F |

- El gasto de aire sale a un 0.5 % de su valor nominal y la relación de compresión a un 0.1 %.
- **El empuje y el consumo salen por encima del nominal, y no es un fallo del modelo (juicio).** El motor ensayado ya daba más que su cifra de catálogo: en la corrida del ancla, a 5000 pies, midió 4880 lbf de empuje del chorro con una presión de entrada que es el 85 % de la del nivel del mar.

Lo que el taller toma de aquí:

| Cifra | Valor | Clase |
| --- | --- | --- |
| Gasto de aire de diseño del J47 | 42.44 kg/s | `computed` |
| Relación de compresión de diseño del J47 | 5.097 | `computed` |
| Temperatura de entrada a la turbina de diseño del J47 | 1150.3 K | `computed` |
| Límite de temperatura de entrada a la turbina | 1145.2 K | `computed`: 1275 °F a la salida (`report text`) por el cociente de temperaturas de la turbina en el ancla |
| Presupuesto de sobretemperatura | 3000 K·s | `estimated`, sin fuente |
| Exceso con fallo inmediato | 150 K | `estimated`, sin fuente |
| Vueltas de ralentí sobre las nominales | 0.259 | `measured`: la menor velocidad de la tabla I; `estimated` en otros diseños |

## 5. La comparación

**Qué se compara.** El motor anclado predice las demás corridas: recibe la presión y la temperatura totales de entrada y la presión ambiente medidas en cada una, y las vueltas. Se puntúan el empuje neto, el gasto de combustible y el gasto de aire en las corridas por encima del 85 % de las vueltas nominales.

**Cómo se informa.** Es una adaptación nuestra de ASME V&V 20, no el estándar. El error de comparación es `E = S − D`, modelo menos medida. La incertidumbre de validación es `u_val = sqrt(u_D² + u_num² + u_input²)`. Segunda diferencia con la regla del proyecto: este modelo itera, así que `u_num` no es cero; se estima apretando la tolerancia.

- `u_D`: 1.5 % del gasto de aire (`report text`: tres métodos coincidieron dentro de un 3 %, RM E9G09, p. 14; se toma la mitad); 1.5 % del empuje del chorro y 2.0 % del gasto de combustible, estimación propia. El empuje neto compone el del chorro con el del gasto de aire, por la resistencia de entrada.
- `u_input`: lo que cambia cada salida al mover cada valor del ancla dentro de su incertidumbre. Mediana de `u_val`: 3.3 % en empuje, 2.9 % en combustible y 2.2 % en aire.
- `u_num`: como mucho 2e-10 % del empuje. No pesa.

**El criterio, fusionado antes de abrir ningún informe** (`PLAN.md`, sección 6). Un punto acierta si `|E| ≤ max(u_val, 5 %)` en empuje y en combustible, y con el 3 % en aire. Una región, que es una altura y un Mach, cuenta como comparada con al menos 3 puntos puntuados y una mediana de `u_val` no mayor del 10 %; y acierta si lo hace al menos el 75 % de sus puntos en las tres magnitudes.

### Por región

| Región (pies-Mach) | Puntos puntuados | Mediana de u_val, % (empuje / combustible / aire) | Comparada | Puntos que aciertan en las tres | Dentro del 5 / 5 / 3 %, sin u_val | Acierto |
| --- | --- | --- | --- | --- | --- | --- |
| 5000-0.21 | 3 | 2.6 / 2.8 / 2.1 | sí | 0 de 3 | 0 / 2 / 0 | no |
| 15000-0.21 | 1 | 2.4 / 2.7 / 2.1 | no | 0 de 1 | 0 / 0 / 0 | no |
| 15000-0.53 | 4 | 3.3 / 2.9 / 2.1 | sí | 1 de 4 | 2 / 2 / 1 | no |
| 25000-0.21 | 3 | 2.7 / 2.9 / 2.2 | sí | 1 de 3 | 1 / 2 / 1 | no |
| 25000-0.53 | 4 | 3.3 / 2.9 / 2.2 | sí | 1 de 4 | 1 / 2 / 1 | no |
| 25000-0.72 | 4 | 3.6 / 2.9 / 2.2 | sí | 2 de 4 | 2 / 2 / 2 | no |
| 25000-0.85 | 3 | 4.0 / 2.9 / 2.1 | sí | 0 de 3 | 1 / 1 / 1 | no |
| 25000-0.97 | 4 | 4.1 / 2.8 / 2.1 | sí | 0 de 4 | 2 / 3 / 1 | no |
| 35000-0.21 | 3 | 2.7 / 2.9 / 2.2 | sí | 0 de 3 | 1 / 2 / 0 | no |
| 35000-0.53 | 3 | 3.3 / 2.9 / 2.2 | sí | 0 de 3 | 0 / 3 / 1 | no |
| 35000-0.72 | 4 | 3.6 / 3.0 / 2.2 | sí | 0 de 4 | 0 / 3 / 1 | no |
| 45000-0.21 | 2 | 2.5 / 2.7 / 2.2 | no | 0 de 2 | 1 / 0 / 1 | no |
| 45000-0.53 | 3 | 3.2 / 2.8 / 2.2 | sí | 0 de 3 | 0 / 2 / 2 | no |
| 50000-0.21 | 2 | 2.5 / 2.7 / 2.2 | no | 0 de 2 | 1 / 0 / 1 | no |

No cuentan como comparadas, por tener menos de 3 puntos: 15000-0.21, 45000-0.21, 50000-0.21.

### Por punto

| Corrida | Región | rpm | E empuje, % | u_val, % | Acierta | E combustible, % | u_val, % | Acierta | E aire, % | u_val, % | Acierta |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 5000-0.21 | 7692 | -5.8 | 2.6 | no | -2.1 | 2.8 | sí | -3.5 | 2.1 | no |
| 3 | 5000-0.21 | 7500 | -9.6 | 2.6 | no | -4.2 | 2.8 | sí | -6.1 | 2.1 | no |
| 4 | 5000-0.21 | 6993 | -21.6 | 2.5 | no | -10.2 | 2.7 | no | -12.3 | 2.1 | no |
| 11 | 15000-0.21 | 6993 | -19.4 | 2.4 | no | -8.4 | 2.7 | no | -12.0 | 2.1 | no |
| 18 | 15000-0.53 | 7895 | +12.0 | 3.4 | no | +5.6 | 3.0 | no | +6.0 | 2.3 | no |
| 19 | 15000-0.53 | 7692 | +2.7 | 3.3 | sí | +2.6 | 2.9 | sí | -1.8 | 2.2 | sí |
| 20 | 15000-0.53 | 7500 | -3.8 | 3.3 | sí | -0.8 | 2.9 | sí | -5.3 | 2.1 | no |
| 21 | 15000-0.53 | 6993 | -20.7 | 3.2 | no | -9.8 | 2.7 | no | -10.3 | 2.1 | no |
| 27 | 25000-0.21 | 7692 | +5.1 | 2.7 | no | -1.4 | 2.9 | sí | +6.4 | 2.3 | no |
| 28 | 25000-0.21 | 7500 | +2.8 | 2.7 | sí | +2.4 | 2.9 | sí | +2.0 | 2.2 | sí |
| 29 | 25000-0.21 | 6993 | -13.2 | 2.5 | no | -7.3 | 2.8 | no | -6.4 | 2.1 | no |
| 36 | 25000-0.53 | 7895 | +11.1 | 3.3 | no | +5.9 | 3.0 | no | +7.2 | 2.3 | no |
| 37 | 25000-0.53 | 7692 | +5.0 | 3.2 | no | +4.3 | 3.0 | sí | +3.1 | 2.2 | no |
| 38 | 25000-0.53 | 7500 | +4.6 | 3.3 | sí | +3.5 | 2.9 | sí | +0.8 | 2.2 | sí |
| 39 | 25000-0.53 | 6993 | -15.0 | 3.1 | no | -6.6 | 2.8 | no | -7.2 | 2.1 | no |
| 46 | 25000-0.72 | 7895 | +13.4 | 3.6 | no | +8.7 | 3.0 | no | +6.0 | 2.3 | no |
| 47 | 25000-0.72 | 7692 | +2.1 | 3.5 | sí | +1.6 | 2.9 | sí | +1.9 | 2.2 | sí |
| 48 | 25000-0.72 | 7500 | +1.1 | 3.6 | sí | +2.9 | 2.9 | sí | -2.0 | 2.2 | sí |
| 49 | 25000-0.72 | 6993 | -15.2 | 3.7 | no | -7.4 | 2.8 | no | -9.5 | 2.1 | no |
| 53 | 25000-0.85 | 7895 | +10.6 | 3.9 | no | +7.2 | 3.0 | no | +2.3 | 2.2 | sí |
| 54 | 25000-0.85 | 7500 | -0.0 | 4.0 | sí | -1.5 | 2.9 | sí | -4.8 | 2.1 | no |
| 55 | 25000-0.85 | 6993 | -13.7 | 4.1 | no | -10.3 | 2.7 | no | -8.7 | 2.1 | no |
| 59 | 25000-0.97 | 7895 | +8.6 | 4.1 | no | +4.8 | 3.0 | sí | +0.4 | 2.2 | sí |
| 60 | 25000-0.97 | 7692 | +0.5 | 4.1 | sí | -1.3 | 2.9 | sí | -4.2 | 2.1 | no |
| 61 | 25000-0.97 | 7500 | -4.0 | 4.2 | sí | -3.7 | 2.8 | sí | -7.1 | 2.1 | no |
| 62 | 25000-0.97 | 6993 | -16.6 | 4.4 | no | -11.0 | 2.7 | no | -11.2 | 2.0 | no |
| 63 | 35000-0.21 | 7692 | +9.2 | 2.8 | no | -2.1 | 2.9 | sí | +8.7 | 2.3 | no |
| 64 | 35000-0.21 | 7500 | +3.6 | 2.7 | sí | -1.6 | 2.9 | sí | +3.6 | 2.2 | no |
| 65 | 35000-0.21 | 6993 | -13.0 | 2.5 | no | -8.2 | 2.7 | no | -4.4 | 2.1 | no |
| 70 | 35000-0.53 | 7692 | +11.8 | 3.3 | no | +3.0 | 2.9 | sí | +6.7 | 2.3 | no |
| 71 | 35000-0.53 | 7500 | +7.0 | 3.3 | no | +1.7 | 2.9 | sí | +2.7 | 2.2 | sí |
| 72 | 35000-0.53 | 6993 | -6.8 | 3.3 | no | -4.7 | 2.8 | sí | -5.8 | 2.1 | no |
| 76 | 35000-0.72 | 7800 | +14.0 | 3.6 | no | +5.0 | 3.0 | sí | +8.2 | 2.3 | no |
| 77 | 35000-0.72 | 7692 | +12.1 | 3.6 | no | +4.7 | 3.0 | sí | +5.9 | 2.3 | no |
| 78 | 35000-0.72 | 7500 | +10.1 | 3.7 | no | +4.1 | 3.0 | sí | +1.6 | 2.2 | sí |
| 79 | 35000-0.72 | 6993 | -7.2 | 3.6 | no | -5.0 | 2.8 | no | -6.7 | 2.1 | no |
| 83 | 45000-0.21 | 7500 | -1.8 | 2.6 | sí | -11.6 | 2.7 | no | +5.4 | 2.3 | no |
| 84 | 45000-0.21 | 6993 | -16.7 | 2.4 | no | -14.8 | 2.7 | no | -1.8 | 2.2 | sí |
| 88 | 45000-0.53 | 7692 | +7.8 | 3.2 | no | -3.0 | 2.9 | sí | +8.5 | 2.3 | no |
| 89 | 45000-0.53 | 7500 | +5.6 | 3.3 | no | -3.4 | 2.8 | sí | +1.6 | 2.2 | sí |
| 90 | 45000-0.53 | 6993 | -12.9 | 3.1 | no | -9.8 | 2.7 | no | -2.0 | 2.2 | sí |
| 94 | 50000-0.21 | 7500 | +0.4 | 2.6 | sí | -12.5 | 2.7 | no | +5.2 | 2.3 | no |
| 95 | 50000-0.21 | 6993 | -11.5 | 2.5 | no | -18.9 | 2.6 | no | -1.0 | 2.2 | sí |

Puntos que aciertan, de 43: empuje 12, combustible 24, aire 13. Dentro del umbral a secas, sin `u_val`: 12, 24 y 13. Puntos donde el modelo no encuentra punto de funcionamiento: 0.

![Error de comparación frente a las vueltas](../../studies/002-engine-cycle/out/fig-j47-error.svg)

## 6. Por qué falla

### La forma del error (`computed`)

| rpm | % de las nominales | Puntos | E medio empuje, % | E medio combustible, % | E medio aire, % |
| --- | --- | --- | --- | --- | --- |
| 6993 | 88.5 | 14 | -14.5 | -9.5 | -7.1 |
| 7500 | 94.9 | 13 | +1.2 | -1.9 | -0.2 |
| 7692 | 97.4 | 10 | +5.1 | +0.6 | +3.2 |
| 7800 | 98.7 | 1 | +14.0 | +5.0 | +8.2 |
| 7895 | 99.9 | 5 | +11.1 | +6.5 | +4.4 |

El error medio del empuje cambia con las vueltas: -14.5 % al 88.5 % de las nominales, +1.2 % al 94.9 % y +11.1 % al 99.9 %.

### Dos supuestos que el J47 no cumple (`report text` y juicio)

El modelo mantiene constantes el rendimiento del compresor y el cociente entre su trabajo y el cuadrado de las vueltas. Los dos valores son los del ancla, que está a régimen máximo.

- **El rendimiento del compresor no es constante.** RM E9G28 dice que el máximo fue de aproximadamente un 87 %, a unas 6300 rpm corregidas, y que a las vueltas nominales baja del 79 % a 5000 pies al 72 % a 50000 pies (pp. 3 y 11). El modelo usa en todas partes el del ancla, que se midió a régimen máximo, lejos de ese máximo de rendimiento. Al bajar las vueltas el compresor real rinde más, comprime más y traga más aire que el modelo: de ahí el error negativo.
- **A régimen máximo el compresor se satura.** El mismo informe dice que cerca de las vueltas nominales el gasto de aire deja de crecer porque la entrada del compresor se bloquea (p. 10). El modelo no tiene ese techo: con aire más frío a la entrada, que es lo que pasa en altura, sigue subiendo la relación de compresión y el gasto. De ahí el error positivo.
- **Juicio.** Un modelo sin mapa del compresor, anclado a régimen máximo, no puede acertar a la vez por debajo y por encima del ancla en este motor. Es lo que el plan preveía como el eslabón más débil del candidato A; el plan no preveía que fallara también por encima del 85 % de las vueltas.

### La misma comparación a igual temperatura de escape (`computed`)

El plan (riesgo 2) preveía, si fallaba la ley de vueltas, comparar a la temperatura de salida de la turbina en vez de a las vueltas. Aquí cada punto se calcula a las vueltas a las que el modelo da la temperatura de escape medida. Es un diagnóstico: el motor se vuela por vueltas, así que no cambia el resultado de la sección 5.

| rpm medidas | Puntos | Vueltas del modelo menos medidas, % medio | E medio empuje, % | E medio combustible, % | E medio aire, % |
| --- | --- | --- | --- | --- | --- |
| 6993 | 14 | +1.3 | -8.5 | -3.9 | -5.2 |
| 7500 | 13 | +1.5 | +9.1 | +5.4 | +2.5 |
| 7692 | 10 | +1.7 | +14.2 | +9.4 | +6.3 |
| 7800 | 1 | +2.5 | +27.5 | +18.0 | +12.7 |
| 7895 | 5 | +0.0 | +11.4 | +6.7 | +4.5 |

Con la temperatura igualada, la mediana del error absoluto es 13.6 % en empuje, 7.3 % en combustible y 7.2 % en aire, y quedan dentro del umbral a secas 11, 12 y 8 de 43 puntos (en 0 el modelo no alcanza esa temperatura). A iguales vueltas las medianas eran 9.2 %, 4.7 % y 5.4 %. A igual temperatura el error no baja: sube en las tres magnitudes. El modelo necesita más vueltas que el motor para llegar a la temperatura medida; dicho al revés, a las mismas vueltas el motor real va más caliente de lo que el modelo predice. La ley de vueltas no es, por tanto, la causa principal del error.

**Lo que este borrador no puede decir (juicio).** Con una sola corrida de las tablas de componentes no se puede repartir el error entre el compresor, la turbina y la ley de vueltas. Hace falta transcribir esas tablas corrida a corrida, que es trabajo de la compuerta 3, y con ellas se medirá cada supuesto por separado.

## 7. Qué significa para el motor que se vuela

- **Todo es `estimated`.** El mecanismo que daría `validated` está construido y probado: diseño cerca del J47, sin postquemador, condición de vuelo dentro de una región comparada con acierto y vueltas ensayadas en ella. Hoy ninguna región acierta.
- **Dónde caería un vuelo en día estándar,** si alguna región acertara. El túnel no podía enfriar la entrada por debajo de 439 °R (RM E9G09, p. 5), y a gran altura y poco Mach ensayó con aire más caliente que el estándar:

| Región | Temperatura ambiente equivalente del ensayo, K | Atmósfera estándar a esa altitud, K | Diferencia, % | ¿Cae un día estándar en la región? |
| --- | --- | --- | --- | --- |
| 5000-0.21 | 281.9 | 278.2 | -1.3 | sí |
| 15000-0.21 | 265.6 | 258.4 | -2.7 | sí |
| 15000-0.53 | 265.4 | 258.4 | -2.6 | sí |
| 25000-0.21 | 249.6 | 238.6 | -4.4 | no |
| 25000-0.53 | 242.8 | 238.6 | -1.7 | sí |
| 25000-0.72 | 239.3 | 238.6 | -0.3 | sí |
| 25000-0.85 | 240.9 | 238.6 | -1.0 | sí |
| 25000-0.97 | 238.2 | 238.6 | +0.2 | sí |
| 35000-0.21 | 244.8 | 218.8 | -10.6 | no |
| 35000-0.53 | 235.9 | 218.8 | -7.3 | no |
| 35000-0.72 | 224.7 | 218.8 | -2.6 | sí |
| 45000-0.21 | 244.2 | 216.6 | -11.3 | no |
| 45000-0.53 | 234.4 | 216.6 | -7.6 | no |
| 50000-0.21 | 244.4 | 216.6 | -11.4 | no |

- **El despegue no cae en ninguna región:** el túnel no ensayó por debajo de 5000 pies ni de Mach 0.21.
- **Qué da el motor v0** con las decisiones del J47: 24.1 kN (5426 lbf) parado a nivel del mar; límite de temperatura de entrada a la turbina de 1145 K; ralentí al 26 % de las vueltas.

## 8. Fórmulas sin verificar y límites del modelo

Sin verificar contra una fuente abierta (`// UNVERIFIED` en el código):

- El rendimiento politrópico escrito con la función de entropía.
- La pérdida de presión de la cámara y del conducto de salida proporcional al cuadrado del gasto corregido. Es la forma de la pérdida por fricción de la cámara (RM E9L02, ecuación 7c, p. 15), aplicada aquí a la pérdida entera; para el conducto de salida no hay fuente.
- La ley de trabajo del compresor con el cuadrado de las vueltas. No tiene fuente: es el supuesto del candidato A.
- La turbina tratada como una sola tobera cuando no está bloqueada.
- La recuperación de la toma por encima de Mach 1, escrita de memoria.
- La atmósfera estándar de la tabla de la sección 7, escrita de memoria. El motor no la usa.

`estimated`, sin fuente todavía:

- La regla de daño de la turbina: su presupuesto y su techo.
- El postquemador entero: su temperatura, su rendimiento, su pérdida de presión y la tobera variable ideal.
- La masa, el diámetro y la longitud de un diseño que no sea el J47: semejanza geométrica.
- Los rangos de las tres decisiones.

Lo que el modelo no tiene: sangrados y aire de refrigeración, potencia de accesorios, efecto del número de Reynolds en el compresor, disociación del gas, dilatación de la tobera, resistencia del motor en molinete, bombeo del compresor y apagado de la llama.
