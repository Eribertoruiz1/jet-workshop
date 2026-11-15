# 0001 · Criterio para decir que modelo y medida coinciden

Fecha: 15 de noviembre de 2026. Decide: el dueño, con recomendación del PM. Marcada `post hoc`.

## Contexto

Al cerrar el spike 1, la franja de fiabilidad usaba una regla propia: un tramo era `validated` si todos los símbolos caían dentro de la banda del modelo. Tenía dos problemas:

- No contaba la incertidumbre de la propia medida. Un punto a 0.0002 de la banda, con una barra de error de ±0.001, contaba como desacuerdo.
- Puntuaba símbolos a menos de 0.30 del CL elegido, pero la gráfica solo dibujaba los que estaban a menos de 0.06. La franja podía cambiar por un punto que no se veía.

## Decisión

1. Se adopta la estructura de ASME V&V 20, descrita en `docs/PROCESS.md`: error de comparación `E = S − D` e incertidumbre de validación `u_val = sqrt(u_D² + u_input²)`, con `S` en el centro de la banda, `u_input` igual a su media anchura y `u_D` igual a la incertidumbre total del punto.
2. Un tramo de la franja es `validated` si en todos los símbolos dibujados `|E| ≤ u_val` y además `u_input ≤ 0.0020`. Si no, y el modelo está dentro de su rango, es `estimate`.
3. La franja puntúa exactamente los símbolos que la gráfica dibuja. Lo que se juzga, se ve.
4. El informe de validación sigue puntuando todos los símbolos con `|CL| ≤ 0.3`, y reporta `E`, `u_val` y su cociente.

## Por qué es `post hoc` y cómo se controla

La regla cambia después de ver los resultados del spike 1, y hace que más tramos salgan `validated`. Para que no sea un ajuste a conveniencia:

- Se toma un criterio publicado por un organismo de normas, no uno inventado aquí.
- El informe muestra una vez, lado a lado, cuántos tramos eran `validated` con la regla anterior y cuántos con la nueva.
- El tope de `u_input ≤ 0.0020` se mantiene: una banda ancha no aprueba por ser ancha.

## Alternativa descartada

Contar como acuerdo que la barra del punto toque la banda. Es más permisiva y no viene de ninguna norma.

## Fuente

H. W. Coleman, "An Overview of ASME V&V 20": https://maretec.tecnico.ulisboa.pt/~maretec.daemon/html_files/CFD_workshops/html_files_2008/papers/COLEMAN.pdf
