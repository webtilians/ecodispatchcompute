# 01 — ¿Qué problema estamos resolviendo?

[← Portada](README.md) · [Siguiente: las matemáticas →](02-matematicas.md)

## Una cola de peticiones y pocas GPU

Imagina una empresa con cuatro GPU y muchas personas utilizando modelos de lenguaje. En segundos pueden llegar peticiones para resumir texto, generar código o trabajar con modelos de mayor tamaño.

No todas las GPU pueden ejecutar todos los modelos. Algunas tienen más **VRAM** y otras procesan tokens a mayor velocidad. Las peticiones pueden esperar y, si tardan demasiado, incumplir el tiempo prometido al usuario (**SLA**).

Un **balanceador de cargas** decide a qué servidor enviar cada trabajo. Tiene información de la petición actual, del hardware compatible y de los trabajos ya asignados, pero no puede saber exactamente qué pedirá el próximo usuario.

## El conflicto: rápido ahora frente a disponible después

Supongamos dos GPU libres:

| Recurso | Memoria | Modelo pequeño | Modelo grande |
| --- | --- | --- | --- |
| A | 24 GB | 4 segundos | 20 segundos |
| B | 12 GB | 6 segundos | Incompatible |

Llega un modelo pequeño en t = 0. Elegir A parece óptimo: tarda 4 s en vez de 6 s.

Pero si llega un modelo grande en t = 1 y necesita 20 s en A:

- **Asignando el pequeño a A:** el grande espera hasta t = 4 y termina en t = 24. Su latencia desde t = 1 es de **23 s**.
- **Asignando el pequeño a B:** A queda libre; el grande empieza en t = 1 y termina en t = 21. Su latencia es de **20 s**.

Las sumas de latencias son 4 + 23 = 27 s frente a 6 + 20 = 26 s. Es un **ejemplo pedagógico inventado**, no un benchmark de EcoDispatch.

La decisión de reservar A perjudica al trabajo pequeño en 2 segundos y beneficia al grande en 3. Si el grande nunca llega, reservar A habrá sido peor.

## La hipótesis que queremos investigar

En cargas donde algunos recursos sirven modelos exclusivos, **considerar el coste de perder capacidad para próximas peticiones podría reducir colas y retrasos importantes**.

La palabra clave es *podría*. No debemos confundir una intuición plausible con una mejora medida. Nuestro experimento compara políticas sobre los **mismos trabajos generados**, de forma reproducible.

## Qué hace EcoDispatch Compute

El proceso es:

1. Llega una petición con tipo de modelo, tokens y SLA.
2. Se descartan los recursos que no pueden ejecutar ese modelo.
3. Para cada recurso compatible, se estima cuándo terminaría la petición.
4. EcoDispatch calcula además cuánto perjudicaría esa elección la respuesta a futuras peticiones hipotéticas.
5. Se asigna la petición al recurso con menor puntuación.
6. La petición queda comprometida en la cola FIFO del servidor hasta completarse.

No hay magia predictiva: el sistema **evalúa consecuencias hipotéticas de la decisión actual**, no adivina el futuro.

### Para comprobarlo tú mismo

En el [laboratorio](https://webtilians.github.io/ecodispatchcompute/), selecciona *LLM grandes* y compara un λ cercano a cero con uno más alto. Observa **tanto los SLA como el P95**. No asumas que proteger recursos vaya a mejorar todas las métricas.

[Glosario: GPU, VRAM, LLM, SLA y latencia](glosario.md)
