// Self-check for the scale simulator: conservation and duplicate handling hold for the benchmark scenario.
import assert from "node:assert/strict";
import { BENCHMARK_1M_60S, KINDS, simulate } from "../src/lib/sim/model";

const t0 = performance.now();
const r = simulate(BENCHMARK_1M_60S);
const ms = Math.round(performance.now() - t0);

const completed = KINDS.reduce((s, k) => s + r.completed[k], 0);
assert.equal(r.generated, 1_000_000, "every envelope generated");
assert.equal(r.duplicatesRejected, r.duplicatesSent, "every client resend rejected by its idempotency key");
assert.equal(r.admitted, r.generated, "every unique envelope admitted after back-pressure");
assert.equal(r.duplicateMutations, 0, "no duplicate mutation");
assert.equal(completed + r.awaitingApproval + r.humanReview + r.inFlightAtEnd, r.admitted, "every admitted task is accounted for");
assert.ok(r.awaitingApproval > 0, "writes wait for approval: intake is not completion");

// a slow front door defers envelopes instead of dropping them
const slow = simulate({ ...BENCHMARK_1M_60S, totalEnvelopes: 50_000, frontDoorPerSec: 400, drainSec: 900 });
assert.ok(slow.deferredPeak > 0 && slow.admitted === slow.generated, "back-pressure defers, never drops");

console.log(`sim.check ok — 1M benchmark: admitted ${r.admitted} by ${r.admissionSeconds}s, completed ${completed}, awaiting approval ${r.awaitingApproval}, human review ${r.humanReview}, ${r.duplicatesRejected} duplicates rejected, simulated ${r.simulatedSeconds}s in ${ms} ms`);
