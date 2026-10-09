import test from "node:test";
import assert from "node:assert/strict";
import {
  SCENARIOS, VALIDATION_PROTOCOL, pairedBootstrap, runValidation,
} from "../validation.mjs";

test("protocol is fixed before evaluating data", () => {
  assert.equal(VALIDATION_PROTOCOL.primaryScenario, "stressed");
  assert.equal(VALIDATION_PROTOCOL.primaryPolicy, "lambda_0.6");
  assert.equal(VALIDATION_PROTOCOL.referencePolicy, "lambda_0");
  assert.equal(VALIDATION_PROTOCOL.reserved.firstSeed, 40001);
  assert.equal(VALIDATION_PROTOCOL.reserved.runs, 60);
  assert.deepEqual([...VALIDATION_PROTOCOL.lambdas], [0, 0.2, 0.6, 1, 3]);
  assert.equal(SCENARIOS.length, 4);
});

test("paired bootstrap respects paired seed units and fixed draws", () => {
  const zero = pairedBootstrap([0, 0, 0, 0], { resamples: 100 });
  assert.deepEqual(zero.ci95, [0, 0]);
  assert.deepEqual([zero.wins, zero.ties, zero.losses], [0, 4, 0]);
  const improvements = [-0.2, -0.1, -0.3, -0.05];
  const first = pairedBootstrap(improvements, { resamples: 500, seed: 93041 });
  assert.deepEqual(first, pairedBootstrap(improvements, { resamples: 500, seed: 93041 }));
  assert.ok(first.meanDelta < 0 && first.ci95[1] <= 0);
  assert.equal(first.wins + first.ties + first.losses, 4);
  assert.throws(() => pairedBootstrap([0]), RangeError);
  assert.throws(() => pairedBootstrap([0, Infinity]), RangeError);
});

test("exploration results are deterministic, paired and correctly summarized", { timeout: 120000 }, () => {
  const args = { stage: "exploration", scenarioIds: ["light"] };
  const report = runValidation(args);
  assert.equal(report.stage, "exploration");
  assert.equal(report.scenarios.length, 1);
  assert.equal(report.scenarios[0].perSeed.length, 30);
  assert.equal(report.scenarios[0].perSeed[0].seed, 7);
  assert.equal(report.scenarios[0].perSeed.at(-1).seed, 36);
  assert.equal(report.primary, null);
  assert.equal(report.scenarios[0].n, 30);
  const data = report.scenarios[0];
  assert.ok(data.aggregate.lambda_0.p95 >= 0);
  assert.ok(data.aggregate.lambda_0.6.p95 >= 0);
  const d = data.perSeed.map(row => row.policies.lambda_0.6.miss - row.policies.lambda_0.miss);
  const mean = d.reduce((sum, x) => sum + x, 0) / d.length;
  assert.ok(Math.abs(mean - data.comparisons.lambda_0.6.slaMiss.meanDelta) < 1e-12);
  const wins = d.filter(x => x < -1e-12).length;
  assert.equal(wins, data.comparisons.lambda_0.6.slaMiss.wins);
  assert.deepEqual(
    report.scenarios[0].perSeed.map(r => r.policies.lambda_0),
    runValidation(args).scenarios[0].perSeed.map(r => r.policies.lambda_0)
  );
});

test("reserved evaluation is separate from exploratory seed range", { timeout: 120000 }, () => {
  const report = runValidation({ stage: "reserved", scenarioIds: ["stressed"] });
  assert.equal(report.scenarios[0].perSeed[0].seed, 40001);
  assert.equal(report.scenarios[0].perSeed.at(-1).seed, 40060);
  assert.equal(report.primary.n, 60);
  assert.equal(report.primary.simulationCriterionMet,
    report.primary.meanDelta < 0 && report.primary.ci95[1] < 0);
  assert.equal(report.scenarios[0].comparisons.lambda_0.6.bootstrapSeed, 93041);
  assert.equal(report.scenarios[0].comparisons.lambda_1.slaMiss.n, 60);
});

test("no arbitrary lambda or seed overrides accepted by fixed protocol", () => {
  assert.throws(() => runValidation({ stage: "foo" }), RangeError);
  assert.throws(() => runValidation({ scenarioIds: ["unknown"] }), RangeError);
  assert.throws(() => runValidation({ scenarioIds: ["light", "light"] }), RangeError);
  assert.throws(() => runValidation({ scenarioIds: [] }), RangeError);
});
