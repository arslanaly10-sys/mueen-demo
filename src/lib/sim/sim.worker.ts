// Runs the scale simulator off the main thread. Pure computation: no network, no model calls.
import { simulate, type SimParams } from "./model";

self.onmessage = (e: MessageEvent<SimParams>) => {
  const t0 = performance.now();
  let last = 0;
  const report = simulate(e.data, (share) => {
    if (share - last >= 0.05) { last = share; postMessage({ type: "progress", share }); }
  });
  postMessage({ type: "done", report, computeMs: Math.round(performance.now() - t0) });
};
