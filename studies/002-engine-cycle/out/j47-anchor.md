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
| Coeficiente de empuje de la tobera | 0.9973 | figura 3 del informe, sin digitalizar | Empuje del chorro medido entre el ideal del modelo |
| Área efectiva de la tobera | 0.1817 m² | 0.1825 m² (280 in² por 1.01) | Cociente 0.996: el coeficiente de descarga que el informe no da |
| Área efectiva de paso de la turbina | 0.0746 m² | no la da |  |

| Parado a nivel del mar, 7900 rpm | Modelo anclado (`computed`) | Nominal del informe (`report text`) | Diferencia |
| --- | --- | --- | --- |
| Empuje | 5426 lbf | 5000 lbf | +8.5 % |
| Gasto de aire | 93.6 lb/s | 94 lb/s | -0.5 % |
| Relación de compresión | 5.10  | 5.1  | -0.1 % |
| Gasto de combustible | 6098 lb/h | 5250 lb/h | +16.2 % |
| Temperatura de salida de la turbina | 1283 °F | 1275 °F | +8 °F |

| Cifra | Valor | Clase |
| --- | --- | --- |
| Gasto de aire de diseño del J47 | 42.44 kg/s | `computed` |
| Relación de compresión de diseño del J47 | 5.097 | `computed` |
| Temperatura de entrada a la turbina de diseño del J47 | 1150.3 K | `computed` |
| Límite de temperatura de entrada a la turbina | 1145.2 K | `computed`: 1275 °F a la salida (`report text`) por el cociente de temperaturas de la turbina en el ancla |
| Presupuesto de sobretemperatura | 3000 K·s | `estimated`, sin fuente |
| Exceso con fallo inmediato | 150 K | `estimated`, sin fuente |
| Vueltas de ralentí sobre las nominales | 0.259 | `measured`: la menor velocidad de la tabla I; `estimated` en otros diseños |
