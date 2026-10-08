/*
 * EcoDispatch Compute Lab — browser-side synthetic scheduler v0.2.
 * Independent port of the Python v0.1 modelling rules, NOT the same PRNG trace.
 * No future requests are visible to a routing decision.
 */
export const POLICY_NAMES = Object.freeze({
  round_robin: "Round Robin",
  least_loaded: "Least Loaded",
  ecodispatch: "EcoDispatch",
});

const MODEL_VRAM = { small: 8, large: 20 };
const MODEL_FACTOR = { small: 1, large: 0.45 };
const REFERENCE_TOKENS = { small: 600, large: 1600 };
const EPS = 1e-10;

export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function workers() {
  return [
    { id: "GPU A", vram: 24, speed: 145, usdHour: 1.5, models: ["small", "large"] },
    { id: "GPU B", vram: 12, speed: 115, usdHour: 0.65, models: ["small"] },
    { id: "GPU C", vram: 24, speed: 100, usdHour: 1.05, models: ["small", "large"] },
    { id: "GPU D", vram: 16, speed: 95, usdHour: 0.7, models: ["small"] },
  ];
}

export function generateWorkload({ count = 1000, seed = 7, rate = 0.22, largeShare = 0.2 } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 10000 ||
      !Number.isInteger(seed) || seed < 0 ||
      !Number.isFinite(rate) || rate <= 0 ||
      !Number.isFinite(largeShare) || largeShare < 0 || largeShare > 1) {
    throw new RangeError("Invalid workload parameters");
  }
  const random = seededRandom(seed);
  const requests = [];
  let time = 0;
  for (let i = 0; i < count; i++) {
    // Exponential interarrival times; arrival process is synthetic Poisson.
    time += -Math.log(1 - random()) / rate;
    const model = random() < largeShare ? "large" : "small";
    const tokens = model === "large" ?
      900 + Math.floor(random() * 1501) :
      300 + Math.floor(random() * 601);
    requests.push({ id: i, arrival: time, model, tokens, sla: model === "large" ? 120 : 25 });
  }
  return requests;
}

export function duration(worker, model, tokens) {
  return 1.5 + tokens / (worker.speed * MODEL_FACTOR[model]);
}

function compatible(worker, model) {
  return worker.models.includes(model) && worker.vram >= MODEL_VRAM[model];
}

function potential(cluster, available, now, priorLarge) {
  let total = 0;
  for (const [model, probability] of [["small", 1 - priorLarge], ["large", priorLarge]]) {
    if (!probability) continue;
    let best = Infinity;
    for (const worker of cluster) {
      if (!compatible(worker, model)) continue;
      best = Math.min(best, Math.max(0, available[worker.id] - now) +
        duration(worker, model, REFERENCE_TOKENS[model]));
    }
    if (!Number.isFinite(best)) throw new Error("No compatible worker for future " + model);
    total += probability * best;
  }
  return total;
}

export function percentile(numbers, quantile) {
  if (!numbers.length) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const p = (sorted.length - 1) * quantile;
  const low = Math.floor(p);
  return sorted[low] + (sorted[Math.ceil(p)] - sorted[low]) * (p - low);
}

function metrics(jobs, cluster, busy, totalCost) {
  const latencies = jobs.map(j => j.latency);
  const start = jobs.length ? jobs[0].arrival : 0;
  const finish = jobs.reduce((m, j) => Math.max(m, j.finish), start);
  const window = Math.max(0, finish - start);
  const workerUtilization = {};
  for (const worker of cluster) {
    workerUtilization[worker.id] = window ? busy[worker.id] / window : 0;
  }
  const byModel = {};
  for (const model of ["small", "large"]) {
    const subset = jobs.filter(j => j.model === model);
    byModel[model] = {
      requests: subset.length,
      p95: percentile(subset.map(j => j.latency), 0.95),
      miss: subset.length ? subset.filter(j => j.latency > j.sla).length / subset.length : 0,
    };
  }
  return {
    requests: jobs.length,
    mean: jobs.length ? latencies.reduce((a, b) => a + b, 0) / jobs.length : 0,
    p95: percentile(latencies, 0.95),
    miss: jobs.length ? jobs.filter(j => j.latency > j.sla).length / jobs.length : 0,
    throughput: window ? jobs.length / window : 0,
    cost: totalCost,
    utilization: cluster.length ? Object.values(workerUtilization).reduce((a, b) => a + b, 0) / cluster.length : 0,
    workerUtilization,
    byModel,
  };
}

export function simulate(cluster, requests, policy, { lambdaFuture = 0.6, priorLarge = 0.2, costWeight = 0 } = {}) {
  if (!(policy in POLICY_NAMES)) throw new Error("Unknown policy: " + policy);
  if (!cluster.length || new Set(cluster.map(w => w.id)).size !== cluster.length) {
    throw new Error("Worker IDs must be unique and nonempty");
  }
  if (![lambdaFuture, priorLarge, costWeight].every(Number.isFinite) ||
      lambdaFuture < 0 || costWeight < 0 || priorLarge < 0 || priorLarge > 1) {
    throw new RangeError("Invalid policy parameters");
  }

  const available = Object.fromEntries(cluster.map(w => [w.id, 0]));
  const busy = Object.fromEntries(cluster.map(w => [w.id, 0]));
  const jobs = [];
  let cursor = 0;
  let previousArrival = -Infinity;
  let totalCost = 0;
  const seenIds = new Set();
  for (const request of requests) {
    if (seenIds.has(request.id) || request.arrival < previousArrival ||
      !Number.isFinite(request.arrival) || request.arrival < 0 ||
      !Number.isFinite(request.tokens) || request.tokens <= 0 ||
      !Number.isFinite(request.sla) || request.sla <= 0 ||
      !(request.model in MODEL_VRAM)) {
      throw new Error("Invalid or unsorted request trace");
    }
    seenIds.add(request.id);
    previousArrival = request.arrival;
    const options = cluster.filter(w => compatible(w, request.model));
    if (!options.length) throw new Error("No eligible worker for " + request.model);

    const now = request.arrival;
    let chosen;
    if (policy === "round_robin") {
      for (let offset = 0; offset < cluster.length; offset++) {
        const index = (cursor + offset) % cluster.length;
        if (compatible(cluster[index], request.model)) {
          chosen = cluster[index];
          cursor = (index + 1) % cluster.length;
          break;
        }
      }
    } else if (policy === "least_loaded") {
      chosen = [...options].sort((a, b) => {
        const waitA = Math.max(0, available[a.id] - now);
        const waitB = Math.max(0, available[b.id] - now);
        return waitA - waitB ||
          duration(a, request.model, request.tokens) - duration(b, request.model, request.tokens) ||
          a.id.localeCompare(b.id);
      })[0];
    } else {
      const before = potential(cluster, available, now, priorLarge);
      let lowest = Infinity;
      for (const candidate of options) {
        const runTime = duration(candidate, request.model, request.tokens);
        const end = Math.max(now, available[candidate.id]) + runTime;
        const responseTime = end - now;
        const after = { ...available, [candidate.id]: end };
        const loss = potential(cluster, after, now, priorLarge) - before;
        const computeCost = runTime * candidate.usdHour / 3600;
        const score = responseTime + lambdaFuture * loss + costWeight * computeCost;
        if (score < lowest - EPS ||
            (Math.abs(score - lowest) < EPS && candidate.id < (chosen?.id ?? "\uffff"))) {
          lowest = score;
          chosen = candidate;
        }
      }
    }
    const runTime = duration(chosen, request.model, request.tokens);
    const start = Math.max(now, available[chosen.id]);
    const finish = start + runTime;
    available[chosen.id] = finish;
    busy[chosen.id] += runTime;
    totalCost += runTime * chosen.usdHour / 3600;
    jobs.push({
      id: request.id, model: request.model, worker: chosen.id,
      arrival: now, start, finish, wait: start - now,
      latency: finish - now, sla: request.sla,
    });
  }
  return { jobs, metrics: metrics(jobs, cluster, busy, totalCost) };
}

export function runExperiment(config = {}) {
  const parameters = {
    count: Number(config.count ?? 1000),
    seeds: Number(config.seeds ?? 4),
    seed: Number(config.seed ?? 7),
    rate: Number(config.rate ?? 0.22),
    largeShare: Number(config.largeShare ?? 0.2),
    lambdaFuture: Number(config.lambdaFuture ?? 0.6),
    costWeight: Number(config.costWeight ?? 0),
  };
  const { count, seeds, seed, rate, largeShare, lambdaFuture, costWeight } = parameters;
  if (!Number.isInteger(count) || count < 10 || count > 5000 ||
      !Number.isInteger(seeds) || seeds < 1 || seeds > 10 ||
      !Number.isInteger(seed) || seed < 0 || seed > 1000000 ||
      !Number.isFinite(rate) || rate < 0.01 || rate > 2 ||
      !Number.isFinite(largeShare) || largeShare < 0 || largeShare > 1 ||
      !Number.isFinite(lambdaFuture) || lambdaFuture < 0 || lambdaFuture > 15 ||
      !Number.isFinite(costWeight) || costWeight < 0 || costWeight > 1000) {
    throw new RangeError("Parameter outside the supported range");
  }
  const cluster = workers();
  const policies = Object.keys(POLICY_NAMES);
  const lambdaValues = [...new Set([0, 0.2, 0.6, 1, 3, lambdaFuture])].sort((a, b) => a - b);
  const all = Object.fromEntries(policies.map(name => [name, []]));
  const sweep = Object.fromEntries(lambdaValues.map(lambda => [String(lambda), []]));
  const individual = [];
  for (let index = 0; index < seeds; index++) {
    const trace = generateWorkload({
      count, seed: seed + index, rate, largeShare,
    });
    const perSeed = {};
    for (const policy of policies) {
      const result = simulate(cluster, trace, policy, { lambdaFuture, priorLarge: largeShare, costWeight });
      all[policy].push(result.metrics);
      perSeed[policy] = result.metrics;
    }
    for (const lambda of lambdaValues) {
      const result = lambda === lambdaFuture ?
        perSeed.ecodispatch :
        simulate(cluster, trace, "ecodispatch", { lambdaFuture: lambda, priorLarge: largeShare, costWeight }).metrics;
      sweep[String(lambda)].push(result);
    }
    individual.push({ seed: seed + index, policies: perSeed });
  }
  const keys = ["mean", "p95", "miss", "throughput", "cost", "utilization"];
  const aggregate = series => {
    const output = {};
    for (const key of keys) {
      output[key] = series.reduce((sum, item) => sum + item[key], 0) / series.length;
    }
    output.byModel = {};
    for (const model of ["small", "large"]) {
      output.byModel[model] = {
        p95: series.reduce((s, r) => s + r.byModel[model].p95, 0) / series.length,
        miss: series.reduce((s, r) => s + r.byModel[model].miss, 0) / series.length,
        requests: series.reduce((s, r) => s + r.byModel[model].requests, 0) / series.length,
      };
    }
    output.workerUtilization = Object.fromEntries(cluster.map(worker =>
      [worker.id, series.reduce((s, r) => s + r.workerUtilization[worker.id], 0) / series.length]));
    return output;
  };
  const summary = Object.fromEntries(policies.map(name => [name, aggregate(all[name])]));
  const sensitivity = lambdaValues.map(lambda => ({ lambda, ...aggregate(sweep[String(lambda)]) }));
  return {
    kind: "synthetic-llm-routing",
    version: "0.2.0",
    note: "Exploratory, wholly synthetic benchmark. No production performance claim.",
    config: parameters, cluster, summary, sensitivity, individual,
  };
}
