"""Standard-library tests for the experiment's core assumptions."""
import unittest

from ecodispatch_compute.__main__ import benchmark
from ecodispatch_compute.simulator import (
    Request, Worker, default_workers, generate_workload, percentile, simulate,
)


class SimulatorTests(unittest.TestCase):
    def test_workload_is_reproducible_and_time_ordered(self):
        a = generate_workload(300, seed=42)
        self.assertEqual(a, generate_workload(300, seed=42))
        self.assertNotEqual(a, generate_workload(300, seed=43))
        self.assertTrue(all(a[i].arrival_s <= a[i + 1].arrival_s for i in range(len(a) - 1)))

    def test_only_capable_servers_get_large_model_jobs(self):
        workers = default_workers()
        jobs = generate_workload(200, seed=11, large_fraction=0.6)
        for policy in ("round_robin", "least_loaded", "ecodispatch"):
            result = simulate(workers, jobs, policy)
            self.assertEqual(len(jobs), len(result.assignments))
            for assignment in result.assignments:
                worker = next(w for w in workers if w.name == assignment.server)
                self.assertIn(assignment.model, worker.models)
                self.assertGreaterEqual(worker.vram_gb, 20 if assignment.model == "large" else 8)

    def test_least_loaded_respects_committed_queue(self):
        workers = (
            Worker("a", 12, 100, 1, ("small",)),
            Worker("b", 12, 100, 1, ("small",)),
        )
        jobs = [Request(0, 0, "small", 1000, 100), Request(1, 0, "small", 1000, 100)]
        assignments = simulate(workers, jobs, "least_loaded").assignments
        self.assertEqual([job.server for job in assignments], ["a", "b"])

    def test_future_capacity_penalty_changes_routing(self):
        # Only 'a' serves large jobs; 'b' should absorb small work with a large lambda.
        workers = (
            Worker("a", 24, 200, 1, ("small", "large")),
            Worker("b", 12, 100, 1, ("small",)),
        )
        jobs = [Request(0, 0, "small", 500, 100)]
        greedy = simulate(workers, jobs, "ecodispatch",
                          lambda_future=0, future_large_fraction=1)
        conservative = simulate(workers, jobs, "ecodispatch",
                                lambda_future=10, future_large_fraction=1)
        self.assertEqual(greedy.assignments[0].server, "a")
        self.assertEqual(conservative.assignments[0].server, "b")

    def test_policy_does_not_look_at_unseen_future_requests(self):
        workers = default_workers()
        first = Request(0, 0, "small", 800, 30)
        later = Request(1, 30, "large", 2000, 120)
        single = simulate(workers, [first], "ecodispatch")
        extended = simulate(workers, [first, later], "ecodispatch")
        self.assertEqual(single.assignments[0], extended.assignments[0])

    def test_wait_and_sla_calculation(self):
        worker = Worker("single", 12, 10, 1, ("small",))
        requests = [Request(0, 0, "small", 100, 15),
                    Request(1, 0, "small", 100, 15)]
        result = simulate([worker], requests, "least_loaded")
        self.assertEqual(result.assignments[0].wait_s, 0)
        self.assertGreater(result.assignments[1].wait_s, 0)
        self.assertFalse(result.assignments[0].missed_sla)
        self.assertTrue(result.assignments[1].missed_sla)
        self.assertEqual(result.metrics()["sla_miss_rate"], 0.5)

    def test_bad_requests_and_no_compatible_model(self):
        workers = [Worker("tiny", 12, 100, 1, ("small",))]
        with self.assertRaises(ValueError):
            simulate(workers, [Request(0, 0, "large", 100, 100)], "least_loaded")
        with self.assertRaises(ValueError):
            simulate(workers, [Request(0, 10, "small", 100, 100),
                               Request(1, 1, "small", 100, 100)], "round_robin")
        with self.assertRaises(ValueError):
            generate_workload(arrival_rate=0)
        with self.assertRaises(ValueError):
            simulate(workers, [], "unknown")

    def test_percentile_and_empty(self):
        self.assertAlmostEqual(percentile([1, 2, 3, 4, 5], 0.95), 4.8)
        self.assertEqual(simulate(default_workers(), [], "ecodispatch").metrics()["requests"], 0)

    def test_paired_benchmark_outputs_all_policies(self):
        report = benchmark(count=40, seed=3, seeds=2)
        self.assertEqual(len(report["runs"]), 2)
        self.assertEqual(set(report["runs"][0]["policies"]),
                         {"round_robin", "least_loaded", "ecodispatch"})
        self.assertTrue(all(data["requests"] == 40
                            for data in report["runs"][0]["policies"].values()))
        self.assertEqual(report, benchmark(count=40, seed=3, seeds=2))


if __name__ == "__main__":
    unittest.main()
