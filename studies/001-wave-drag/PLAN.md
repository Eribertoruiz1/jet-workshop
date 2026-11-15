# Plan · Estudio 001, resistencia de onda

Brief 004, compuerta 1. Fecha: 15 de noviembre de 2026. Va con `PREREGISTRATION.md`, que fija las métricas, los umbrales y la regla de elección. Este plan dice qué se calcula y cómo. Si los dos dicen cosas distintas, manda el prerregistro.

## 1. Entregables y estructura

| Ruta | Qué es | Compuerta |
| --- | --- | --- |
| `studies/001-wave-drag/PLAN.md` | Este plan | 1 |
| `studies/001-wave-drag/PREREGISTRATION.md` | Fase A ahora; fase B con las predicciones | 1 y 3 |
| `studies/001-wave-drag/src/*.ts` | Geometría, distribución de áreas, integrales de resistencia de onda, candidatos, puntuación | 2 |
| `studies/001-wave-drag/run.ts` | El único comando: regenera todas las tablas, todas las figuras y el texto del estudio | 2 |
| `studies/001-wave-drag/geometry/*.json` | Geometría leída de RM L52B08, con figura, tabla y página de cada cota | 2 |
| `studies/001-wave-drag/out/` | Tablas (Markdown y CSV) y figuras (SVG) generadas | 2 |
| `studies/001-wave-drag/study.template.md` | Texto del estudio con marcadores; `run.ts` los rellena con cifras calculadas | 2 |
| `docs/studies/001-wave-drag-method.md` | El estudio, generado desde la plantilla. Ninguna cifra a mano | 2 |
| `studies/001-wave-drag/predictions.csv` | Predicciones del método recomendado y de la línea base | 3 |
| `docs/cp/004.md` | Punto de control del carril | todas |

### El comando

Desde la raíz del repositorio:

```
corepack pnpm exec tsx studies/001-wave-drag/run.ts
```

- `run.ts` también ejecuta las comprobaciones numéricas del estudio (sección 6).
- No hace falta tocar `package.json` ni `vitest.config.ts`. El primero es del carril A y el segundo no es de este carril. Por eso las comprobaciones del estudio no corren con `pnpm test`.
- Si el dueño quiere que corran ahí, hay que añadir `studies/*/test/**` al `include` de `vitest.config.ts`. Ese cambio no lo hago yo.

### Lenguaje y dependencias

- El estudio se escribe en TypeScript, porque así puede llamar a `packages/physics` y `packages/validation` por ruta relativa, sin modificarlos.
- No hay dependencias nuevas.
- Las figuras son SVG escritos por el propio script.
- Si alguna pieza necesitara Python, tendría su propio `requirements.txt` en esta carpeta.

## 2. Reglas del ciego, en la práctica

1. **El `.cache/` de la carpeta principal tiene `l51i04a/` y `l51k16a/`.** No se abren ni se listan por dentro. A este worktree solo se copian los archivos de RM L52B08, que es dato abierto.
2. **`git fetch` solo de `main`.** Con `git fetch origin main`, nunca un fetch de todas las ramas. Nunca se hace checkout ni diff de `lane/heldout-data` ni de `lane/heldout-geometry`. No se lee `packages/validation/data/heldout/`; si apareciera antes de tiempo, no se abre y se avisa.
3. **La hoja `docs/studies/heldout-geometry.md` se lee solo cuando está en `main`.**
4. **Antes de leer una fuente, se mira su índice y su lista de figuras.**
   - Puede contener resultados de RM L51I04a o RM L51K16a, o de alas de esta familia (alargamiento 3.5, estrechamiento 0.2, perfil 65A) con otros espesores o a Mach 1.60.
   - En ese caso, se salta esa parte y se anota en el registro de contaminación: qué fuente, qué se vio y qué decisión pudo afectar.
5. **Los subagentes que leen fuentes reciben esta misma regla por escrito.** Devuelven fórmulas y páginas. De un material reservado dicen solo que existe, nunca sus valores.
6. **Las búsquedas en la web no nombran los informes reservados.**

## 3. Geometría

Se lee de RM L52B08: la figura 3 y la tabla de coordenadas del perfil. Cada cota va en `geometry/*.json` con figura, tabla, página del PDF y página impresa. Ya en el repositorio, en `packages/validation/README.md` y `packages/physics`:

- **Ala.** Alargamiento 3.5, estrechamiento 0.2 y flechas en la línea del 25 % de 10.8°, 35° y 47°. Espesor del 4 % en la dirección de la corriente, perfil 65A. Cuerda en la raíz, en el eje, de 11.430 pulgadas y en la punta de 2.286. Envergadura de 24.00 pulgadas y superficie de referencia de 1.143 pies².
- **Fuselaje.** Cilindro de 2.25 pulgadas de diámetro y 25.15 de largo. Ojiva de 6.61 pulgadas con radio de 20 pulgadas.
  - Es una ojiva tangente: el script comprobará que (R² + L²) / 2R da 20 pulgadas.

Lo que falta y se lee del informe:

- **La posición del ala a lo largo del fuselaje**, y su posición vertical si se ve.
- **El diámetro del soporte (sting)**, si se ve.
- **Las coordenadas del perfil NACA 65A004.**

En los reservados, la geometría viene de la hoja. Si la hoja no basta para un método, por ejemplo con la raíz engrosada, se dice. La ambigüedad entra en el intervalo como entrada incierta (sección 7); no se resuelve mirando datos.

## 4. Base subsónica, común a todos los candidatos

Todos los candidatos suman su término de onda a la misma base:

`CD0(M) = base(M) + W(M)`

- **`base(M)`** es la banda actual de ocho variantes: cuatro factores de forma por dos estados de capa límite.
  - Se evalúa con las funciones de `packages/physics` sin modificar.
  - El término de onda de Korn y Lock queda fuera: se usa `cd − parts.wave`.
  - Los factores de forma y el término de sustentación nula se congelan en Mach min(M, 0.90). Algunas fórmulas de factor de forma no están definidas por encima de Mach 1; Shevell, por ejemplo, tiene una raíz de 1 − M² cos² Λ.
  - El rozamiento se evalúa al Mach M, con el Reynolds de cada ensayo.
  - Para M ≥ 1.0 se añaden las dos variantes de capa límite con factor de forma 1. Es la convención supersónica habitual, sin verificar (`UNVERIFIED`).
- **`W(M)`** es el término de onda de cada candidato, con su puente.

Hasta M 0.90, la base coincide con la banda actual. La pregunta del estudio es `W(M)`.

## 5. Candidatos

### A · Regla de áreas

**A1, a Mach 1: regla de áreas transónica de Whitcomb.**
- La resistencia de onda es la de cuerpo esbelto del cuerpo equivalente: la distribución de áreas de secciones normales al eje, ala más fuselaje.
- Fórmula a verificar: `D/q = −(1/2π) ∫∫ S''(x₁) S''(x₂) ln|x₁ − x₂| dx₁ dx₂`, válida con S'(0) = S'(l) = 0.
- El fuselaje termina en cilindro, así que S'(l) = 0. La base queda fuera porque la serie refiere la resistencia a la presión estática en la base.

**A2, para M > 1: regla de áreas supersónica.**
- Para cada ángulo θ alrededor del eje, se calcula la distribución de áreas cortada por planos inclinados al ángulo de Mach μ, proyectadas sobre el plano normal al eje.
- La resistencia es la media en θ de la de cada cuerpo equivalente.
- Cuando M tiende a 1, los cortes son normales y A2 tiende a A1.
- Fuentes a verificar: Jones, NACA Report 1284, y Harris, NASA TM X-947.

**Ak.** A2 por un factor k, acotado en [0.5, 1.5]: un parámetro libre. Mide cuánto ganaría un factor empírico sobre la teoría.

**Numérica.**
- `S(x)` en N estaciones. El área del ala se integra a lo largo de la línea de corte sobre la planta, con el espesor local del perfil 65A. El área del fuselaje se calcula de forma analítica.
- Se cuenta solo el ala expuesta: el área dentro del fuselaje ya está en el fuselaje.
- La integral es singular y sensible al ruido de S''. Se evalúan dos tratamientos:
  - **Desarrollo de Fourier.** Con x = (l/2)(1 − cos φ), se desarrolla `S'(x) = Σ Aₙ sin nφ` y se calcula `D/q ∝ Σ n Aₙ²`, truncado en N términos. La constante se verifica en la fuente.
  - **Método de Eminton y Lord.** El cuerpo de mínima resistencia que pasa por las áreas dadas, tal como lo usa Harris.
- El suavizado es N, o el número de estaciones del ajuste. Se fija con la verificación de la sección 6, antes de mirar ningún dato de resistencia.
- Los dos niveles vecinos, uno más grueso y otro más fino, entran en la sensibilidad.

### B · Raymer: Sears-Haack con factor empírico

**Qué calcula.** Para M ≥ 1.2:
- `(D/q) = E_WD · [1 − 0.386 (M − 1.2)^0.57 (1 − π Λ_LE^0.77 / 100)] · (9π/2)(A_max/l)²`.
- Entre M 1.05 y 1.2, el valor de M 1.2.
- Entre Mcrit y Mdd, la ley de Lock.
- Entre Mdd y M 1.05, un tramo suavizado.

**De dónde sale.**
- La estructura viene de AeroSandbox (`aerosandbox.library.aerodynamics.transonic`), que cita la sección 12.5.10 de Raymer.
- El libro no es accesible: la fórmula y la constante 0.386 quedan `UNVERIFIED` contra Raymer.
- El suavizado lo toma B de AeroSandbox: es elección del implementador y se informa así.
- Mdd y Mcrit, de Korn y Mason, como en su fuente.

**Elecciones de B que no están en la fuente.**
- **`A_max`** es la mayor área normal del conjunto.
- **`l`** es la longitud del conjunto. El fuselaje real no se cierra, así que en la sensibilidad la longitud va de la del fuselaje a la del cuerpo equivalente cerrado.

**Variantes.**
- **B1.** E_WD fijo, tomado de una guía accesible (el texto de AeroSandbox u otra fuente abierta que cite a Raymer). El valor y su fuente se anotan antes de compararlo con datos. Si no hay ninguna guía, E_WD = 1: Sears-Haack puro, que es la cota inferior.
- **B2.** E_WD libre, acotado en [1, 4]: un parámetro.

### C · Teoría lineal por piezas

- **Ala aislada.** La resistencia de onda por espesor, en teoría lineal supersónica.
- **Fuselaje aislado.** Como cuerpo de revolución.
- **Suma.** Las dos, sin interferencia.
- **Cálculo.** Cada componente se calcula con la misma integral de campo lejano que A2. Por el teorema de Hayes, es la resistencia de la teoría lineal.
- **Para qué sirve.** C contra A2 mide la interferencia ala-fuselaje, que es justo lo que la regla de áreas añade.
- **Si sale barato,** se comprueba el ala aislada con la integral de presiones de campo cercano en un caso.

### D · Semejanza transónica

**Parámetros.** Se usan exactamente los de la fuente verificada:
- Spreiter, NACA Report 1153, que sustituye a TN 2726.
- Los principales: el parámetro transónico `ξ = (M² − 1) / [(γ + 1) M² τ]^(2/3)`, la resistencia reducida `CD (γ + 1)^(1/3) / τ^(5/3)`, el alargamiento reducido `A τ^(1/3)` y, si la fuente lo da, un parámetro de flecha.
- `UNVERIFIED` hasta leer la fuente.

**Variantes.**
- **D1, la curva propia.** Las subidas de las dos alas de entrenamiento se escalan con los parámetros. Su media, interpolada en ξ, predice la tercera. No es paramétrica: se informa aparte del recuento de parámetros y no puede ser recomendada bajo el tope de dos.
- **D2.** La curva colapsada se ajusta con una forma de dos parámetros, una logística en ξ con su nivel y su centro libres. La anchura se fija con la fuente si la da; si no, en 1.

**Qué se espera.** Las tres alas tienen el mismo espesor y alargamiento, y solo cambia la flecha. Si la flecha no entra en los parámetros, D no puede separar las alas, y el estudio lo dirá. Su valor está en extrapolar al espesor, que es lo que pone a prueba el reservado.

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
| curva | El cruce de pendiente 0.1 de la curva completa de cada candidato | los del candidato |

### Recuento de combinaciones

Se evalúan todas y se informan todas:

- A2 con P1, P2 y P3;
- Ak con P1 y P3. Ak con P2 queda fuera porque sumaría tres parámetros: k, p y el de la relación de inicio;
- C con P1, P2 y P3;
- B1 y B2;
- D1 y D2;
- E y E0.

Son 14 curvas completas, más las relaciones de inicio aisladas. Ninguna combinación pasa de dos parámetros libres. Las combinaciones con O-1 u O-2 cuentan su parámetro.

## 6. Verificación numérica

Se hace antes de mirar datos, y fija el suavizado y `u_num`:

1. **Cuerpo de Sears-Haack.** El código tiene que dar la resistencia analítica, `(9π/2)(A_max/l)²` de `D/q`, que es la constante a verificar en la fuente.
2. **Cuerpo de arco parabólico cerrado.** Su resistencia de cuerpo esbelto tiene forma cerrada.
3. **Ojiva y cilindro.** Convergencia con el número de estaciones y con el suavizado. Es el caso más parecido al real, sin forma cerrada.
4. **Límite M → 1.** A2 tiene que tender a A1 en el cuerpo y en el conjunto.
5. **Convergencia en θ y en N** sobre el conjunto real. `u_num` es el cambio entre los dos niveles más finos.

El suavizado elegido es el más grueso que reproduce 1 y 2 dentro del 1 % y converge en 3. Los dos niveles vecinos van a la sensibilidad.

## 7. Entradas inciertas

Esta es la lista de las entradas inciertas: la sensibilidad y el ensanche del intervalo usan esta lista, y solo esta.

| Id | Entrada | Extremos |
| --- | --- | --- |
| I1 | Posición del ala a lo largo del fuselaje | ±0.005 pulgadas si la figura 3 da la cota en número; ±0.05 pulgadas si se mide sobre el dibujo |
| I2 | Coordenadas del perfil | Interpolación lineal frente a spline cúbica de la tabla |
| I3 | Suavizado de la distribución de áreas | Los dos niveles vecinos del elegido (sección 6) |
| I4 | Cierre del cuerpo equivalente en la base | Cilindro hasta el final (S'(l) = 0) frente a transición al soporte, si se conoce su diámetro |
| I5 | Reynolds | ±10 %. La figura 4 de RM L52B08 no está digitalizada y el modelo usa una recta entre los dos valores del texto |
| I6 | Reservados: cotas que la hoja deje ambiguas | Los dos extremos que admita la hoja |

La discretización en θ y en N no es una entrada: es `u_num`.

## 8. Cómo se responde cada pregunta

1. **Inicio.** Se compara, con el ala fuera de cada rotación, el error de O-E, O-1, O-2 y del inicio implícito de cada curva.
2. **Nivel.** Se comparan A2, Ak, B, C y D en T3, con el ala fuera, y su subida entre Mach 1.0 y 1.13 frente a la figura 9.
3. **Puente.** Se comparan P1, P2 y P3 en T2, con el ala fuera. En el hueco de 1.04 a 1.08 no hay datos, así que ningún ajuste se apoya ahí.
4. **Fuselaje.** Se aplica A1 y A2 al fuselaje aislado, sin parámetros, frente a `bielat-l51i04a-body.csv`.
   - Es la prueba más limpia de la integral, porque no hay ala.
   - Se juzga el nivel a M ≥ 1.0. Por debajo, solo se informa.
5. **Coste.** El tiempo de una curva completa de 60 Mach para una geometría nueva, cálculo de áreas incluido: mediana de 200 repeticiones, en Node 24 con `performance.now()`. También se informa qué geometría necesita cada método como entrada.
6. **Explicación.** Una figura generada para la lección: la distribución de áreas del ala de 35° y su fuselaje, con el cuerpo de Sears-Haack de la misma longitud y el mismo volumen encima, a Mach 1. Además, la descomposición fuselaje, ala e interferencia (A2 frente a C).

### Dos trampas que el estudio tiene que medir

**Cuerpo esbelto no es ala delgada.**
- La teoría de cuerpo esbelto pide que la semienvergadura sea pequeña frente a la longitud en la escala de Mach: β·s/c pequeño, donde s es la semienvergadura y c la cuerda en la raíz.
- La teoría lineal pide que el flujo no sea transónico: |ξ| grande.
- El script calcula los dos criterios para cada ala y cada Mach, y el estudio dice dónde deja de valer cada aproximación. No se dan cifras aquí: las calcula el script.

**Resistencia mínima no es resistencia a sustentación nula.**
- Todo el estudio usa la resistencia a sustentación nula, CL = 0.
- La resistencia de onda por curvatura a sustentación nula no se modela, y se dice.

## 9. Tablas y figuras

Todas las genera `run.ts`:

- **Por candidato y combinación:**
  - el error con el ala fuera en cada rotación, en T2, en T3 y en el inicio;
  - la métrica principal;
  - los parámetros libres y sus valores ajustados en cada rotación;
  - el coste en milisegundos.
- **Por ala:** CD0 contra Mach, con las muestras de la figura 9 y los valores (b) de las polares, la base, E, E0 y los mejores candidatos con el ala fuera.
- **Fuselaje aislado** frente a A1 y A2.
- **Verificación numérica:** tablas de la sección 6 y convergencia.
- **Sensibilidad** del método recomendado, por entrada (I1 a I6).
- **Validez:** los criterios de la sección 8 por ala y por Mach.
- **La figura de la lección.**

## 10. Fuentes

Todas están **sin verificar** hasta leerlas. Cada fórmula se confirmará contra su fuente, con su página. Lo que no se pueda confirmar irá marcado `// UNVERIFIED` en el código y en la lista del estudio.

| Fuente | Para qué | Acceso | Tamaño |
| --- | --- | --- | --- |
| Whitcomb, NACA Report 1273 (1956) | Regla de áreas transónica (A1) | NTRS 19930092271 | 14.1 MB |
| Jones, NACA Report 1284 (1956) | Regla de áreas supersónica para ala y fuselaje (A2, C) | NTRS 19930092281 | 0.7 MB |
| Harris, NASA TM X-947 (1964) | Programa de regla de áreas, integral y método de Eminton y Lord (A2) | Copia de PDAS, `pdas.com/refs/tmx947.pdf`. No encontré el registro en NTRS | 2.2 MB |
| Whitcomb y Sevier, NASA TR R-72 (1960) | Regla de áreas supersónica, presentación original | Copia de PDAS, `pdas.com/refs/trr72.pdf` | 0.9 MB |
| Mason, Configuration Aerodynamics, capítulo 10 (supersónico, 2016) | Integral de resistencia de onda, Sears-Haack, regla de áreas | `dept.aoe.vt.edu/~mason/Mason_f/ConfigAeroSupersonicNotes.pdf` | 4.5 MB, según la página del curso |
| Spreiter, NACA TN 2726 (1952), sustituida por Report 1153 | Reglas de semejanza transónica (D) | NTRS 19930083364 (TN 2726). Report 1153: sin registro en NTRS encontrado | 2.0 MB |
| AeroSandbox, `aerosandbox/library/aerodynamics/transonic.py` | Estructura del procedimiento de Raymer (B), que cita a Raymer | GitHub, código fuente | una página |
| Sears (1947), Haack (1941), Eminton y Lord (1956) | Fuentes primarias del cuerpo de mínima resistencia y de la evaluación numérica | Probablemente no accesibles en abierto | n/a |
| Raymer, Aircraft Design | Procedimiento de B y E_WD | No accesible: libro | n/a |

Las fuentes primarias que no sean accesibles se citan a través de la fuente secundaria que las reproduce, con su página, y se marcan así.

### Descargas que necesitan el OK del dueño

Se guardarían en `.cache/` de este worktree, que no se sube:

- NACA Report 1273
- NACA Report 1284
- NASA TM X-947
- NASA TR R-72
- El capítulo 10 de Mason
- NACA TN 2726

RM L52B08 no se descarga: se copia del `.cache/` de la carpeta principal.

## 11. Subagentes

Los permite el brief para leer fuentes largas: Report 1273, TM X-947 y el capítulo de Mason. Cada uno:

- recibe la regla del ciego por escrito (sección 2, puntos 4 y 5);
- devuelve fórmulas con número de ecuación y página, y la lista de figuras con resultados de configuraciones reservadas, solo los títulos;
- deja anotados sus tokens y su tiempo en el punto de control.

No hacen falta subagentes para calcular ni para revisar.

## 12. Pasos

| Paso | Qué | Para en |
| --- | --- | --- |
| 0 | Plan y prerregistro | **Compuerta 1** |
| 1 | Descargas (con OK), verificación de fórmulas y registro de contaminación | |
| 2 | Geometría de RM L52B08 a `geometry/*.json`, con citas | |
| 3 | Núcleo numérico y verificación (sección 6): fija el suavizado y `u_num` sin datos de resistencia | |
| 4 | Candidatos con datos abiertos: rotaciones, tablas, figuras y coste; pregunta 4 con el fuselaje | |
| 5 | Sensibilidad de los candidatos que encabecen la tabla | |
| 6 | Borrador del estudio, generado, con la recomendación de la regla A.9 | **Compuerta 2** |
| 7 | Con el método elegido por el dueño y la hoja en `main`: fase B y `predictions.csv` | **Compuerta 3** |

## 13. Riesgos

- **Pocas muestras supersónicas.** T3 tiene seis muestras abiertas, y el ala de 47° solo una. La métrica principal junta T2 y T3 por eso, pero el nivel supersónico queda poco restringido. El estudio lo dirá.
- **La teoría lineal cerca de Mach 1.** Puede sobreestimar el nivel. Ak y el puente lo pueden absorber, pero a costa de parámetros.
- **La raíz engrosada.** Puede venir descrita con menos detalle del que necesita la distribución de áreas. Entonces entra como I6 y el intervalo se ensancha.
- **Fuentes primarias inaccesibles.** Sears, Haack, Eminton y Lord. Se citan a través de Harris o Mason.
- **La base supersónica.** Factor de forma por encima de Mach 1 y otro túnel en L51K16a. Puede pesar tanto como el término de onda a Mach 1.60.
- **El dato (b).** Si la hoja reservada no trae curvas de la NACA a sustentación nula, el dato sale de la parábola. En el spike 1 la parábola quedó por debajo de la figura 9 hasta 0.0009 (`docs/cp/001.md`, Open).

## 14. Lo que este carril necesita de otros

- **Carril B:** la hoja `docs/studies/heldout-geometry.md` en `main`, antes de la compuerta 3.
- **Ningún cambio en archivos de otros carriles.** La única opción abierta es la de `vitest.config.ts` de la sección 1, y no la toco.
