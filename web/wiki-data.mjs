// Automatically derived from docs/wiki/glosario.md; keep the Markdown as canonical source.
export const GLOSSARY = [
  {
    "term": "Ablación / ablation",
    "definition": "Experimento en que quitamos o variamos una parte del algoritmo (por ejemplo λ = 0) para comprobar qué aporta."
  },
  {
    "term": "Admisión (admission control)",
    "definition": "Decidir si un sistema puede aceptar una petición nueva o debe rechazarla o aplazarla. Nuestro simulador acepta todas."
  },
  {
    "term": "Algoritmo online",
    "definition": "Toma decisiones cuando llega cada petición sin conocer las que llegarán después."
  },
  {
    "term": "Algoritmo offline",
    "definition": "Puede conocer previamente toda la secuencia de solicitudes; sirve como referencia teórica, no para operar sin conocer el futuro."
  },
  {
    "term": "Asignación / dispatch",
    "definition": "Decidir qué servidor procesará un trabajo."
  },
  {
    "term": "Baseline / referencia",
    "definition": "Algoritmo sencillo contra el que se compara uno nuevo. Aquí Round Robin y Least Loaded."
  },
  {
    "term": "Batch / lote",
    "definition": "Grupo de solicitudes procesadas juntas."
  },
  {
    "term": "Batching dinámico",
    "definition": "Agrupar solicitudes en tiempo real para aprovechar mejor la GPU, muy frecuente en inferencia LLM moderna. No está modelado."
  },
  {
    "term": "Benchmark",
    "definition": "Conjunto de pruebas y métricas para comparar sistemas bajo condiciones conocidas."
  },
  {
    "term": "Bootstrap",
    "definition": "Método estadístico para estimar incertidumbre repitiendo remuestreos de observaciones; todavía no se ejecuta en la web actual."
  },
  {
    "term": "Capacidad futura",
    "definition": "Posibilidad de atender rápidamente nuevas solicitudes hipotéticas con los recursos que quedarán libres."
  },
  {
    "term": "Carga de trabajo / workload",
    "definition": "Secuencia y características de las peticiones que recibe el sistema."
  },
  {
    "term": "Cola / queue",
    "definition": "Trabajos asignados a un servidor que esperan turno."
  },
  {
    "term": "Compatibilidad / feasibility",
    "definition": "Restricciones obligatorias para poder asignar un trabajo: por ejemplo, modelo cargado y VRAM suficiente."
  },
  {
    "term": "Coste activo",
    "definition": "Estimación del precio de procesar trabajos durante tiempo ocupado; no es factura real ni consumo eléctrico."
  },
  {
    "term": "Coste marginal",
    "definition": "Cambio del coste al tomar una decisión frente a no tomarla; ΔΦ representa un deterioro marginal de capacidad."
  },
  {
    "term": "Coste de oportunidad",
    "definition": "Lo que se pierde al dedicar hoy un recurso a una tarea en vez de mantenerlo disponible para otras."
  },
  {
    "term": "Datos sintéticos",
    "definition": "Datos creados artificialmente para experimentar; no son mediciones de usuarios o GPU reales."
  },
  {
    "term": "Decode",
    "definition": "En un LLM, fase en la que se generan tokens de salida sucesivos; el rendimiento puede diferir del prefill."
  },
  {
    "term": "Demanda / arrival rate",
    "definition": "Frecuencia de entrada de trabajos. En la interfaz se expresa en peticiones por segundo."
  },
  {
    "term": "Δ / delta",
    "definition": "Símbolo de cambio o diferencia: ΔΦ = Φ después − Φ antes."
  },
  {
    "term": "Distribución de Poisson",
    "definition": "Modelo aleatorio para eventos independientes con tasa media constante. Aquí las llegadas se generan con tiempos entre llegadas exponenciales."
  },
  {
    "term": "EcoDispatch",
    "definition": "Política del laboratorio que añade una penalización por pérdida de capacidad futura a la latencia estimada."
  },
  {
    "term": "Eficiencia",
    "definition": "Conseguir un objetivo con menos recursos o coste; hay que especificar qué medimos (SLA, latencia, energía, precio)."
  },
  {
    "term": "Emisiones",
    "definition": "Estimación de impacto ambiental en el EcoDispatch de emergencias. No se calculan en el Compute Lab actual."
  },
  {
    "term": "Espera / wait time",
    "definition": "Tiempo entre llegada y comienzo del procesamiento."
  },
  {
    "term": "Fairness / equidad",
    "definition": "Evitar que ciertos usuarios o tipos de trabajo sufran sistemáticamente peor servicio. No está optimizado todavía."
  },
  {
    "term": "FIFO",
    "definition": "First In, First Out: el primer trabajo en la cola de un servidor se ejecuta primero."
  },
  {
    "term": "Función objetivo",
    "definition": "Expresión matemática que el algoritmo intenta minimizar o maximizar."
  },
  {
    "term": "Generador pseudoaleatorio (PRNG)",
    "definition": "Algoritmo que produce números aparentemente aleatorios de manera repetible con una semilla."
  },
  {
    "term": "GPU",
    "definition": "Procesador especializado en operaciones paralelas, habitualmente utilizado para inferencia y entrenamiento de IA."
  },
  {
    "term": "Gradiente / descenso de gradiente",
    "definition": "Herramienta para ajustar parámetros mediante derivadas. **No** se usa para aprender λ en el motor actual."
  },
  {
    "term": "Greedy / voraz",
    "definition": "Algoritmo que toma la mejor decisión inmediata según una regla, sin optimizar toda la secuencia futura."
  },
  {
    "term": "Heurística",
    "definition": "Regla práctica razonada que busca buenas decisiones sin demostrar que siempre serán óptimas."
  },
  {
    "term": "Hiperparámetro",
    "definition": "Ajuste definido desde fuera del algoritmo. λ es uno."
  },
  {
    "term": "Holdout",
    "definition": "Datos o semillas reservados y no utilizados durante el desarrollo, empleados para una evaluación independiente."
  },
  {
    "term": "Inferencia",
    "definition": "Usar un modelo ya entrenado para producir una respuesta, por ejemplo al pedir texto a un LLM."
  },
  {
    "term": "Intervalo de confianza (IC)",
    "definition": "Intervalo estadístico calculado mediante un procedimiento diseñado para cubrir un parámetro desconocido con cierta frecuencia en repeticiones hipotéticas. No equivale a una garantía sobre una sola simulación."
  },
  {
    "term": "k-median",
    "definition": "Problema de elegir hasta k ubicaciones para minimizar el coste agregado de atender puntos de demanda. Pertenece a la arquitectura de EcoDispatch original, pero no está implementado en Compute v0.2."
  },
  {
    "term": "k-server",
    "definition": "Problema clásico de algoritmos online donde k servidores móviles atienden peticiones. Inspiró el estudio original; la heurística Compute no hereda sus teoremas."
  },
  {
    "term": "KV cache",
    "definition": "Memoria usada por un LLM para conservar información intermedia (claves y valores de atención) y acelerar la generación; no está simulada."
  },
  {
    "term": "Lambda / λ",
    "definition": "Peso no negativo de la pérdida de capacidad futura: λ = 0 ignora esa penalización; un valor mayor la prioriza más."
  },
  {
    "term": "Latencia",
    "definition": "Tiempo total que transcurre desde que llega una petición hasta que termina. Incluye espera y procesamiento."
  },
  {
    "term": "Least Loaded",
    "definition": "Balanceador que elige el servidor con menor tiempo ya comprometido en su cola; desempata por duración de servicio."
  },
  {
    "term": "LLM",
    "definition": "Large Language Model: modelo de lenguaje grande, por ejemplo un generador de texto."
  },
  {
    "term": "Matching / emparejamiento",
    "definition": "Problema de asignar recursos a solicitudes cumpliendo restricciones para evitar duplicaciones o incompatibilidades. No implementado por lotes en Compute v0.2."
  },
  {
    "term": "Media aritmética",
    "definition": "Suma de valores dividida entre su cantidad. Puede ocultar extremos."
  },
  {
    "term": "Memoria de GPU / VRAM",
    "definition": "Memoria de vídeo necesaria para pesos del modelo y operaciones."
  },
  {
    "term": "Monte Carlo",
    "definition": "Técnica que usa muchas simulaciones con variación aleatoria para estudiar la distribución de resultados."
  },
  {
    "term": "Objetivo lexicográfico",
    "definition": "Optimización por niveles: primero se prioriza un objetivo; solo entre empates se mira el segundo, etc. En EcoDispatch Emergencias se prioriza gravedad cubierta → cantidad atendida → coste secundario."
  },
  {
    "term": "Optimización",
    "definition": "Buscar la mejor decisión según una función objetivo y restricciones definidas."
  },
  {
    "term": "P95 / percentil 95",
    "definition": "Umbral aproximado por debajo del cual se encuentra el 95 % de las latencias. La web muestra la **media de P95 por semilla**, no el P95 global agregado."
  },
  {
    "term": "Pareto / frente de Pareto",
    "definition": "Soluciones donde mejorar una métrica implica empeorar alguna otra; útil cuando compiten latencia, coste y cobertura."
  },
  {
    "term": "Phi / Φ / potencial",
    "definition": "En este laboratorio: media ponderada del mejor tiempo estimado para atender una petición futura representativa de cada modelo. No mide consciencia, energía física ni probabilidades."
  },
  {
    "term": "PPO",
    "definition": "Proximal Policy Optimization: método de aprendizaje por refuerzo para entrenar políticas. Es un candidato futuro para comparar, no está integrado en el simulador."
  },
  {
    "term": "Prefill",
    "definition": "Primera fase de inferencia en que un LLM procesa los tokens de entrada o contexto."
  },
  {
    "term": "Preregistro / preregistration",
    "definition": "Publicar un protocolo experimental antes de ver sus resultados de confirmación, para evitar seleccionar después hipótesis favorables."
  },
  {
    "term": "Prior / distribución previa",
    "definition": "Hipótesis fija sobre qué porcentaje de solicitudes futuras será de cada tipo. Aquí es la proporción pequeño/grande configurada."
  },
  {
    "term": "Recurso heterogéneo",
    "definition": "Conjunto de servidores con velocidades, memoria, compatibilidades o precios distintos."
  },
  {
    "term": "Regresión",
    "definition": "Empeoramiento observado de una métrica tras un cambio."
  },
  {
    "term": "Reproducibilidad",
    "definition": "Poder repetir exactamente un experimento con la misma versión, parámetros y semilla."
  },
  {
    "term": "Round Robin",
    "definition": "Repartir trabajos por turnos entre servidores compatibles, sin estimar costes futuros."
  },
  {
    "term": "Scheduler / planificador",
    "definition": "Componente que decide el orden y el destino de trabajos computacionales."
  },
  {
    "term": "Score / puntuación",
    "definition": "Valor numérico calculado para comparar asignaciones. EcoDispatch elige el score más bajo."
  },
  {
    "term": "Seed / semilla",
    "definition": "Número inicial que hace reproducible la generación aleatoria dentro de un mismo motor."
  },
  {
    "term": "Sensibilidad de λ",
    "definition": "Estudio de cómo cambian las métricas al variar λ manteniendo lo demás constante."
  },
  {
    "term": "Service time / duración de servicio",
    "definition": "Tiempo que ocupa una GPU procesando una petición (sin contar espera previa)."
  },
  {
    "term": "SLA",
    "definition": "Service Level Agreement: objetivo de servicio. Aquí cada solicitud tiene un límite sintético de latencia, de 25 o 120 s."
  },
  {
    "term": "Sobreajuste / overfitting",
    "definition": "Elegir parámetros que funcionan muy bien en los experimentos usados para ajustarlos pero que no generalizan a nuevas cargas."
  },
  {
    "term": "Throughput",
    "definition": "Trabajos terminados por segundo; en el laboratorio se calcula sobre todo el intervalo hasta vaciar la cola."
  },
  {
    "term": "Token",
    "definition": "Unidad de texto que procesa o genera un LLM; no equivale necesariamente a una palabra."
  },
  {
    "term": "Tokens/s",
    "definition": "Velocidad de procesamiento o generación expresada en tokens por segundo; en la simulación es una velocidad simplificada."
  },
  {
    "term": "Trade-off / compromiso",
    "definition": "Mejorar un objetivo a cambio de empeorar otro, por ejemplo una petición pequeña más lenta para preservar GPU para modelos grandes."
  },
  {
    "term": "Traza / trace",
    "definition": "Registro ordenado de las peticiones y sus características; permite comparar políticas con idéntica carga."
  },
  {
    "term": "Utilización",
    "definition": "Fracción del tiempo simulado durante el cual los recursos están procesando trabajos."
  },
  {
    "term": "VRAM",
    "definition": "Video RAM: memoria de las GPU, especialmente importante para determinar qué modelos caben en ellas."
  }
];
