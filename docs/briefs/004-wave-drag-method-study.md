# Brief 004 · Estudio de método: cruzar Mach 1, con predicciones a ciegas

Carril C. Rama `lane/wave-drag-study`. Punto de control: `docs/cp/004.md`.
Lee antes `CLAUDE.md` y `docs/PROCESS.md`. Decisiones que este brief aplica: `docs/decisions/0002` y `0004`.

## Resultado

El spike 1 demostró que el método de libro para alas de transporte no sirve aquí: la relación de Korn falla el inicio de la subida de resistencia por −0.09, −0.02 y +0.12 de Mach en las tres alas, y el modelo se declara fuera de rango por encima del Mach crítico. Este estudio elige con qué sustituirlo.

No se construye nada en `packages/`. Se entrega:

- `docs/studies/001-wave-drag-method.md`: el estudio, con una recomendación.
- `studies/001-wave-drag/`: los scripts que producen cada tabla y figura del estudio, reproducibles con un comando.
- `studies/001-wave-drag/PREREGISTRATION.md`: las métricas y umbrales con los que se juzgarán las predicciones.
- `studies/001-wave-drag/predictions.csv`: la predicción del método recomendado, y de la línea base, para cada configuración reservada.

No cuenta como entrega: una revisión de literatura sin cuentas, una recomendación sin comparación contra los datos, ni predicciones hechas después de ver los datos reservados.

## Reglas del ciego

1. **No abras los informes reservados:** NACA RM L51I04a y RM L51K16a. Tampoco la rama `lane/heldout-data`, ni `packages/validation/data/heldout/`.
2. **La geometría reservada te llega escrita** en `docs/studies/heldout-geometry.md`, que publica el carril B. Si aún no está en `main`, avanza con todo lo demás.
3. **Registro de contaminación.** Si una fuente que consultas muestra resultados de esas configuraciones, ciérrala y anótalo en el punto de control: qué fuente, qué viste y qué decisión pudo afectar.
4. **Orden.** Primero se fusiona `PREREGISTRATION.md`; después se calculan y se fusionan las predicciones. Nada de esto se retoca cuando lleguen los datos.

## Datos que sí puedes usar

- `packages/validation/data/bielat-l52b08.csv`: las tres alas del spike 1.
- `packages/validation/data/bielat-l51i04a-body.csv`: el fuselaje aislado, ya abierto.
- El modelo y la banda actuales, llamados desde `packages/physics` y `packages/validation` sin modificarlos. En `studies/` puedes mezclar TypeScript y Python; tus dependencias de Python van en tu propio `requirements.txt`.
- Cualquier fuente abierta que no enseñe los resultados reservados.

## Las preguntas

1. **Inicio.** ¿Qué relación predice el Mach de inicio de la subida en las tres alas?
2. **Nivel.** ¿Qué método predice cuánto sube la resistencia a sustentación nula entre Mach 1.0 y 1.13? En los datos abiertos la subida es del orden de 0.01, y menor cuanto mayor es la flecha.
3. **Puente.** ¿Con qué forma se une el tramo subsónico con el nivel supersónico, usando como mucho un parámetro libre?
4. **Fuselaje.** El fuselaje aislado sube 0.0037 a Mach 0.975 y 0.0064 a Mach 1.10, y el modelo actual no lo recoge. ¿El método lo cubre?
5. **Coste.** ¿Se puede evaluar en un navegador mientras se arrastra un control? ¿Qué geometría necesita como entrada?
6. **Explicación.** ¿Se puede enseñar en una lección, con una imagen?

## Candidatos mínimos

Evalúa al menos estos. Añade los que encuentres.

- **A · Regla de áreas.** Resistencia de onda de cuerpo esbelto a partir de la distribución de áreas transversales del conjunto ala y fuselaje, a Mach 1, y su extensión supersónica con planos de corte inclinados.
- **B · Sears-Haack con factor empírico.** El procedimiento de Raymer que el spike 1 evaluó sin poder validarlo.
- **C · Teoría lineal supersónica** para el espesor del ala, más el fuselaje como cuerpo de revolución.
- **D · Semejanza transónica.** Colapsar las tres alas medidas con los parámetros de semejanza y usar esa curva propia para predecir otras flechas y espesores.
- **E · Línea base.** El modelo actual tal como está.

Pistas de fuentes, todas **sin verificar**: confirma cada fórmula contra su fuente antes de usarla y cita la página. Whitcomb, NACA Report 1273, regla de áreas. R. T. Jones, NACA Report 1284, resistencia de conjuntos ala y fuselaje a velocidades supersónicas. Sears (1947) y Haack (1941), cuerpo de mínima resistencia de onda. Eminton y Lord (1956), evaluación numérica de la integral de resistencia de onda. Harris, NASA TM X-947 (1964), programa de regla de áreas supersónica. Mason, Configuration Aerodynamics. Si una fuente no es accesible, dilo; no reconstruyas la fórmula de memoria sin marcarla.

## Protocolo

- **Antes de calcular nada:** escribe el plan y `PREREGISTRATION.md`. Es la compuerta 1.
- **Nada se ajusta con las tres alas a la vez.** Todo parámetro libre se ajusta con dos alas y se prueba en la tercera, rotando las tres. Reporta el error de la que quedó fuera.
- **Cuenta los parámetros libres** de cada candidato. A igual acierto, gana el que tenga menos.
- **Compara como manda `docs/PROCESS.md`:** error de comparación `E` e incertidumbre de validación `u_val`, por ala y por tramo de Mach.
- **Geometría.** La distribución de áreas se calcula a partir de la geometría documentada: ala trapezoidal con perfil NACA 65A al 4 % y fuselaje de 2.25 pulgadas con ojiva. La posición del ala sobre el fuselaje y las coordenadas del perfil están en el informe abierto, RM L52B08; cita figura y tabla.
- **Sensibilidad.** Para el método recomendado, cuánto cambia el resultado con cada entrada incierta.

Trampas conocidas:

- **La integral de la regla de áreas es singular** y muy sensible al ruido de la segunda derivada del área. Una distribución de áreas con esquinas da resultados absurdos. Documenta cómo la suavizas y cuánto cambia el resultado al cambiar el suavizado.
- **Cuerpo esbelto no es ala delgada.** La teoría de cuerpo esbelto pierde validez cuando la envergadura no es pequeña frente a la longitud. Di dónde deja de valer para estas alas de alargamiento 3.5.
- **El hueco de los datos.** No hay medidas entre Mach 1.04 y 1.08, por los choques reflejados en el túnel. Ningún ajuste puede apoyarse ahí.
- **Tres alas son pocas.** Un método con dos parámetros libres puede pasar por tres puntos sin saber nada. Por eso existe la prueba a ciegas.
- **Resistencia mínima no es resistencia a sustentación nula.** En estas alas con curvatura, el mínimo cae cerca de CL 0.09. Di siempre cuál de las dos usas.

## Las predicciones

Para cada configuración y condición de `docs/studies/heldout-geometry.md`:

- Resistencia a sustentación nula en cada Mach ensayado.
- Mach de inicio de la subida, con la definición de la NACA: pendiente de 0.1.
- En las de Mach 1.60, la resistencia a sustentación nula.

Cada valor con su mínimo y su máximo. Dos filas por condición: el método recomendado y la línea base. Formato de `predictions.csv`: `config, mach, quantity, method, predicted_min, predicted_max`.

`PREREGISTRATION.md` fija antes: qué magnitudes se comparan, con qué métrica, qué resultado contaría como que el método funciona y cuál como que falla. Sigue la estructura de "Pre-registration for Predictive Modeling" (https://arxiv.org/pdf/2311.18807v1.pdf) en lo que aplique.

## Honestidad

- Cada tabla y figura del estudio la genera un script. Ninguna cifra escrita a mano.
- Si ningún candidato mejora la línea base, el estudio lo dice y recomienda no construir.
- Lo que no pudiste verificar contra su fuente va en una lista propia.
- El estudio separa tres cosas: lo que está medido, lo que está calculado y lo que es tu juicio.

## Checks de aceptación

1. Un comando regenera todas las tablas y figuras del estudio desde cero.
2. Para cada candidato: error en la tercera ala de cada rotación, número de parámetros libres y coste por evaluación.
3. `PREREGISTRATION.md` se fusionó antes de que exista `predictions.csv`. Lo comprueban las fechas de los commits.
4. `predictions.csv` cubre todas las condiciones de la hoja de geometría.
5. El registro de contaminación está en el punto de control, aunque esté vacío.

## Compuertas

1. **Plan y prerregistro.** Compuerta técnica: el PM revisa las métricas; el dueño hace el merge.
2. **Borrador del estudio con recomendación.** El PM rehace cinco cifras con su propio código y da su opinión. El dueño elige el método.
3. **Predicciones.** PR con `predictions.csv`. Con su merge queda sellado el ciego y el carril B puede fusionar sus datos.

Lo que sigue no es de este brief: puntuar las predicciones y construir el método elegido en `packages/physics` será el brief 005.

## Terminado cuando

- [ ] Las tres compuertas pasaron.
- [ ] Los cinco checks están en `docs/cp/004.md` con su salida real.
- [ ] El estudio lista sus fórmulas sin verificar y sus límites.
- [ ] El uso de tokens y el tiempo están anotados.

## Modelo y esfuerzo

Opus 5.5 con `/effort high`. Es trabajo de juicio y de corrección sutil: elegir un método y no engañarse con tres alas. Puedes usar subagentes para leer fuentes largas. No hace falta workflow.

## Idioma

Respuestas al dueño en español. El estudio, en español. Código, commits y CSV en inglés.

## Cierre

El estudio termina con una apuesta por escrito. Si la prueba a ciegas sale bien, el proyecto tendrá algo que casi ningún simulador puede enseñar. Si sale mal, sabremos exactamente dónde, antes de haber construido nada encima.
