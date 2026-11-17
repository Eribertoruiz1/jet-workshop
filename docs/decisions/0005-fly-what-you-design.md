# 0005 · El producto es volar lo que diseñas

Fecha: 15 de noviembre de 2026. Decide: el dueño.

## Contexto

Hasta hoy el proyecto era un banco de ala con una lección encima. El dueño dijo qué tiene en la cabeza: un jet hecho a tu gusto que se pueda volar, con dificultades en la ruta y objetivos; si falla y se cae, perfecto, siempre que falle por las reglas de la física y no por un guion.

También dijo que el 20 de diciembre era demasiado tarde: bien repartido, cabe en una semana. El spike 1 se cerró en un día, así que el ritmo de construcción lo respalda.

## Decisión

1. **El producto.** Diseñas un jet, con su ala y su motor, y lo vuelas. Cuando falla, la aplicación dice la razón física en una frase.
2. **Fechas.**
   - 22 de noviembre de 2026: primer vuelo jugable. Sustituye a la v0.1 del 20 de diciembre.
   - 29 de noviembre de 2026: taller de motor, rutas con dificultades y objetivos.
3. **Nivel de vuelo.** El avión es una masa con sus cuatro fuerzas, en vista lateral. Es el modelo con que la ingeniería calcula prestaciones. La actitud completa, las barrenas y el 3D quedan para después.
4. **Lo comprobado y lo estimado.** Lo que no se haya comparado con medidas se ve en pantalla como estimado (`docs/PROCESS.md`, regla de evidencia 9). Hoy eso incluye el motor, el peso, el cruce de la velocidad del sonido en alas que no se ensayaron y todo lo que pase de Mach 1.13.
5. **Carga y objetivos.** Soltar una carga sobre un objetivo entra como mecánica de juego con física genérica: la carga pesa y frena, y cae como un cuerpo con resistencia. Quedan fuera los datos de armas reales, el guiado, los sensores, los efectos y la firma. No hacen falta para que sea divertido y no hay fuentes públicas con que comprobarlos.
6. **Carriles.** Los carriles A, B y C siguen como están. Se abren el D (primer vuelo, brief 006) y el E (motor, brief 007 y decisión 0006).

## Por qué

- La lección y el banco responden "por qué"; volar responde "y qué pasa si". Es lo que hace que alguien vuelva.
- Los fallos por causa física son la mejor explicación posible: no despega porque el ala es pequeña, no cruza el sonido porque el empuje no alcanza.
- El trabajo hecho no se pierde. La resistencia medida y el estudio de método son justo lo que decide si el jet cruza la velocidad del sonido.

## Riesgos aceptados

- **Cinco carriles a la vez.** El reglamento del dueño recomienda dos o tres. Se compensa con propiedad de archivos disjunta, un contrato escrito entre motor y vuelo, y con que el PM lea los puntos de control en la rama en vez de recibir los informes pegados.
- **Piezas sin comprobar.** El primer vuelo usa un motor y un peso estimados. Se dice en pantalla.
- **Una semana.** Alcanza para que vuele y falle por razones físicas. No alcanza para pulirlo: eso lo decide la prueba del dueño.

## Alternativas descartadas

- **Terminar primero el cruce de Mach 1 y volar después.** Deja el producto sin jugar durante semanas y depende de una prueba a ciegas que puede salir mal.
- **Empezar en 3D con actitud completa.** Es mucho más trabajo, y casi nada de lo añadido se puede comprobar con los datos que tenemos.
