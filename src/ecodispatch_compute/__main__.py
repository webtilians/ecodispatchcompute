"""Command-line reproducible benchmark: python -m ecodispatch_compute."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from statistics import mean

from .simulator import POLICIES, default_workers, generate_workload, simulate


def benchmark(
    *,
    count: int = 1000,
    seed: int = 7,
    seeds: int = 3,
    arrival_rate: float = 0.22,
    large_fraction: float = 0.20,
    lambda_future: float = 0.6,
    cost_weight_seconds_per_usd: float = 0.0,
) -> dict:
    if seeds < 1:
        raise ValueError("seeds must be positive")
    outcomes = []
    workers = default_workers()
    for current_seed in range(seed, seed + seeds):
        requests = generate_workload(count, current_seed, arrival_rate, large_fraction)
        policies = {
            name: simulate(
                workers, requests, name,
                lambda_future=lambda_future,
                future_large_fraction=large_fraction,
                cost_weight_seconds_per_usd=cost_weight_seconds_per_usd,
            ).metrics()
            for name in POLICIES
        }
        outcomes.append({"seed": current_seed, "policies": policies})
    keys = (
        "mean_latency_s", "p95_latency_s", "sla_miss_rate",
        "throughput_rps", "active_compute_cost_usd", "mean_worker_utilization",
    )
    aggregate = {
        name: {key: round(mean(run["policies"][name][key] for run in outcomes), 6)
               for key in keys}
        for name in POLICIES
    }
    return {
        "experiment": "synthetic-compute-v0.1",
        "limitations": "Synthetic arrivals, model speeds, GPU costs and service times; not production validation.",
        "config": {
            "requests_per_seed": count, "first_seed": seed, "seeds": seeds,
            "arrival_rate_rps": arrival_rate, "large_fraction": large_fraction,
            "prior_large_fraction": large_fraction, "lambda_future": lambda_future,
            "cost_weight_seconds_per_usd": cost_weight_seconds_per_usd,
        },
        "aggregate_mean_of_seed_metrics": aggregate,
        "runs": outcomes,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", type=int, default=1000)
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--seeds", type=int, default=3)
    parser.add_argument("--arrival-rate", type=float, default=0.22,
                        help="Expected requests per simulated second")
    parser.add_argument("--large-share", type=float, default=0.20,
                        help="Synthetic share of large-model jobs and fixed prior")
    parser.add_argument("--lambda-future", type=float, default=0.6)
    parser.add_argument("--cost-weight", type=float, default=0.0,
                        help="Seconds of routing penalty per USD of active compute")
    parser.add_argument("--json", metavar="PATH",
                        help="Write full report to PATH, or '-' for stdout")
    args = parser.parse_args()
    report = benchmark(
        count=args.requests, seed=args.seed, seeds=args.seeds,
        arrival_rate=args.arrival_rate, large_fraction=args.large_share,
        lambda_future=args.lambda_future,
        cost_weight_seconds_per_usd=args.cost_weight,
    )
    if args.json == "-":
        print(json.dumps(report, indent=2))
        return
    if args.json:
        output = Path(args.json)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print("Report written to", output)
    print("Synthetic workloads only; all policies see identical per-seed arrivals.")
    print(f"requests/seed={args.requests}, seeds={args.seeds}, lambda={args.lambda_future}")
    print(f"{'policy':<17} {'mean(s)':>9} {'P95(s)':>9} {'SLA miss':>10} {'cost($)':>10} {'util':>8}")
    for policy, result in report["aggregate_mean_of_seed_metrics"].items():
        print(f"{policy:<17} {result['mean_latency_s']:>9.2f} "
              f"{result['p95_latency_s']:>9.2f} "
              f"{result['sla_miss_rate']:>10.2%} "
              f"{result['active_compute_cost_usd']:>10.4f} "
              f"{result['mean_worker_utilization']:>8.1%}")


if __name__ == "__main__":
    main()
