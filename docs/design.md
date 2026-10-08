# Design notes — v0.1

## Problem and limits

Route online LLM inference requests across heterogeneous workers with incompatible model/VRAM requirements. The agent must act **without seeing future arrivals**. The simulation uses a fixed hardware pool; each worker executes jobs sequentially and non-preemptively in one FIFO queue.

A job arriving at time `t` assigned to worker `s` starts at `max(t, available[s])` and finishes after a synthetic service duration. `available[s]` is the committed completion time for all previous jobs routed to that worker.

Service duration:

```
service(s, q) = fixed_overhead + q.tokens / (s.tokens_per_sec * model_speed_factor[q.model])
latency(s, q) = max(0, available[s]-arrival[q]) + service(s, q)
```

The numbers do not correspond to a particular GPU or LLM model. Model memory support is a simplified static feasibility constraint, not an accurate model of batching/KV cache.

## Scheduler

For an eligible worker `s` and current request `q`:

```
score(s, q) = latency(s, q)
            + lambda * (Phi(after assigning q to s) - Phi(before))
            + cost_weight * active_compute_cost(s, q)

Phi(state, t) =
  sum_{model in {small, large}} prior[model]
    * min_{compatible worker s} (
        max(0, available[s]-t) + service(s, reference_request[model])
      )
```

`Phi` estimates how long a *representative hypothetical* future request would take to complete. It uses a fixed model-class mix prior and nominal token lengths, rather than peeking at the held-out event stream. It does not estimate future interarrival distributions, optimization over batches or real-time memory pressure.

`lambda=0` is a shortest-predicted-response greedy policy when `cost_weight=0`. Round Robin and Least Loaded are separate controls. The `least_loaded` control uses waiting time (committed backlog) rather than raw number of queued jobs.

A high `lambda` may protect scarce large-model GPUs, but can also increase latency, cause unfairness or worsen misses. No monotonic benefit is assumed.

## Mapping from EcoDispatch and mathematical claims

EcoDispatch original hierarchy uses weighted k-median placement, constrained matching, and an online future-coverage potential. The current v0.1 Compute **only implements the online potential heuristic**, with basic per-request queueing; it does not yet implement a global batch matcher or replica placement.

The published OpenAI mathematical k-server result inspired the original study. This **adaptation is not a proof-backed implementation** of that result; FIFO service times, model incompatibility and changing backlogs violate assumptions of simpler metric models.

## Observability

For each completed task, record request ID, model, assigned worker, arrival, start, finish, wait, response latency and whether the **response** exceeded its relative SLA. Reports include per-class P95 and missed-SLA rates to detect whether total averages conceal poor large-model service.

Cost uses **busy processing time** multiplied by an invented hourly price. Utilization is busy time / (worker count * trace makespan). No inference is made about real cloud bills or power.

## Future production work

Real systems need dynamic batching, token-by-token decode, KV memory, model loading, preemption, heterogeneous concurrency, health checks, cold starts, autoscaling, admission control, fairness and safe fallback when workers fail. Real server traces and GPU instrumentation are required before deployment or a claim of superiority.
