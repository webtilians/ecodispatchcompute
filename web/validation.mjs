/**
 * EcoDispatch Compute v0.4 — fixed, paired synthetic validation.
 * Protocol FIRST committed at docs/validation-v0.4-protocol.md
 * Primary: stressed scenario, EcoDispatch lambda=0.6 vs lambda=0,
 * 60 reserved seeds, seed-level SLA-miss-rate difference with paired CI.
 */
import { generateWorkload, workers, simulate, seededRandom, percentile } from "./simulator.mjs";

export const VALIDATION_VERSION = "0.4.0";
export const VALIDATION_PROTOCOL = Object.freeze({
  requestCount: 1000,
  exploration: { firstSeed: 7, runs: 30 },
  reserved: { firstSeed: 40001, runs: 60 },
  lambdas: Object.freeze([0, 0.2, 0.6, 1, 3]),
  primaryScenario: "stressed",
  referencePolicy: "lambda_0",
  primaryPolicy: "lambda_0.6",
  bootstrapResamples: 2000,
  bootstrapSeed: 93041,
  ciLevel: 0.95,
  costWeight: 0,
});

export const SCENARIOS = Object.freeze([
  { id: "light", label: "Baja carga", rate: 0.12, largeShare: 0.2 },
  { id: "nominal", label: "Carga nominal", rate: 0.22, largeShare: 0.2 },
  { id: "stressed", label: "Saturación", rate: 0.35, largeShare: 0.2 },
  { id: "large-heavy", label: "LLM grandes", rate: 0.22, largeShare: 0.5 },
]);

const METRICS = Object.freeze([
  "miss", "mean", "p95", "cost", "throughput", "utilization",
]);
const POLICY_NAMES = Object.freeze({
  round_robin: "Round Robin",
  least_loaded: "Least Loaded",
  lambda_0: "EcoDispatch λ=0",
  "lambda_0.2": "EcoDispatch λ=0,2",
  "lambda_0.6": "EcoDispatch λ=0,6",
  lambda_1: "EcoDispatch λ=1",
  lambda_3: "EcoDispatch λ=3",
});
export const POLICY_KEYS = Object.freeze(Object.keys(POLICY_NAMES));

function average(values) {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function cleanZero(value) {
  return Math.abs(value) < 1e-12 ? 0 : value;
}

/** Resample WHOLE paired runs (seeds), never requests within the same queue. */
export function pairedBootstrap(differences, { resamples = 2000, seed = 93041 } = {}) {
  if (!Array.isArray(differences) || differences.length < 2 ||
      !differences.every(Number.isFinite) ||
      !Number.isInteger(resamples) || resamples < 100 ||
      !Number.isInteger(seed) || seed < 0) {
    throw new RangeError("Requires >=2 finite paired run differences, >=100 resamples and valid seed");
  }
  const random = seededRandom(seed);
  const means = [];
  for (let b = 0; b < resamples; b++) {
    let sum = 0;
    for (let i = 0; i < differences.length; i++) {
      sum += differences[Math.floor(random() * differences.length)];
    }
    means.push(sum / differences.length);
  }
  const delta = cleanZero(average(differences));
  const ci = [
    cleanZero(percentile(means, 0.025)),
    cleanZero(percentile(means, 0.975)),
  ];
  return {
    meanDelta: delta, ci95: ci, n: differences.length,
    wins: differences.filter(d => d < -1e-12).length,
    ties: differences.filter(d => Math.abs(d) <= 1e-12).length,
    losses: differences.filter(d => d > 1e-12).length,
  };
}

function evaluateScenario(stage, scenario, progress) {
  const setup = VALIDATION_PROTOCOL[stage];
  const cluster = workers();
  const runs = [];
  for (let index = 0; index < setup.runs; index++) {
    const seed = setup.firstSeed + index;
    const trace = generateWorkload({
      seed, count: VALIDATION_PROTOCOL.requestCount,
      rate: scenario.rate, largeShare: scenario.largeShare,
    });
    const policies = {};
    for (const policy of POLICY_KEYS) {
      const options = {
        priorLarge: scenario.largeShare,
        lambdaFuture: policy.startsWith("lambda_") ? Number(policy.slice(7)) : 0,
        costWeight: VALIDATION_PROTOCOL.costWeight,
      };
      const enginePolicy = policy.startsWith("lambda_") ? "ecodispatch" : policy;
      policies[policy] = simulate(cluster, trace, enginePolicy, options).metrics;
    }
    runs.push({ seed, policies });
    if (progress && ((index + 1) % 10 === 0 || index === setup.runs - 1)) {
      progress({ scenario: scenario.id, completed: index + 1, total: setup.runs });
    }
  }
  const aggregates = {};
  const paired = {};
  for (const policy of POLICY_KEYS) {
    const values = runs.map(row => row.policies[policy]);
    const summary = { label: POLICY_NAMES[policy] };
    for (const key of METRICS) summary[key] = average(values.map(row => row[key]));
    summary.byModel = Object.fromEntries(
      ["small", "large"].map(model => [model, {
        requestsPerRun: average(values.map(row => row.byModel[model].requests)),
        miss: average(values.map(row => row.byModel[model].miss)),
        p95: average(values.map(row => row.byModel[model].p95)),
      }])
    );
    aggregates[policy] = summary;
    if (policy === "lambda_0") continue;
    const diffs = runs.map(row => row.policies[policy].miss - row.policies.lambda_0.miss);
    const protocolPrimary = scenario.id === VALIDATION_PROTOCOL.primaryScenario &&
      policy === VALIDATION_PROTOCOL.primaryPolicy;
    // The PRIMARY analysis uses precisely the precommitted fixed bootstrap seed.
    const bootstrapSeed = protocolPrimary ? VALIDATION_PROTOCOL.bootstrapSeed :
      VALIDATION_PROTOCOL.bootstrapSeed + SCENARIOS.findIndex(s => s.id === scenario.id) * 100 +
      POLICY_KEYS.indexOf(policy) + 1;
    const ci = pairedBootstrap(diffs, {
      seed: bootstrapSeed, resamples: VALIDATION_PROTOCOL.bootstrapResamples,
    });
    paired[policy] = {
      versus: "lambda_0",
      slaMiss: ci,
      p95MeanDelta: average(runs.map(row => row.policies[policy].p95 - row.policies.lambda_0.p95)),
      smallMissMeanDelta: average(runs.map(row =>
        row.policies[policy].byModel.small.miss - row.policies.lambda_0.byModel.small.miss)),
      largeMissMeanDelta: average(runs.map(row =>
        row.policies[policy].byModel.large.miss - row.policies.lambda_0.byModel.large.miss)),
      bootstrapSeed,
    };
  }
  return {
    id: scenario.id, label: scenario.label,
    arrivalRate: scenario.rate, largeShare: scenario.largeShare,
    n: setup.runs, firstSeed: setup.firstSeed,
    aggregate: aggregates, comparisons: paired,
    // Per-seed differences are retained for independent validation/auditing.
    perSeed: runs.map(row => ({
      seed: row.seed,
      policies: Object.fromEntries(POLICY_KEYS.map(key => [key, {
        miss: row.policies[key].miss,
        p95: row.policies[key].p95,
        smallMiss: row.policies[key].byModel.small.miss,
        largeMiss: row.policies[key].byModel.large.miss,
      }])),
    })),
  };
}

/** Fixed scenarios and protocol; no caller-supplied lambda, sample count or seed. */
export function runValidation({ stage = "exploration", onProgress = null, scenarioIds = null } = {}) {
  if (!(stage in VALIDATION_PROTOCOL) ||
      (scenarioIds !== null && (!Array.isArray(scenarioIds) ||
      scenarioIds.some(id => !SCENARIOS.some(s => s.id === id)) ||
      new Set(scenarioIds).size !== scenarioIds.length))) {
    throw new RangeError("Invalid fixed validation stage or scenarios");
  }
  const scenarios = SCENARIOS.filter(s => scenarioIds === null || scenarioIds.includes(s.id));
  if (!scenarios.length) throw new RangeError("No scenarios requested");
  const results = scenarios.map(s => evaluateScenario(stage, s, onProgress));
  const primaryResult = results.find(s => s.id === VALIDATION_PROTOCOL.primaryScenario);
  const primary = primaryResult && {
    question: "EcoDispatch λ=0,6 vs λ=0 — Saturación",
    deltaMetric: "sla_miss_fraction",
    ...primaryResult.comparisons[VALIDATION_PROTOCOL.primaryPolicy].slaMiss,
  };
  if (primary) {
    primary.simulationCriterionMet = primary.meanDelta < 0 && primary.ci95[1] < 0;
  }
  return {
    version: VALIDATION_VERSION,
    stage, label: stage === "reserved" ? "Evaluación reservada" : "Exploración",
    protocolPath: "docs/validation-v0.4-protocol.md",
    syntheticOnly: true,
    protocol: {
      ...VALIDATION_PROTOCOL,
      seedRange: VALIDATION_PROTOCOL[stage],
    },
    scenarios: results,
    primary: primary || null,
    disclaimer: "Exclusivamente resultados sintéticos del simulador. No mide GPUs reales; CIs descriptivos pareados por semilla.",
  };
}
