# Laboratorio web / v0.2

Interfaz en español, estática y sin backend en la carpeta web/. Funciona completamente en el navegador: las comparaciones se calculan en un Web Worker y los resultados se pueden guardar como JSON. No utiliza claves API ni servicios de inferencia.

## Uso local

Desde la raíz del proyecto:

    python -m http.server 8000 --directory web

Abrir http://localhost:8000 en un navegador moderno. Abrir index.html directamente con file:// no sirve para los Web Workers de tipo módulo; hace falta un servidor HTTP local.

## Publicación con GitHub Pages

1. Fusionar el PR de la web en master.
2. Entrar en Settings → Pages del repositorio.
3. Seleccionar GitHub Actions como fuente de publicación.
4. El workflow Deploy Compute Lab publicará la carpeta web/ cuando haya cambios en master; también puede ejecutarse manualmente desde Actions.
5. La dirección prevista, una vez publicado correctamente, es https://webtilians.github.io/ecodispatchcompute/.

La dirección anterior es un destino previsto, no una confirmación de despliegue.

## Tres algoritmos, mismo escenario

- Round Robin: turno circular entre GPU compatibles.
- Least Loaded: selecciona el recurso con menos espera ya comprometida.
- EcoDispatch: penaliza perder capacidad de respuesta para trabajos futuros hipotéticos, además de estimar la latencia de la petición actual.

Cada repetición genera llegadas Poisson y trabajos sintéticos. Las tres políticas y el barrido de λ reciben exactamente la misma secuencia dentro de cada semilla. Cada GPU atiende una petición a la vez y tiene una cola FIFO. Las clases de modelo small/large y todos los rendimientos, precios y presupuestos SLA son ficticios.

La métrica de coste energético no está modelada: el coste mostrado es coste monetario estimado por tiempo activo, no facturación cloud. El motor soporta ponderación de coste, pero la web la mantiene fijada a cero para aislar la penalización futura. El tiempo P95 representa latencia total hasta terminar, incluyendo cola.

## Alcance científico

El navegador transpone la estructura del motor Python, pero utiliza un generador pseudoaleatorio JavaScript diferente del de Python. El mismo número de semilla NO garantiza idénticas peticiones entre lenguajes. Repetir la misma configuración dentro de la web sí reproduce los resultados.

Los gráficos son descriptivos (medias entre semillas). No hay intervalos de confianza ni contraste preregistrado. Se muestran los malos resultados si EcoDispatch empeora, sin escoger de antemano un λ ganador. El experimento no demuestra mejoras de producción ni implementa literalmente las garantías de los resultados teóricos sobre k-server.

## Verificación

    node --test web/tests/simulator.test.mjs
    python -m unittest discover -s tests -v

Siguientes experimentos recomendados: baseline de finalización estimada, matching por lotes, memoria KV, interferencia entre modelos, datos reales anonimizados y comparativa PPO.