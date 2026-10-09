# EcoDispatch Compute v0.4 — primera evaluación reservada

**Estado: NO se cumple el criterio primario de mejora en la simulación.**  
Este informe registra un resultado negativo o no concluyente sin modificar retrospectivamente la hipótesis. Solo describe el **simulador sintético**; no contiene mediciones de GPU reales.

## Procedencia y orden temporal

1. **Primero** se comprometió el [protocolo v0.4](validation-v0.4-protocol.md), commit `a010bac0f2cfffaf10dfaaee61e2c4c55981cc4a`.
2. Después se implementó y verificó el motor, manteniendo los parámetros preestablecidos.
3. Se ejecutó la evaluación reservada sobre la rama de trabajo en el [workflow GitHub Actions 37938954378](https://github.com/webtilians/ecodispatchcompute/actions/runs/37938954378), con 60 semillas **40001–40060**.
4. El workflow guarda el [JSON de auditoría original](https://github.com/webtilians/ecodispatchcompute/actions/runs/37938954378/artifacts/11620111082) como artefacto descargable (sujeto a la política de retención de GitHub).

Las correcciones previas a esta ejecución eran errores de sintaxis en nombres de propiedades con puntos decimales. No se cambió λ ni la hipótesis después de observar los resultados.

## Pregunta principal, preestablecida

En **saturación** (0,35 peticiones/s, 20 % modelos grandes; 1.000 peticiones por semilla), ¿EcoDispatch con **λ=0,6** reduce el porcentaje de incumplimientos SLA frente al mismo algoritmo con **λ=0**?

El indicador primario es la **media de diferencias pareadas de proporción de solicitudes fuera de SLA**, expresada a continuación en **puntos porcentuales (pp)**. Un delta negativo favorece λ=0,6.

**Resultado observado:**

- `Δ SLA = −0,033 pp` (media de 60 diferencias por semilla);
- intervalo bootstrap pareado del 95 %: **[−0,257; +0,227] pp**;
- **criterio preestablecido: NO CUMPLIDO** (el intervalo incluye cero y valores positivos).

Esto **no** demuestra que λ=0,6 sea inferior, equivalente o superior. Significa que esta evaluación no proporciona evidencia suficiente para afirmar una reducción de incumplimientos SLA bajo la regla elegida.

## Todas las políticas (mismo escenario; resultados secundarios)

| Política | Porcentaje medio de SLA incumplido | Media de P95 por semilla (s) |
| --- | ---: | ---: |
| Round Robin | 52,87 % | 1.884,61 |
| Least Loaded | 66,27 % | 333,35 |
| EcoDispatch λ=0 | 66,18 % | 333,31 |
| EcoDispatch λ=0,2 | 66,05 % | 333,04 |
| **EcoDispatch λ=0,6** | **66,15 %** | **332,55** |
| EcoDispatch λ=1 | 66,10 % | 331,08 |
| EcoDispatch λ=3 | 72,62 % | 339,62 |

Los números están redondeados como los presenta el CLI. P95 es **media de los P95 individuales por semilla**, no el percentil 95 conjunto de todos los trabajos.

Un punto especialmente útil: **Round Robin muestra menos incumplimientos de SLA pero un P95 muchísimo peor**. Por eso es incorrecto afirmar que un balanceador es «el mejor» usando una sola métrica. Una política puede mejorar una proporción y crear una cola extrema para otros trabajos.

Aumentar λ tampoco produce una mejora monotónica: λ=3 incrementa sustancialmente los incumplimientos de SLA en este escenario simulado. **No se seleccionará un λ nuevo retroactivamente para volver a presentar estas mismas semillas como prueba independiente.**

## Interpretación y siguientes hipótesis

El potencial Φ actual aproxima tiempos de respuesta para dos futuras solicitudes representativas. En una congestión intensa, esa aproximación puede no tener suficiente información sobre la composición y duración de las colas. Entre las hipótesis que **merecen otros experimentos nuevos**:

- Cuantificar la demanda cercana a saturación de los servidores capaces de atender modelos grandes.
- Comparar con un baseline más fuerte de **menor finalización estimada** bajo restricciones reales de memoria y batching.
- Añadir memoria KV, modelos dinámicos, tiempos de prefill/decode y estimadores calibrados en hardware.
- Estudiar objetivos multi-métrica o prioridades explícitas para evitar favorecer solo una clase de trabajos.
- Evaluar otros escenarios sintéticos, manteniéndolos como resultados **exploratorios**, no como confirmación repetida.

Estas ideas no son explicaciones causales demostradas del resultado actual.

## Reproducción

```bash
node --test web/tests/*.test.mjs
node scripts/validate-v0.4.mjs --stage reserved --scenario stressed --output results/validation-v0.4-reserved-stressed.json
```

El [laboratorio web](https://webtilians.github.io/ecodispatchcompute/validation.html) permite ejecutar el protocolo localmente en el navegador y descargar el resultado como JSON. Los datos son deterministas para la versión del motor y las semillas fijadas.

**Límite fundamental:** incluso un intervalo bootstrap claramente negativo en este simulador sería evidencia **interna a estas hipótesis sintéticas**, no prueba de mejoras económicas o de SLA en servidores LLM reales, ni una transferencia de garantías teóricas de k-server/matching.
