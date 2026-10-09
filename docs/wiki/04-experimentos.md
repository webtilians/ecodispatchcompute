# 04 — Cómo saber si de verdad mejora

[← Simulador](03-simulador.md) · [Siguiente: glosario →](glosario.md)

## Paso 1: formular una hipótesis falsable

No basta con decir «el algoritmo es más inteligente». Una hipótesis comprobable sería:

> Bajo una carga elevada con mezcla de solicitudes pequeñas y grandes, el algoritmo con λ = 0,6 reducirá el porcentaje de trabajos fuera de SLA frente a Least Loaded, sin aumentar demasiado la latencia P95 de los modelos pequeños.

Puede salir falsa. Eso también es información útil.

## Paso 2: comparar los mismos trabajos

Si Round Robin recibe unas solicitudes y EcoDispatch otras, no sabremos si la diferencia procede del algoritmo o de la carga.

Por eso el laboratorio usa una **semilla**. Todas las políticas ven exactamente la **misma traza** en cada repetición. Son **comparaciones pareadas**.

Al cambiar la semilla se genera otro escenario aleatorio, pero repetir una misma semilla en el motor web produce el mismo resultado.

**Precaución:** el motor Python y JavaScript tienen distintos generadores pseudoaleatorios. Semilla 7 en Python no produce las mismas solicitudes que semilla 7 en la web.

## Paso 3: leer las métricas correctas

### Latencia media

Promedio del tiempo desde la llegada hasta terminar cada petición. Puede esconder algunos trabajos extremadamente lentos.

### P95 (percentil 95)

Es un punto de la distribución de latencias: aproximadamente el 95 % de los trabajos tiene latencia menor o igual a él, según la convención de percentiles utilizada. El 5 % restante tarda más.

En la web se calcula el P95 **de cada semilla** y luego se muestra la **media de esos P95**. Eso NO es el P95 conjunto de todas las peticiones de todas las semillas.

### SLA incumplido

Proporción de peticiones cuya latencia supera estrictamente su SLA individual. Un menor número suele ser mejor, pero habría que considerar prioridades, fairness y coste.

### Utilización

Porcentaje del intervalo simulado durante el que una GPU estuvo procesando trabajos. Una utilización cercana al 100 % puede ir acompañada de colas y mala latencia.

### Throughput

Número de peticiones procesadas dividido por el tiempo transcurrido hasta acabar todo el trabajo. Aquí incluye el **vaciado final de la cola**, por lo que no representa necesariamente la tasa de llegadas durante el periodo.

### Coste activo

Estimación inventada usando el coste por hora activa de cada GPU y su tiempo de procesamiento. No mide electricidad real ni facturación cloud.

## Paso 4: variar un parámetro por vez

Para estudiar λ:

1. Mantén semillas, número de trabajos, tasa de llegadas y composición constantes.
2. Prueba λ = 0, 0,2, 0,6, 1 y 3.
3. Mira SLA, P95 total, P95 del modelo grande, P95 del pequeño y coste.
4. Repite con escenarios de baja carga, alta carga y predominio de modelos grandes.

La gráfica de sensibilidad ya realiza el barrido de λ usando las mismas trazas. Puede haber **trade-offs**, es decir, que una métrica mejore mientras otra empeora.

## Paso 5: separar exploración y confirmación

**Experimento exploratorio:** sirve para encontrar comportamientos prometedores, fallos y parámetros.

**Holdout / prueba de confirmación:** fija la hipótesis y los parámetros antes de evaluar sobre **nuevas semillas o trazas** nunca utilizadas durante el ajuste.

Sin holdout independiente, comparar muchos λ y elegir después el que mejor salió suele producir estimaciones demasiado optimistas.

## Paso 6: ir a datos reales

Antes de afirmar «ahorra GPU» o «reduce la latencia de un servicio LLM» hace falta:

- Medir servicio y memoria de modelos reales sobre hardware identificado.
- Repetir las pruebas con trazas anonimizadas, heterogeneidad y fallos.
- Incluir comparadores fuertes, como menor finalización estimada y un planificador consciente de batches.
- Evaluar intervalos de incertidumbre, regresiones por tipo de modelo y coste operativo completo.

## Cómo interpretar un resultado negativo

Si EcoDispatch empeora SLA o P95, puede ser porque:

- La proporción futura de modelos grandes está mal representada.
- λ da excesivo valor a la reserva.
- La flota no tiene recursos realmente exclusivos.
- La carga es tan baja que reservar capacidad no ayuda.
- La heurística Φ no refleja bien la congestión real.

No debemos esconder esos casos: son parte de la investigación.

[Diccionario](glosario.md) · [Protocolo](../research-protocol.md)
