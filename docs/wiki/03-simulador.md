# 03 — Cómo funciona el simulador

[← Matemáticas](02-matematicas.md) · [Siguiente: experimentar →](04-experimentos.md)

## El escenario actual

El laboratorio utiliza **cuatro GPU ficticias**, no modelos de hardware comercial. La memoria y la velocidad son simplificaciones.

| Servidor | VRAM simulada | Modelos compatibles | Tokens/s base sintéticos |
| --- | --- | --- | --- |
| GPU A | 24 GB | Pequeño y grande | 145 |
| GPU B | 12 GB | Solo pequeño | 115 |
| GPU C | 24 GB | Pequeño y grande | 100 |
| GPU D | 16 GB | Solo pequeño | 95 |

Cada GPU tiene una sola cola de trabajos **FIFO**, sin procesamiento por lotes, preempción ni concurrencia interna.

## ¿Qué ocurre cuando llega una solicitud?

- **arrival**: instante en que aparece en el sistema.
- **start**: instante en que su GPU asignada queda libre para ejecutarla.
- **finish**: instante de finalización.
- **wait = start − arrival**: tiempo en cola.
- **latency = finish − arrival**: espera + ejecución.
- **SLA**: máximo de latencia permitido para esa solicitud.

La siguiente disponibilidad de una GPU es el finish del último trabajo ya comprometido con ella. El motor procesa las solicitudes en orden de llegada y nunca reasigna trabajos anteriores.

## Los tres algoritmos

### Round Robin

Va rotando por los servidores compatibles. Es sencillo y tiene poco coste computacional. En una flota heterogénea puede mandar demasiado trabajo a servidores más lentos.

### Least Loaded

Selecciona el servidor que tiene **menos tiempo de trabajo pendiente** en su cola. Si hay empate, usa el tiempo estimado de ejecución de la petición como desempate. No es simplemente el que tiene menos solicitudes pendientes.

### EcoDispatch

Estima la latencia actual más el deterioro del potencial futuro Φ. Puede elegir un servidor ligeramente menos rápido si así mantiene libre otro más valioso para modelos grandes.

Con λ = 0 y coste monetario desactivado, EcoDispatch es un selector de **mínimo tiempo de finalización previsto** para la petición actual. Eso **no es idéntico** a Least Loaded, que antepone el backlog y solo usa el servicio como desempate.

## Datos que son inventados

- Tipos de modelo pequeños y grandes; mínimo de 8 y 20 GB de VRAM.
- Tokens generados por solicitud y rendimiento simplificado por tipo de modelo.
- Tiempo fijo de preparación de 1,5 segundos por trabajo.
- SLA fijo de 25 segundos para pequeños y 120 para grandes.
- Tarifa horaria sintética de cada GPU.
- Llegadas Poisson, mezcla de tipos de modelos y tamaños de solicitud.

El coste mostrado es **precio por segundo ocupado** multiplicado por tiempo activo. No refleja consumo eléctrico, capacidad reservada ni facturas reales.

## Qué NO simula todavía

- Tokenización real, longitud de prompt frente a salida, prefill y decode.
- Dynamic batching y concurrencia de inferencias.
- Memoria KV/cache, descarga o carga de modelos.
- Redes, latencias entre regiones y fallos.
- Autoscaling, preempción, reintentos y prioridad/justicia por cliente.
- Variación real de rendimiento o energía de GPU.

El laboratorio permite **demostrar propiedades dentro de este modelo**, no estimar automáticamente el ahorro de un centro de datos.

[Laboratorio interactivo](https://webtilians.github.io/ecodispatchcompute/) · [Glosario](glosario.md)
