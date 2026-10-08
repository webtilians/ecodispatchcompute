import { runExperiment } from "./simulator.mjs";

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ ok: true, result: runExperiment(data) });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
