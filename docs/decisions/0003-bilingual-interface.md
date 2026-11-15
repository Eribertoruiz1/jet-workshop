# 0003 · Interfaz en español e inglés

Fecha: 15 de noviembre de 2026. Decide: el dueño.

## Contexto

El reglamento de proyectos del dueño pide interfaz en inglés. Este producto se dirige primero a público hispanohablante, y la primera lección se escribe en español.

## Decisión

1. La interfaz es bilingüe. Todos los textos visibles viven en tablas de cadenas `es` y `en` con las mismas claves.
2. El idioma inicial sale del navegador: español si su idioma empieza por `es`, inglés en otro caso. Hay un conmutador `ES | EN` siempre visible.
3. Los decimales se escriben con punto en los dos idiomas.
4. Código, commits y documentación técnica siguen en inglés. Briefs y decisiones, en español.

## Excepción al reglamento

Es una excepción deliberada a la regla de interfaz en inglés, solo para este proyecto.
