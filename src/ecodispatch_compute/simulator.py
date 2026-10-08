"""Deterministic, event-time LLM request routing benchmark.

All servers process one request at a time in FIFO order. A routing decision
uses only the current request, committed queue finish times, hardware metadata
and a fixed prior about *future* demand; it never reads future requests.
"""
from __future__ import annotations

from dataclasses import dataclass
from math import ceil, floor, isfinite
from random import Random
from typing import Sequence

MODEL_VRAM_GB = {"small": 8.0, "large": 20.0}
MODEL_SPEED_FACTOR = {"small": 1.0, "large": 0.45}
REFERENCE_TOKENS = {"small": 600, "large": 1600}
POLICIES = ("round_robin", "least_loaded", "ecodispatch")


@dataclass(frozen=True)
class Worker:
    name: str
    vram_gb: float
    tokens_per_second: float
    cost_usd_per_hour: float
    models: tuple[str, ...]


@dataclass(frozen=True)
class Request:
    id: int
    arrival_s: float
    model: str
    tokens: int
    sla_s: float


@dataclass(frozen=True)
class Assignment:
    request_id: int
    model: str
    server: str
    arrival_s: float
    start_s: float
    finish_s: float
    wait_s: float
    latency_s: float
    sla_s: float

    @property
    def missed_sla(self) -> bool:
        return self.latency_s > self.sla_s


@dataclass(frozen=True)
class Simulation:
    policy: str
    assignments: tuple[Assignment, ...]
    busy_seconds: dict[str, float]
    cost_usd: float
    start_s: float
    finish_s: float

    def metrics(self) -> dict:
        latencies = [job.latency_s for job in self.assignments]
        window = max(0.0, self.finish_s - self.start_s)
        n = len(latencies)
        by_model = {}
        for model in MODEL_VRAM_GB:
            jobs = [job for job in self.assignments if job.model == model]
            if jobs:
                by_model[model] = {
                    "requests": len(jobs),
                    "p95_latency_s": round(percentile([j.latency_s for j in jobs], 0.95), 4),
                    "sla_miss_rate": round(sum(j.missed_sla for j in jobs) / len(jobs), 6),
                }

        return {
            "requests": n,
            "mean_latency_s": round(sum(latencies) / n, 4) if n else 0.0,
            "p95_latency_s": round(percentile(latencies, 0.95), 4),
            "sla_miss_rate": round(sum(j.missed_sla for j in self.assignments) / n, 6) if n else 0.0,
            "throughput_rps": round(n / window, 6) if window else 0.0,
            "active_compute_cost_usd": round(self.cost_usd, 6),
            "makespan_s": round(window, 4),
            "mean_worker_utilization": round(
                sum(self.busy_seconds.values()) / (len(self.busy_seconds) * window), 6
            ) if window and self.busy_seconds else 0.0,
            "by_model": by_model,
        }


def percentile(values: Sequence[float], fraction: float) -> float:
    if not values:
        return 0.0
    if not (0.0 <= fraction <= 1.0):
        raise ValueError("fraction must be between zero and one")
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lo, hi = floor(position), ceil(position)
    return ordered[lo] + (ordered[hi] - ordered[lo]) * (position - lo)


def default_workers() -> tuple[Worker, ...]:
    """A heterogeneous *synthetic* compute cluster; not measured GPU specs."""
    return (
        Worker("gpu-a", 24, 145, 1.50, ("small", "large")),
        Worker("gpu-b", 12, 115, 0.65, ("small",)),
        Worker("gpu-c", 24, 100, 1.05, ("small", "large")),
        Worker("gpu-d", 16, 95, 0.70, ("small",)),
    )


def eligible(worker: Worker, model: str) -> bool:
    return model in worker.models and worker.vram_gb >= MODEL_VRAM_GB[model]


def processing_seconds(worker: Worker, model: str, tokens: int) -> float:
    """Simplified service model: fixed overhead + model-adjusted token throughput."""
    return 1.5 + tokens / (worker.tokens_per_second * MODEL_SPEED_FACTOR[model])


def generate_workload(
    count: int = 1000,
    seed: int = 7,
    arrival_rate: float = 0.22,
    large_fraction: float = 0.20,
) -> tuple[Request, ...]:
    if count < 1 or not isfinite(arrival_rate) or arrival_rate <= 0:
        raise ValueError("count must be positive and arrival_rate must be positive")
    if not isfinite(large_fraction) or not 0 <= large_fraction <= 1:
        raise ValueError("large_fraction must be in [0, 1]")
    rng = Random(seed)
    timestamp = 0.0
    requests = []
    for index in range(count):
        timestamp += rng.expovariate(arrival_rate)
        model = "large" if rng.random() < large_fraction else "small"
        tokens = rng.randint(900, 2400) if model == "large" else rng.randint(300, 900)
        sla = 120.0 if model == "large" else 25.0
        requests.append(Request(index, timestamp, model, tokens, sla))
    return tuple(requests)


def _potential(
    workers: Sequence[Worker],
    availability: dict[str, float],
    now: float,
    future_large_fraction: float,
) -> float:
    """Expected completion time of two representative *hypothetical* future jobs.

    The fraction is an explicitly supplied prior, NOT the empirical fraction
    in the generated trace and NOT a prediction made using future arrivals.
    """
    total = 0.0
    for model, weight in (("small", 1.0 - future_large_fraction), ("large", future_large_fraction)):
        if weight <= 0:
            continue
        candidates = [
            max(0.0, availability[w.name] - now) + processing_seconds(w, model, REFERENCE_TOKENS[model])
            for w in workers if eligible(w, model)
        ]
        if not candidates:
            raise ValueError("No worker can serve future model " + model)
        total += weight * min(candidates)
    return total


def simulate(
    workers: Sequence[Worker],
    requests: Sequence[Request],
    policy: str,
    *,
    lambda_future: float = 0.6,
    future_large_fraction: float = 0.20,
    cost_weight_seconds_per_usd: float = 0.0,
) -> Simulation:
    if policy not in POLICIES:
        raise ValueError("Unknown policy: " + policy)
    if not workers or len({w.name for w in workers}) != len(workers):
        raise ValueError("Worker names must be unique and the cluster nonempty")
    for w in workers:
        if w.vram_gb <= 0 or w.tokens_per_second <= 0 or w.cost_usd_per_hour < 0:
            raise ValueError("Worker specifications must be positive (cost may be zero)")
        if any(model not in MODEL_VRAM_GB for model in w.models):
            raise ValueError("Unknown model in worker specification")
    if not isfinite(lambda_future) or lambda_future < 0:
        raise ValueError("lambda_future must be finite and nonnegative")
    if not isfinite(cost_weight_seconds_per_usd) or cost_weight_seconds_per_usd < 0:
        raise ValueError("cost_weight_seconds_per_usd must be finite and nonnegative")
    if not isfinite(future_large_fraction) or not 0 <= future_large_fraction <= 1:
        raise ValueError("future_large_fraction must be in [0, 1]")

    availability = {w.name: 0.0 for w in workers}
    busy = {w.name: 0.0 for w in workers}
    assignments: list[Assignment] = []
    previous_arrival = float("-inf")
    seen_ids: set[int] = set()
    rr_cursor = 0
    cost = 0.0

    for request in requests:
        if request.id in seen_ids:
            raise ValueError("Request IDs must be unique")
        seen_ids.add(request.id)
        if (
            request.model not in MODEL_VRAM_GB
            or not isfinite(request.arrival_s)
            or request.arrival_s < previous_arrival
            or request.tokens <= 0
            or not isfinite(request.sla_s)
            or request.sla_s <= 0
        ):
            raise ValueError("Requests must be chronologically ordered, valid and have positive SLAs")
        previous_arrival = request.arrival_s
        options = [w for w in workers if eligible(w, request.model)]
        if not options:
            raise ValueError("No eligible worker for model " + request.model)

        now = request.arrival_s
        if policy == "round_robin":
            # Rotate over the full cluster while skipping ineligible resources.
            worker = next(workers[(rr_cursor + offset) % len(workers)]
                          for offset in range(len(workers))
                          if workers[(rr_cursor + offset) % len(workers)] in options)
            rr_cursor = (workers.index(worker) + 1) % len(workers)
        elif policy == "least_loaded":
            # Shortest committed queue in seconds, breaking ties by service time.
            worker = min(options, key=lambda w: (
                max(0.0, availability[w.name] - now),
                processing_seconds(w, request.model, request.tokens),
                w.name,
            ))
        else:
            before = _potential(workers, availability, now, future_large_fraction)
            def score(candidate: Worker) -> tuple[float, str]:
                runtime = processing_seconds(candidate, request.model, request.tokens)
                start = max(now, availability[candidate.name])
                predicted_response = start + runtime - now
                after_availability = dict(availability)
                after_availability[candidate.name] = start + runtime
                after = _potential(workers, after_availability, now, future_large_fraction)
                expected_cost = runtime * candidate.cost_usd_per_hour / 3600
                return (
                    predicted_response + lambda_future * (after - before)
                    + cost_weight_seconds_per_usd * expected_cost,
                    candidate.name,
                )
            worker = min(options, key=score)

        runtime = processing_seconds(worker, request.model, request.tokens)
        start = max(now, availability[worker.name])
        finish = start + runtime
        availability[worker.name] = finish
        busy[worker.name] += runtime
        cost += runtime * worker.cost_usd_per_hour / 3600
        assignments.append(Assignment(
            request.id, request.model, worker.name, now, start, finish,
            start - now, finish - now, request.sla_s,
        ))

    start_s = requests[0].arrival_s if requests else 0.0
    finish_s = max((job.finish_s for job in assignments), default=0.0)
    return Simulation(policy, tuple(assignments), busy, cost, start_s, finish_s)
