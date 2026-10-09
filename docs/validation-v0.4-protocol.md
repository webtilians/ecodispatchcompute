# EcoDispatch Compute v0.4 — fixed validation protocol

**Design frozen before examining v0.4 evaluation outcomes.** This is a controlled simulation experiment, **not evidence about a real GPU service**. This document must not be retroactively edited to turn an unfavorable outcome into a positive one.

## Scientific question

Does penalizing loss of future modeled capacity (`λ = 0.6`) reduce the percentage of jobs violating end-to-end SLA compared with *the same routing algorithm* at `λ = 0`, under a specified high-load heterogeneous GPU scenario?

The reference comparison **isolates the future-capacity term**. Round Robin and Least Loaded are additional external baselines, not used to change the primary question.

## Fixed simulation and scenarios

Keep the code and numerical assumptions of the existing `web/simulator.mjs` engine unchanged. Four fictitious workers, synthetic Poisson arrivals, a single FIFO queue per worker, a fixed service-time model, and two artificial LLM sizes. `costWeight = 0`.

Every paired policy sees precisely the same 1,000-request workload for a given scenario and seed. **No policy sees future requests.** For each scenario, `largeShare` is both the synthetic job mix and the fixed exogenous prior fed to the potential function.

| ID | Name | Arrivals/s | Large share | Interpretation |
| --- | --- | --- | --- | --- |
| light | Baja carga | 0.12 | 0.20 | Resources often idle |
| nominal | Carga nominal | 0.22 | 0.20 | Everyday synthetic mix |
| stressed | Saturación | 0.35 | 0.20 | Backlogs likely |
| large-heavy | LLM grandes | 0.22 | 0.50 | Scarce compatible GPU |

## Fixed policy family

- `round_robin`
- `least_loaded`
- `ecodispatch` with `lambdaFuture` in `[0, 0.2, 0.6, 1, 3]`

For the **primary** comparison, `ecodispatch(λ=0.6)` versus `ecodispatch(λ=0)`, within scenario `stressed`.

## Seed partition

- **Exploratory:** 30 paired seeds, integers **7–36** inclusive.
- **Reserved evaluation:** 60 paired seeds, integers **40001–40060** inclusive.

The separation prevents retesting on exactly the same traces during development. These are distinct deterministic PRNG seeds, not independent real-world datasets.

**No parameter may be chosen after seeing the reserved evaluation and then presented as independently confirmed on those same seeds.** All other lambda/scenario comparisons are descriptive. If implementation changes follow inspecting those results, treat the changed implementation as exploratory and design new held-out seeds.

## Outcomes

**Primary:** average across paired evaluation seeds of

```Δ_miss = miss_rate[EcoDispatch λ=0.6] − miss_rate[EcoDispatch λ=0]
```

for `stressed`. Negative values favor λ=0.6. A descriptive paired percentile-bootstrap **95% confidence interval** for the seed-level mean Δ is computed using **2,000 resamples**, a fixed bootstrap seed **93041** and linear quantile interpolation. An observed negative difference with CI entirely below zero meets the **internal simulation evidence criterion**, but does NOT prove superiority for real hardware or unrelated workloads.

**Secondary, not grounds for changing the primary claim:**
- mean latency and average seed-wise P95 difference;
- failure rate and P95 separately for small and large models;
- aggregate busy-hour monetary proxy and utilization;
- win/tie/loss counts across seeds;
- the other three scenarios and all five lambdas;
- differences versus Round Robin and Least Loaded.

The metric `P95` is the **mean of each seed's P95**, not the pooled-request P95. The bootstrap treats a whole seed/run as a unit, not individual requests; this avoids pseudoreplication from highly correlated jobs in one queue. These CIs do not correct for exploration across many scenarios/policies and assume simulated seeds are a meaningful unit of replication.

## Reproduction and integrity

The `web/validation.mjs` implementation calls the existing simulator with this fixed configuration; the browser runs it in a Web Worker and a CLI runner uses precisely the same library. No external telemetry, keys or data. Comparison and bootstrap RNG streams use fixed different seeds from workload generation.

The reference protocol, including seed families and λ values, is versioned with Git, **before evaluation outputs**. This is internal simulator validation, not evidence of theorem inheritance (k-server, k-median, matching), cloud savings or security claims.

## Limitations

Synthetic independent arrivals, fixed model sizes, static eligibility, deterministic token throughput, FIFO non-preemptive per-server scheduling, static VRAM and no batching, prefill/decode, KV cache, noise, outages, autoscaling, queue admission or quality constraints. The best algorithm for this toy queue model may differ sharply from best practice in production inference stacks.
