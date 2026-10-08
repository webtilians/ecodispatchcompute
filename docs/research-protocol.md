# Exploratory benchmark protocol — compute v0.1

This file fixes an **exploratory plan**, not a pre-registration or independent confirmation. Scenarios and hyperparameters must be reported even if EcoDispatch performs worse.

## Baseline scenarios

Use the four synthetic worker specs committed with the simulator. Each scenario runs 10 paired seeds (7 through 16), 1,000 requests per seed. Every policy receives the **same ordered request trace** for that seed:

- Light load: arrival rate 0.12 requests/s, large share 0.20.
- Nominal load: 0.22 requests/s, large share 0.20.
- High load: 0.35 requests/s, large share 0.20.
- Large-heavy mix: 0.22 requests/s, large share 0.50.

Compare Round Robin, Least Loaded and EcoDispatch `lambda` in {0, 0.2, 0.6, 1, 3}. Keep active cost weighting at 0 in this first comparison. The model share is an exogenous fixed prior equal to the configured scenario share (not inferred by reading future requests).

No arbitrary single "best lambda" may be selected after seeing these scenarios and then marketed as a confirmed result. A separate preregistered holdout with independent seeds/traces would be required for confirmation.

## Outcomes

Primary descriptive metric: fraction of requests missing their relative end-to-end latency SLA. Always report raw paired per-seed differences against Least Loaded, and small-/large-model stratification.

Secondary descriptive metrics: end-to-end mean and P95 latency, active processing cost, makespan, throughput, utilization and allocation distribution. Explore worst-case model-specific outcomes and overload backlog.

Known limitations: stochastic Poisson arrivals, invented hardware/token models, deterministic execution durations, FIFO non-preemptive per-worker queues, no failures, no batching, and no real-world latency/cost calibration. Result differences are valid only **within this simulation**.

## Reproduction

```bash
python -m ecodispatch_compute --requests 1000 --seeds 10 --seed 7 --arrival-rate 0.22 --large-share 0.20 --lambda-future 0.6 --json results/nominal.json
```

Repeat for each scenario and lambda with the same seed range. The JSON includes every seed's metrics, the fixed experiment configuration and an aggregate across seeds.

Only after examining the full comparison should a new test design be frozen and new independent data collected.
