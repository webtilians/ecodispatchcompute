# Wiki de EcoDispatch Compute

**Guía de aprendizaje en español · versión 0.3 · laboratorio de asignación de recursos**

Esta wiki pretende responder a tres preguntas: **¿qué decide EcoDispatch?, ¿por qué podrían ayudar sus matemáticas?, ¿cómo comprobamos si realmente ayudan?**

No necesitas conocimientos de inteligencia artificial para seguirla. Cuando aparezca una palabra nueva, consulta el [diccionario de términos](glosario.md). La [web del laboratorio](../../web/wiki.html) presenta estos conceptos con una interfaz de lectura y búsqueda.

## Ruta recomendada

| Lección | Aprenderás | Tiempo orientativo |
| --- | --- | --- |
| [01 — Qué problema resolvemos](01-introduccion.md) | Balanceo, peticiones LLM, GPU escasas y ejemplo completo | 8 min |
| [02 — Las matemáticas](02-matematicas.md) | Función de coste, potencial Φ, λ, k-median, matching y k-server | 12 min |
| [03 — Cómo funciona el simulador](03-simulador.md) | Cola, FIFO, tiempos, selección de recursos y métricas | 10 min |
| [04 — Cómo hacer experimentos](04-experimentos.md) | Semillas, P95, SLA, Monte Carlo, controles y pruebas honestas | 12 min |
| [05 — Glosario A–Z](glosario.md) | Más de 40 conceptos definidos con lenguaje sencillo | Consulta |
| [06 — Preguntas frecuentes y límites](06-preguntas.md) | Qué sabemos, qué falta, cuándo podría empeorar | 6 min |

## El proyecto en una frase

Al llegar una petición, cada GPU compatible tiene una latencia de respuesta distinta. EcoDispatch Compute suma a esa latencia una penalización por **reducir la capacidad de atender ciertas peticiones hipotéticas del futuro** y selecciona el menor coste.

**Que una política tenga esta lógica no demuestra que mejore la latencia global.** Puede ayudar o perjudicar según la carga y las restricciones. Precisamente por eso existe el laboratorio.

## Dónde están las cosas

- [Laboratorio interactivo](https://webtilians.github.io/ecodispatchcompute/) — modifica escenarios, ejecuta algoritmos y exporta JSON.
- [Motor JavaScript](../../web/simulator.mjs) — simulación del navegador.
- [Motor Python](../../src/ecodispatch_compute/simulator.py) — simulador original.
- [Diseño técnico](../design.md) — especificación del motor.
- [Protocolo experimental](../research-protocol.md) — cómo contrastar sin elegir resultados favorables.
- [Repositorio de origen EcoDispatch](https://github.com/webtilians/ecodispatch).

## Reglas de interpretación

1. **Todos los datos de la versión actual son sintéticos:** no son medidas de GPU reales.
2. Un buen resultado en el simulador **no certifica** rendimiento de producción.
3. El algoritmo no conoce futuras peticiones. Utiliza hipótesis de demanda.
4. El navegador y Python comparten ideas, pero no el mismo generador aleatorio.
5. Las garantías matemáticas de los artículos originales **no se transfieren automáticamente** a esta adaptación.

Esta documentación es parte del proyecto y puede revisarse igual que el código mediante Pull Requests.
