# 05 — Diccionario de EcoDispatch Compute (A–Z)

[← Experimentos](04-experimentos.md) · [Preguntas frecuentes →](06-preguntas.md) · [Portada](README.md)

Explicaciones intencionadamente sencillas. Las definiciones marcadas como «en este laboratorio» pueden ser distintas de las utilizadas en sistemas reales más complejos.

## A–C

| Término | Significado comprensible |
| --- | --- |
| **Ablación / ablation** | Experimento en que quitamos o variamos una parte del algoritmo (por ejemplo λ = 0) para comprobar qué aporta. |
| **Admisión (admission control)** | Decidir si un sistema puede aceptar una petición nueva o debe rechazarla o aplazarla. Nuestro simulador acepta todas. |
| **Algoritmo online** | Toma decisiones cuando llega cada petición sin conocer las que llegarán después. |
| **Algoritmo offline** | Puede conocer previamente toda la secuencia de solicitudes; sirve como referencia teórica, no para operar sin conocer el futuro. |
| **Asignación / dispatch** | Decidir qué servidor procesará un trabajo. |
| **Baseline / referencia** | Algoritmo sencillo contra el que se compara uno nuevo. Aquí Round Robin y Least Loaded. |
| **Batch / lote** | Grupo de solicitudes procesadas juntas. |
| **Batching dinámico** | Agrupar solicitudes en tiempo real para aprovechar mejor la GPU, muy frecuente en inferencia LLM moderna. No está modelado. |
| **Benchmark** | Conjunto de pruebas y métricas para comparar sistemas bajo condiciones conocidas. |
| **Bootstrap** | Método estadístico para estimar incertidumbre repitiendo remuestreos de observaciones; todavía no se ejecuta en la web actual. |
| **Capacidad futura** | Posibilidad de atender rápidamente nuevas solicitudes hipotéticas con los recursos que quedarán libres. |
| **Carga de trabajo / workload** | Secuencia y características de las peticiones que recibe el sistema. |
| **Cola / queue** | Trabajos asignados a un servidor que esperan turno. |
| **Compatibilidad / feasibility** | Restricciones obligatorias para poder asignar un trabajo: por ejemplo, modelo cargado y VRAM suficiente. |
| **Coste activo** | Estimación del precio de procesar trabajos durante tiempo ocupado; no es factura real ni consumo eléctrico. |
| **Coste marginal** | Cambio del coste al tomar una decisión frente a no tomarla; ΔΦ representa un deterioro marginal de capacidad. |
| **Coste de oportunidad** | Lo que se pierde al dedicar hoy un recurso a una tarea en vez de mantenerlo disponible para otras. |

## D–H

| Término | Significado comprensible |
| --- | --- |
| **Datos sintéticos** | Datos creados artificialmente para experimentar; no son mediciones de usuarios o GPU reales. |
| **Decode** | En un LLM, fase en la que se generan tokens de salida sucesivos; el rendimiento puede diferir del prefill. |
| **Demanda / arrival rate** | Frecuencia de entrada de trabajos. En la interfaz se expresa en peticiones por segundo. |
| **Δ / delta** | Símbolo de cambio o diferencia: ΔΦ = Φ después − Φ antes. |
| **Distribución de Poisson** | Modelo aleatorio para eventos independientes con tasa media constante. Aquí las llegadas se generan con tiempos entre llegadas exponenciales. |
| **EcoDispatch** | Política del laboratorio que añade una penalización por pérdida de capacidad futura a la latencia estimada. |
| **Eficiencia** | Conseguir un objetivo con menos recursos o coste; hay que especificar qué medimos (SLA, latencia, energía, precio). |
| **Emisiones** | Estimación de impacto ambiental en el EcoDispatch de emergencias. No se calculan en el Compute Lab actual. |
| **Espera / wait time** | Tiempo entre llegada y comienzo del procesamiento. |
| **Fairness / equidad** | Evitar que ciertos usuarios o tipos de trabajo sufran sistemáticamente peor servicio. No está optimizado todavía. |
| **FIFO** | First In, First Out: el primer trabajo en la cola de un servidor se ejecuta primero. |
| **Función objetivo** | Expresión matemática que el algoritmo intenta minimizar o maximizar. |
| **Generador pseudoaleatorio (PRNG)** | Algoritmo que produce números aparentemente aleatorios de manera repetible con una semilla. |
| **GPU** | Procesador especializado en operaciones paralelas, habitualmente utilizado para inferencia y entrenamiento de IA. |
| **Gradiente / descenso de gradiente** | Herramienta para ajustar parámetros mediante derivadas. **No** se usa para aprender λ en el motor actual. |
| **Greedy / voraz** | Algoritmo que toma la mejor decisión inmediata según una regla, sin optimizar toda la secuencia futura. |
| **Heurística** | Regla práctica razonada que busca buenas decisiones sin demostrar que siempre serán óptimas. |
| **Hiperparámetro** | Ajuste definido desde fuera del algoritmo. λ es uno. |
| **Holdout** | Datos o semillas reservados y no utilizados durante el desarrollo, empleados para una evaluación independiente. |

## I–P

| Término | Significado comprensible |
| --- | --- |
| **Inferencia** | Usar un modelo ya entrenado para producir una respuesta, por ejemplo al pedir texto a un LLM. |
| **Intervalo de confianza (IC)** | Intervalo estadístico calculado mediante un procedimiento diseñado para cubrir un parámetro desconocido con cierta frecuencia en repeticiones hipotéticas. No equivale a una garantía sobre una sola simulación. |
| **k-median** | Problema de elegir hasta k ubicaciones para minimizar el coste agregado de atender puntos de demanda. Pertenece a la arquitectura de EcoDispatch original, pero no está implementado en Compute v0.2. |
| **k-server** | Problema clásico de algoritmos online donde k servidores móviles atienden peticiones. Inspiró el estudio original; la heurística Compute no hereda sus teoremas. |
| **KV cache** | Memoria usada por un LLM para conservar información intermedia (claves y valores de atención) y acelerar la generación; no está simulada. |
| **Lambda / λ** | Peso no negativo de la pérdida de capacidad futura: λ = 0 ignora esa penalización; un valor mayor la prioriza más. |
| **Latencia** | Tiempo total que transcurre desde que llega una petición hasta que termina. Incluye espera y procesamiento. |
| **Least Loaded** | Balanceador que elige el servidor con menor tiempo ya comprometido en su cola; desempata por duración de servicio. |
| **LLM** | Large Language Model: modelo de lenguaje grande, por ejemplo un generador de texto. |
| **Matching / emparejamiento** | Problema de asignar recursos a solicitudes cumpliendo restricciones para evitar duplicaciones o incompatibilidades. No implementado por lotes en Compute v0.2. |
| **Media aritmética** | Suma de valores dividida entre su cantidad. Puede ocultar extremos. |
| **Memoria de GPU / VRAM** | Memoria de vídeo necesaria para pesos del modelo y operaciones. |
| **Monte Carlo** | Técnica que usa muchas simulaciones con variación aleatoria para estudiar la distribución de resultados. |
| **Objetivo lexicográfico** | Optimización por niveles: primero se prioriza un objetivo; solo entre empates se mira el segundo, etc. En EcoDispatch Emergencias se prioriza gravedad cubierta → cantidad atendida → coste secundario. |
| **Optimización** | Buscar la mejor decisión según una función objetivo y restricciones definidas. |
| **P95 / percentil 95** | Umbral aproximado por debajo del cual se encuentra el 95 % de las latencias. La web muestra la **media de P95 por semilla**, no el P95 global agregado. |
| **Pareto / frente de Pareto** | Soluciones donde mejorar una métrica implica empeorar alguna otra; útil cuando compiten latencia, coste y cobertura. |
| **Phi / Φ / potencial** | En este laboratorio: media ponderada del mejor tiempo estimado para atender una petición futura representativa de cada modelo. No mide consciencia, energía física ni probabilidades. |
| **PPO** | Proximal Policy Optimization: método de aprendizaje por refuerzo para entrenar políticas. Es un candidato futuro para comparar, no está integrado en el simulador. |
| **Prefill** | Primera fase de inferencia en que un LLM procesa los tokens de entrada o contexto. |
| **Preregistro / preregistration** | Publicar un protocolo experimental antes de ver sus resultados de confirmación, para evitar seleccionar después hipótesis favorables. |
| **Prior / distribución previa** | Hipótesis fija sobre qué porcentaje de solicitudes futuras será de cada tipo. Aquí es la proporción pequeño/grande configurada. |

## R–Z

| Término | Significado comprensible |
| --- | --- |
| **Recurso heterogéneo** | Conjunto de servidores con velocidades, memoria, compatibilidades o precios distintos. |
| **Regresión** | Empeoramiento observado de una métrica tras un cambio. |
| **Reproducibilidad** | Poder repetir exactamente un experimento con la misma versión, parámetros y semilla. |
| **Round Robin** | Repartir trabajos por turnos entre servidores compatibles, sin estimar costes futuros. |
| **Scheduler / planificador** | Componente que decide el orden y el destino de trabajos computacionales. |
| **Score / puntuación** | Valor numérico calculado para comparar asignaciones. EcoDispatch elige el score más bajo. |
| **Seed / semilla** | Número inicial que hace reproducible la generación aleatoria dentro de un mismo motor. |
| **Sensibilidad de λ** | Estudio de cómo cambian las métricas al variar λ manteniendo lo demás constante. |
| **Service time / duración de servicio** | Tiempo que ocupa una GPU procesando una petición (sin contar espera previa). |
| **SLA** | Service Level Agreement: objetivo de servicio. Aquí cada solicitud tiene un límite sintético de latencia, de 25 o 120 s. |
| **Sobreajuste / overfitting** | Elegir parámetros que funcionan muy bien en los experimentos usados para ajustarlos pero que no generalizan a nuevas cargas. |
| **Throughput** | Trabajos terminados por segundo; en el laboratorio se calcula sobre todo el intervalo hasta vaciar la cola. |
| **Token** | Unidad de texto que procesa o genera un LLM; no equivale necesariamente a una palabra. |
| **Tokens/s** | Velocidad de procesamiento o generación expresada en tokens por segundo; en la simulación es una velocidad simplificada. |
| **Trade-off / compromiso** | Mejorar un objetivo a cambio de empeorar otro, por ejemplo una petición pequeña más lenta para preservar GPU para modelos grandes. |
| **Traza / trace** | Registro ordenado de las peticiones y sus características; permite comparar políticas con idéntica carga. |
| **Utilización** | Fracción del tiempo simulado durante el cual los recursos están procesando trabajos. |
| **VRAM** | Video RAM: memoria de las GPU, especialmente importante para determinar qué modelos caben en ellas. |

## Una frase para recordarlo todo

**Llegan trabajos → comprobamos compatibilidad → estimamos la latencia → calculamos el coste de perder capacidad futura → decidimos → medimos el resultado.**

[Volver a las lecciones](README.md) · [Abrir el laboratorio](https://webtilians.github.io/ecodispatchcompute/)
