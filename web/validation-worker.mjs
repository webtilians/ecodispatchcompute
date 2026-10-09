import { runValidation } from "./validation.mjs";

self.onmessage = ({ data }) => {
  try {
    const result = runValidation({
      stage: data?.stage,
      scenarioIds: data?.scenario ? [data.scenario] : null,
      onProgress: progress => self.postMessage({ type: "progress", progress }),
    });
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({ type: "error", error: error instanceof Error ? error.message : String(error) });
  }
};
