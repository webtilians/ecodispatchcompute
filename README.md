# EcoDispatch Compute

## v0.4 — Validation Lab

**[Abrir la validación sintética](https://webtilians.github.io/ecodispatchcompute/validation.html)** · [Protocolo fijado antes de evaluar](docs/validation-v0.4-protocol.md)

Batería de **cuatro cargas sintéticas**, tres estrategias básicas (Round Robin, Least Loaded, EcoDispatch) y una ablación de cinco valores de λ. El análisis primario está fijado: **EcoDispatch λ=0,6 vs λ=0 en saturación**, con 60 semillas reservadas. Se informa la diferencia media de incumplimiento SLA, un intervalo bootstrap pareado del 95 % sobre unidades de simulación, resultados por modelo, comparaciones secundarias y el número de semillas favorables/desfavorables. No afirmamos mejoras de GPUs reales ni garantías heredadas de artículos teóricos.

```bash
node scripts/validate-v0.4.mjs --stage exploration --scenario stressed --output results/exploration.json
node scripts/validate-v0.4.mjs --stage reserved --scenario stressed --output results/reserved.json
node --test web/tests/*.test.mjs
```

Todos los resultados se generan localmente, sin backend ni datos externos. **No seleccionar λ con las semillas reservadas y luego volver a llamarlo confirmación independiente.**

---


## Wiki de aprendizaje (en español)

📖 **[Aprender con la wiki interactiva](https://webtilians.github.io/ecodispatchcompute/wiki.html)** — glosario con 76 términos y seis lecciones sobre matemáticas, LLM, algoritmos, métricas, reproducibilidad y límites del experimento.

- [Índice de capítulos Markdown](docs/wiki/README.md)
- [Matemáticas paso a paso](docs/wiki/02-matematicas.md)
- [Diccionario A–Z](docs/wiki/glosario.md)
- [Cómo evaluar los resultados](docs/wiki/04-experimentos.md)

La wiki sigue el código versionado. Se publica en GitHub Pages al fusionar esta documentación en master.


## v0.2 — laboratorio web interactivo

**[Abrir el laboratorio (cuando GitHub Pages esté activado)](https://webtilians.github.io/ecodispatchcompute/)**

Interfaz estática en español para simular cargas LLM y comparar Round Robin, Least Loaded y EcoDispatch. Permite cambiar llegadas/segundo, tamaño de la carga, proporción de LLM grandes, peso de capacidad futura (λ), semillas y repeticiones. Incluye gráficos de P95 y SLA, barrido de sensibilidad λ, utilización por GPU, desglose por tamaño de modelo y exportación JSON. No usa un backend ni envía peticiones a GPU reales.

**Para usarlo localmente:**

```bash
python -m http.server 8000 --directory web
# abrir http://localhost:8000
```

**Para verificar la simulación web:**

```bash
node --test web/tests/simulator.test.mjs
```

La web utiliza semillas reproducibles dentro de su motor JavaScript, pero no comparte la misma secuencia pseudoaleatoria del simulador Python. Los resultados son **exploratorios y sintéticos**; las diferencias de rendimiento no implican mejoras en sistemas reales. Publicación: GitHub Pages desde la carpeta web/ mediante el workflow incluido, después de fusionar el PR y activar Settings → Pages → GitHub Actions.

[Diseño y guía del laboratorio](docs/web-lab.md)

---


**An experimental, reproducible scheduler for heterogeneous LLM inference resources.**

EcoDispatch Compute explores whether preserving *future service capability* helps route today's requests among scarce compute resources. It adapts the **architectural idea** of [EcoDispatch](https://github.com/webtilians/ecodispatch), not its real-world wildfire assumptions or any theoretical competitive guarantees.

> Research prototype. All workload arrivals, tokens, hardware throughput, memory, pricing and response-time budgets in v0.1 are **synthetic**. No claim of better production performance, security efficacy, lower energy use or real GPU efficiency.

## v0.1: a runnable simulator

An event-time FIFO simulation compares **three routing policies on the same arrival trace and hardware**:

| Policy | Routing decision |
| --- | --- |
| Round Robin | Cycle through compatible workers |
| Least Loaded | Pick compatible worker with shortest committed waiting time |
| EcoDispatch | Minimize immediate predicted response time + weighted loss of future capability |

Each server supports a set of LLM classes (`small` / `large`), has minimum VRAM compatibility, model-adjusted token throughput, and an estimated active-hour cost. Requests arrive over time and occupy their chosen worker until completed. We model one FIFO queue per worker; there is no preemption or load migration.

### Quick start

Requires Python **3.11+**. Runtime and tests use only the Python standard library.

```bash
# from repository root
python -m pip install -e .
python -m ecodispatch_compute --requests 1000 --seeds 3 --seed 7
python -m ecodispatch_compute --requests 1000 --seeds 3 --json results/benchmark.json
python -m unittest discover -s tests -v
```

Alternative, without installing: on Linux/macOS run `PYTHONPATH=src python -m ecodispatch_compute`; on PowerShell use `$env:PYTHONPATH="src"; python -m ecodispatch_compute`.

### Example experiments

```bash
# Low, normal and overload arrival rates (requests/s)
python -m ecodispatch_compute --requests 1000 --seeds 10 --arrival-rate 0.12 --json results/low.json
python -m ecodispatch_compute --requests 1000 --seeds 10 --arrival-rate 0.22 --json results/normal.json
python -m ecodispatch_compute --requests 1000 --seeds 10 --arrival-rate 0.35 --json results/high.json

# A controlled ablation of the future-capacity term
python -m ecodispatch_compute --requests 1000 --seeds 10 --lambda-future 0
python -m ecodispatch_compute --requests 1000 --seeds 10 --lambda-future 0.6
```

The `--large-share` argument specifies both synthetic arrival mix and the **fixed prior** used by the potential; the policy never reads upcoming requests. See [research protocol](docs/research-protocol.md) for limitations and comparison rules.

### Outputs and interpretation

Reports contain mean and P95 end-to-end latency, SLA miss rate, served throughput, estimated **active** compute-hours cost, worker utilization and separate results for small/large requests. A cost here is *not* a cloud invoice (idle capacity, transfers, reservations and scaling are not billed). The simulation processes **all** requests eventually, so `throughput` and makespan include backlog draining.

The CLI averages each metric across separately seeded paired workloads. It does not report inferential confidence intervals, significance or any "winner". Avoid choosing a favorable seed or tuning lambda on evaluation workloads.

## How it maps to EcoDispatch

- **Brigades → workers/GPUs** with capability and availability constraints.
- **Incidents → inference requests** with model, token count and an SLA.
- **Travel + service → queue time + processing time**.
- **Risk-weighted future coverage → fixed-prior time to answer representative future queries**.
- **Lambda → trade-off** between current latency and loss of future capacity.

The v0.1 online policy is an application-specific heuristic. It is **not** an implementation of the theoretical k-server algorithm from the OpenAI mathematics results. Neither this scheduler nor the original EcoDispatch inherits that algorithm's mathematical guarantees. See [design](docs/design.md).

## Roadmap

1. **v0.1 (this PR):** deterministic workload simulator, heterogeneous resources, three baselines, CLI, reproducibility tests and CI.
2. **v0.2:** batched matching and bounded/global queues; compare against shortest predicted completion (a stronger baseline).
3. **v0.3:** import anonymized real LLM traces and calibrate service times from hardware measurements; avoid prompt/PII ingestion.
4. **v0.4:** add energy/cost constraints, memory residency, prefill/decode and latency/quality trade-offs.
5. **v0.5:** compare the mathematical controller with a trained PPO scheduler on held-out scenarios.

## Attribution

Independent research prototype inspired by [EcoDispatch](https://github.com/webtilians/ecodispatch). It is not affiliated with, sponsored by or endorsed by OpenAI.
