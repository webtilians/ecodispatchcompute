import test from "node:test";
import assert from "node:assert/strict";
import { generateWorkload, workers, simulate, runExperiment, percentile } from "../simulator.mjs";

test("seeded workloads repeat exactly and arrivals stay ordered", () => {
  const a = generateWorkload({ count: 200, seed: 42 });
  assert.deepEqual(a, generateWorkload({ count: 200, seed: 42 }));
  assert.notDeepEqual(a, generateWorkload({ count: 200, seed: 43 }));
  assert.ok(a.every((req, i) => !i || req.arrival >= a[i - 1].arrival));
});

test("routing respects GPU and model compatibility", () => {
  const cluster = workers();
  const requests = generateWorkload({ count: 250, seed: 17, largeShare: 0.6 });
  for (const policy of ["round_robin", "least_loaded", "ecodispatch"]) {
    const result = simulate(cluster, requests, policy);
    assert.equal(result.jobs.length, requests.length);
    for (const job of result.jobs) {
      const worker = cluster.find(w => w.id === job.worker);
      assert.ok(worker.models.includes(job.model));
      if (job.model === "large") assert.ok(worker.vram >= 20);
      assert.ok(job.wait >= 0 && job.start >= job.arrival && job.finish >= job.start);
    }
  }
});

test("least-loaded splits simultaneous jobs and computes relative SLA", () => {
  const cluster = [
    { id: "a", vram: 12, speed: 100, usdHour: 1, models: ["small"] },
    { id: "b", vram: 12, speed: 100, usdHour: 1, models: ["small"] },
  ];
  const requests = [
    { id: 0, arrival: 0, model: "small", tokens: 1000, sla: 2 },
    { id: 1, arrival: 0, model: "small", tokens: 1000, sla: 2 },
  ];
  const result = simulate(cluster, requests, "least_loaded");
  assert.deepEqual(result.jobs.map(j => j.worker), ["a", "b"]);
  assert.equal(result.metrics.miss, 1);
});

test("future reserve changes eligible routing decisions when useful", () => {
  const cluster = [
    { id: "a", vram: 24, speed: 200, usdHour: 1, models: ["small", "large"] },
    { id: "b", vram: 12, speed: 100, usdHour: 1, models: ["small"] },
  ];
  const trace = [{ id: 0, arrival: 0, model: "small", tokens: 500, sla: 100 }];
  assert.equal(simulate(cluster, trace, "ecodispatch", {
    lambdaFuture: 0, priorLarge: 1,
  }).jobs[0].worker, "a");
  assert.equal(simulate(cluster, trace, "ecodispatch", {
    lambdaFuture: 10, priorLarge: 1,
  }).jobs[0].worker, "b");
});

test("online policy cannot inspect upcoming requests", () => {
  const trace = generateWorkload({ count: 10, seed: 10 });
  const first = simulate(workers(), trace.slice(0, 1), "ecodispatch").jobs[0];
  const full = simulate(workers(), trace, "ecodispatch").jobs[0];
  assert.deepEqual(first, full);
});

test("benchmarks reuse seeds and return correct metrics and lambda sweep", () => {
  const options = { count: 120, seeds: 3, seed: 12, rate: 0.3, largeShare: 0.45, lambdaFuture: 0.6 };
  const result = runExperiment(options);
  assert.deepEqual(result, runExperiment(options));
  assert.equal(result.individual.length, 3);
  assert.deepEqual(Object.keys(result.summary), ["round_robin", "least_loaded", "ecodispatch"]);
  assert.ok(result.sensitivity.length >= 5);
  for (const policy of Object.values(result.summary)) {
    assert.ok(policy.miss >= 0 && policy.miss <= 1);
    assert.ok(policy.p95 >= 0 && policy.utilization <= 1);
    assert.ok(policy.byModel.large.p95 >= 0);
  }
  assert.equal(result.sensitivity.find(p => p.lambda === 0.6).p95, result.summary.ecodispatch.p95);
});

test("bad input is rejected and percentile interpolates", () => {
  assert.equal(percentile([1, 2, 3, 4, 5], 0.95), 4.8);
  assert.equal(simulate(workers(), [], "ecodispatch").metrics.requests, 0);
  assert.throws(() => generateWorkload({ rate: 0 }), RangeError);
  assert.throws(() => runExperiment({ count: 0 }), RangeError);
  assert.throws(() => runExperiment({ lambdaFuture: -1 }), RangeError);
  assert.throws(() => simulate(workers(), [], "unknown"));
});
