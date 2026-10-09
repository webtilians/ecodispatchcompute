# 02 — Las matemáticas, sin saltos

[← Problema](01-introduccion.md) · [Siguiente: el simulador →](03-simulador.md)

## 1. Elegir el menor coste

Para un servidor compatible s y una petición q, el motor calcula una **puntuación** (score). Gana la alternativa con la puntuación menor.

En la versión actual:

~~~text
score(s,q) =
    T(s,q)
  + λ × [ Φ(estado_después) - Φ(estado_antes) ]
  + peso_coste × coste_activo(s,q)
~~~

En la **web** el peso del coste monetario está fijado a cero. Por tanto, la comparación visible aísla los primeros dos términos.

### T: latencia de la petición presente

~~~text
T(s,q) = espera(s,q) + servicio(s,q)
espera(s,q) = max(0, disponible_desde[s] - llegada[q])
servicio(s,q) = 1,5 + tokens[q] / (velocidad[s] × factor_modelo[q])
~~~

La constante 1,5 s y los factores son **ficticios**, elegidos para que podamos experimentar. En un sistema real habría que medirlos.

### Φ: potencial de capacidad futura

Φ (letra griega «fi») es un resumen de lo rápido que el sistema podría responder **a una petición futura representativa**.

~~~text
Φ(estado, t) =
   (1 - p_grande) × mejor_tiempo_futuro_pequeño
 + p_grande       × mejor_tiempo_futuro_grande
~~~

Para cada tipo de modelo, «mejor tiempo futuro» es el menor valor entre los servidores compatibles de:

~~~text
espera_hasta_liberarse(s) + tiempo_modelo_representativo(s)
~~~

El motor utiliza solicitudes representativas de **600 tokens para el modelo pequeño** y **1600 tokens para el grande**. Las proporciones de demanda se configuran externamente: no se calculan mirando la lista de peticiones futuras.

Φ tiene unidades de **segundos esperados de respuesta**, bajo ese modelo simplificado; no es una probabilidad, una predicción de tráfico ni memoria VRAM libre.

### ΔΦ: el daño marginal de una decisión

~~~text
ΔΦ = Φ después - Φ antes
~~~

- Si ΔΦ = 0, esa asignación no empeora nuestra aproximación del tiempo de respuesta futuro.
- Si ΔΦ = +5 segundos, la asignación eleva en 5 s el potencial futuro.
- La política penaliza ese deterioro en proporción a λ.

En el modelo actual, comprometer más trabajo no mejora por sí mismo los tiempos de disponibilidad, así que normalmente ΔΦ es no negativo.

### λ: cuánto priorizamos conservar futuro

| λ | Interpretación |
| --- | --- |
| 0 | Se minimiza solo la latencia estimada del trabajo actual (con coste monetario desactivado) |
| 0,2 | Penalización futura relativamente pequeña |
| 0,6 | Política experimental de referencia de la interfaz |
| 1 | Un segundo de ΔΦ cuenta como un segundo adicional en la puntuación |
| 3 | Se da un peso alto a conservar recursos |

λ **no es una probabilidad**, ni un parámetro que se aprenda automáticamente, ni una garantía de mejora. Aquí es un **hiperparámetro definido por el investigador**. Dado que T y Φ se miden en segundos, λ es adimensional.

## 2. ¿De dónde vienen las ideas?

EcoDispatch Emergencias se diseñó alrededor de tres familias de problemas de optimización:

**k-median (localización de instalaciones).** Si pudiéramos elegir k ubicaciones de servidores, centros de datos o réplicas, buscaríamos minimizar el coste de atender una demanda distribuida. En el proyecto original se usa para posicionar recursos antes de que ocurran incidentes.

**Matching (emparejamiento).** Si llegan varias solicitudes simultáneamente, necesitamos decidir qué servidor atiende cada una cumpliendo compatibilidad y capacidad. Un problema de matching puede modelar la asignación sin duplicar recursos.

**k-server (decisiones online).** Es una familia teórica de problemas en que k servidores atienden solicitudes secuenciales, intentando minimizar determinados costes. Inspiró la capa de decisiones online en EcoDispatch original.

**Importante:** EcoDispatch Compute v0.2 **no implementa k-median ni matching por lotes**, y tampoco implementa literalmente el algoritmo teórico de k-server. Implementa una **heurística propia de potencial futuro** adaptada a colas FIFO y modelos LLM.

Los resultados matemáticos publicados sobre k-server, k-median o matching no demuestran que esta heurística sea óptima.

## 3. ¿Por qué una heurística y no un óptimo perfecto?

Para conocer la mejor asignación global habría que conocer todas las futuras llegadas y sus duraciones. En un servicio online eso no es posible.

Un **óptimo offline** sí puede calcularse en problemas pequeños teniendo toda la secuencia por adelantado, pero solo sirve para comparar, no para tomar decisiones reales sin conocer el futuro.

La heurística intenta equilibrar latencia inmediata con una aproximación del coste de oportunidad. La precisión de esa aproximación es precisamente lo que hay que validar.

## 4. No mezclar estos conceptos

- **Mejor score** significa que la política ha seleccionado su alternativa favorita, no que vaya a mejorar el P95 de toda la jornada.
- **λ mayor** significa más peso para el potencial, no que el resultado vaya a ser mejor.
- **Menos latencia media** no implica menos incumplimientos SLA.
- **Más utilización** no significa automáticamente más eficiencia ni menos gasto.

[Consultar el código](../../web/simulator.mjs) · [Diccionario](glosario.md)
