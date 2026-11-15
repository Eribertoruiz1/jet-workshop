# 0004 · Prueba a ciegas con datos reservados

Fecha: 15 de noviembre de 2026. Decide: el dueño, con recomendación del PM.

## Contexto

En el spike 1 el modelo y sus reglas se ajustaron mirando los mismos datos con los que luego se juzgaron. Varias reglas se cambiaron después de ver resultados. Es el riesgo clásico de este tipo de trabajo: que las decisiones dependan de los datos y el resultado parezca mejor de lo que es.

Hay dos informes de la misma serie de la NACA ya descargados y sin digitalizar: RM L51I04a (el ala de 47° con varios espesores) y RM L51K16a (la serie a Mach 1.60). Nadie en el proyecto ha visto sus resultados, salvo la resistencia del fuselaje aislado.

## Decisión

1. Esos dos informes son los **datos reservados**. El carril B los digitaliza. El carril C no los abre.
2. El carril B publica primero una hoja con la geometría y las condiciones de ensayo, sin ningún resultado.
3. El carril C elige el método con los datos abiertos del spike 1 y escribe sus predicciones para las configuraciones reservadas, con su margen.
4. Las predicciones se fusionan en `main` antes que los datos. Después se puntúa una sola vez.
5. El auditor comprueba el orden con las fechas de los commits.

## Límite honesto

No es un ciego perfecto: las dos sesiones comparten repositorio y nada impide técnicamente abrir un PDF. Se apoya en la regla, en el registro de contaminación del brief 004 y en la auditoría del orden de los merges.

## Fuente

Hofman y otros, "Pre-registration for Predictive Modeling": https://arxiv.org/pdf/2311.18807v1.pdf
