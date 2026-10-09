# 06 — Preguntas frecuentes

[← Glosario](glosario.md) · [Portada](README.md)

## ¿EcoDispatch es una IA?

El motor actual **no** es un modelo de aprendizaje automático. Es un **algoritmo de decisión** basado en una función matemática diseñada a mano. Un LLM produce o consume las peticiones; EcoDispatch decide qué GPU debería procesarlas.

## ¿Usa las matemáticas nuevas de OpenAI?

El proyecto original se inspiró en resultados públicos relacionados con **k-median, matching y k-server**. La implementación actual de Compute es una **adaptación heurística propia**: no ejecuta directamente los algoritmos demostrados en esos trabajos ni hereda sus garantías teóricas. No deberíamos presentar su eficacia como una consecuencia probada de dichos artículos.

## ¿Aprende solo la λ?

No. En el laboratorio λ es un control manual. Ajustarlo con métodos automáticos sería posible, pero necesitaríamos separar datos de entrenamiento, validación y confirmación para evitar sobreajuste.

## ¿Qué pasa si llegan muchísimos trabajos?

Las colas crecen. El simulador acepta y acaba procesando todo, aunque algunos trabajos incumplan gravemente sus SLA. Un sistema real necesitaría límites de cola, rechazo/admisión, escalado y políticas de prioridad.

## ¿Por qué podría funcionar peor que Least Loaded?

Porque reservar una GPU potente por una futura petición que nunca llega puede perjudicar a peticiones presentes. También puede ser excesivo el peso de λ o inexacta la hipótesis de demanda futura.

## ¿Por qué no se puede decir que ya «mejora servidores»?

Porque todavía no hay experimentos independientes en un sistema de inferencia real con cargas representativas. Lo que podemos comparar son **resultados del simulador**, no reducciones garantizadas de latencia o de dinero en producción.

## ¿Qué necesitaríamos para conectarlo a GPU reales?

Un sistema de observabilidad y colas con adaptadores a runtimes reales, telemetría de VRAM/KV y tokens, comprobaciones de salud, políticas de seguridad, cancelación, recuperación de fallos, supervisión y validación progresiva. La web actual es un entorno didáctico aislado.

## ¿Y la ciberseguridad?

Los mismos principios de asignación podrían ayudar a **priorizar y repartir trabajos de análisis de alertas** entre recursos defensivos compatibles. Eso no significa que detecte ataques ni que ofrezca garantías de seguridad. Es otro dominio a modelar y verificar.

## ¿Qué relación tiene con PPO?

PPO es un algoritmo de aprendizaje por refuerzo. Podemos entrenar un agente para asignar trabajos y compararlo con EcoDispatch sobre escenarios comunes que **no se hayan usado para entrenarlo**. No significa que PPO vaya a ganar o perder; es una hipótesis experimental.

## ¿Qué es lo primero que debería recordar?

**No estamos haciendo una bola de cristal. Estamos calculando las consecuencias inmediatas de una decisión y una estimación imperfecta de cuánto dificulta las próximas decisiones.**

[Leer las matemáticas](02-matematicas.md) · [Volver al laboratorio](https://webtilians.github.io/ecodispatchcompute/)
