#!/usr/bin/env node
/** Fixed v0.4 simulator validation; no custom lambdas/seeds allowed. */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { runValidation } from "../web/validation.mjs";

const args = process.argv.slice(2);
const readOption = (flag, fallback) => {
  const index = args.indexOf(flag);
  if (index === -1) return fallback;
  if (index + 1 >= args.length) throw new Error("Missing value after " + flag);
  return args[index + 1];
};
try {
  for (const arg of args) {
    if (!["--stage", "--scenario", "--output", "--help", "exploration", "reserved",
      "light", "nominal", "stressed", "large-heavy"].includes(arg) && !arg.endsWith(".json")) {
      // Non-option values for --output may have arbitrary paths.
      const prev = args.indexOf(arg) > 0 ? args[args.indexOf(arg) - 1] : "";
      if (prev !== "--output") throw new Error("Unknown argument: " + arg);
    }
  }
  if (args.includes("--help")) {
    console.log("Usage: node scripts/validate-v0.4.mjs [--stage exploration|reserved] [--scenario light|nominal|stressed|large-heavy] [--output report.json]");
    process.exit(0);
  }
  const stage = readOption("--stage", "exploration");
  const scenario = readOption("--scenario", null);
  const output = readOption("--output", null);
  const report = runValidation({
    stage, scenarioIds: scenario ? [scenario] : null,
    onProgress: ({ scenario, completed, total }) => {
      if (completed === total) console.error(scenario + ": " + completed + "/" + total + " paired seeds");
    },
  });
  console.log("EcoDispatch Compute " + report.version + " · " + report.label);
  console.log("Synthetic experiment only; no real GPU evidence.");
  for (const s of report.scenarios) {
    console.log("\n" + s.label + " (" + s.n + " paired seeds)");
    console.log("Policy".padEnd(25) + "Miss rate".padStart(12) + "P95 (s)".padStart(14));
    for (const [policy, m] of Object.entries(s.aggregate)) {
      console.log(policy.padEnd(25) + (m.miss * 100).toFixed(2).padStart(11) + "%" + m.p95.toFixed(2).padStart(14));
    }
    const diff = s.comparisons.lambda_0.6.slaMiss;
    console.log("λ=0.6 vs λ=0 miss Δ=" + (diff.meanDelta * 100).toFixed(3) +
      " pp; paired 95% CI [" + (diff.ci95[0] * 100).toFixed(3) + ", " +
      (diff.ci95[1] * 100).toFixed(3) + "] pp");
  }
  if (report.primary) {
    console.log("\nFixed PRIMARY: " + (report.primary.simulationCriterionMet ?
      "synthetic evidence criterion met" : "synthetic evidence criterion NOT met"));
  }
  if (output) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(report, null, 2) + "\n", "utf8");
    console.log("Saved " + output);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
