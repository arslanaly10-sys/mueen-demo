/**
 * Scale simulator: a tick-based model of the platform's task pipeline, run on SIMULATED time.
 * It never calls a model, an agency or the network. Results describe this model's behaviour under the
 * chosen parameters; they are not measurements of any real system.
 *
 * Pipeline: synthetic envelopes (generated in batches) → front door (duplicate-key check, admission
 * capacity, back-pressure) → workers → reads go to the agency, prepares complete internally, writes wait
 * for user approval → per-agency rate limit → success, failure (retry with backoff, then human review)
 * or timeout (outcome unknown → reconcile with the agency before any retry).
 */

export type Kind = "read" | "prepare" | "submit" | "pay";
export const KINDS: Kind[] = ["read", "prepare", "submit", "pay"];

export interface AgencyParams {
  id: string;
  /** share of tasks addressed to this agency (shares are normalised) */
  share: number;
  /** agreed calls per second for this agency's connector */
  quotaPerSec: number;
}

export interface SimParams {
  totalEnvelopes: number;
  admissionWindowSec: number;
  batchSize: number;
  /** share of envelopes the client sends twice (same idempotency key) */
  clientDuplicateRate: number;
  frontDoorPerSec: number;
  workers: number;
  workerMsPerTask: number;
  mix: Record<Kind, number>;
  /** share of submit/pay tasks the user approves during the run; the rest stay awaiting approval */
  approvalShare: number;
  approvalDelaySec: [number, number];
  agencies: AgencyParams[];
  paymentQuotaPerSec: number;
  failureRate: number;
  timeoutRate: number;
  /** of reconciled timeouts, share the agency had in fact completed (so no resubmission) */
  reconcileFoundDone: number;
  reconcileDelaySec: number;
  retryBackoffSec: number;
  maxAttempts: number;
  /** stop the run this many simulated seconds after admission closes */
  drainSec: number;
  seed: number;
}

export interface Series {
  t: number[];
  admitted: number[];
  completed: number[];
  queueDepth: number[];
}

export interface AgencyReport {
  id: string;
  calls: number;
  completed: number;
  throttledPeak: number;
  backlogAtEnd: number;
  failures: number;
  timeouts: number;
}

export interface SimReport {
  params: SimParams;
  generated: number;
  duplicatesSent: number;
  duplicatesRejected: number;
  admitted: number;
  admittedWithinWindow: number;
  deferredPeak: number;
  admissionSeconds: number;
  completed: Record<Kind, number>;
  awaitingApproval: number;
  humanReview: number;
  failures: number;
  retries: number;
  timeouts: number;
  reconciledFoundDone: number;
  resubmittedAfterReconcile: number;
  duplicateMutations: number;
  peakQueueDepth: number;
  peakLagSec: number;
  inFlightAtEnd: number;
  simulatedSeconds: number;
  agencies: AgencyReport[];
  series: Series;
  sampleEnvelopes: Envelope[];
}

export interface Envelope {
  envelopeId: string;
  idempotencyKey: string;
  kind: Kind;
  agency: string;
  serviceTier: number;
  createdAtSimSec: number;
  synthetic: true;
}

export const DEFAULT_AGENCIES: AgencyParams[] = [
  { id: "traffic", share: 0.3, quotaPerSec: 800 },
  { id: "passports", share: 0.25, quotaPerSec: 600 },
  { id: "hr", share: 0.2, quotaPerSec: 400 },
  { id: "municipal", share: 0.15, quotaPerSec: 300 },
  { id: "commerce", share: 0.1, quotaPerSec: 200 },
];

export const BENCHMARK_1M_60S: SimParams = {
  totalEnvelopes: 1_000_000,
  admissionWindowSec: 60,
  batchSize: 10_000,
  clientDuplicateRate: 0.02,
  frontDoorPerSec: 25_000,
  workers: 2_000,
  workerMsPerTask: 80,
  mix: { read: 0.6, prepare: 0.25, submit: 0.1, pay: 0.05 },
  approvalShare: 0.5,
  approvalDelaySec: [5, 120],
  agencies: DEFAULT_AGENCIES,
  paymentQuotaPerSec: 250,
  failureRate: 0.005,
  timeoutRate: 0.01,
  reconcileFoundDone: 0.6,
  reconcileDelaySec: 30,
  retryBackoffSec: 15,
  maxAttempts: 3,
  drainSec: 600,
  seed: 20261125,
};

/** Small deterministic PRNG so a run is repeatable for the same seed. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DT = 0.1; // simulated seconds per tick

/** Splits n into a binomial-ish integer using the expected value plus random rounding (fast for large n). */
function take(n: number, p: number, rnd: () => number) {
  const x = n * p;
  const f = Math.floor(x);
  return f + (rnd() < x - f ? 1 : 0);
}

export function simulate(p: SimParams, onProgress?: (share: number) => void): SimReport {
  const rnd = mulberry32(p.seed);
  const A = p.agencies.length;
  const shareSum = p.agencies.reduce((s, a) => s + a.share, 0) || 1;
  const cumShare = p.agencies.map((_, i) => p.agencies.slice(0, i + 1).reduce((s, a) => s + a.share, 0) / shareSum);
  const mixSum = KINDS.reduce((s, k) => s + p.mix[k], 0) || 1;
  const cumMix = KINDS.map((_, i) => KINDS.slice(0, i + 1).reduce((s, k) => s + p.mix[k], 0) / mixSum);
  const pick = (cum: number[]) => {
    const r = rnd();
    const i = cum.findIndex((c) => r <= c);
    return i < 0 ? cum.length - 1 : i;
  };

  // duplicate-key check: one bit per envelope sequence number
  const seen = new Uint8Array(p.totalEnvelopes);

  // queues hold counts by (kind, agency) — the model tracks quantities, not objects, after admission
  const idx = (k: number, a: number) => k * A + a;
  let pending: number[] = []; // generated, waiting for the front door (back-pressure), as seq/kind/agency triples
  let head = 0; // read position in pending (compacted now and then instead of shifting every tick)
  const intake = new Float64Array(KINDS.length * A);
  const dispatch = new Float64Array(KINDS.length * A); // waiting for an agency call
  const payQueue = new Float64Array(A); // payments wait for the payment rail's quota
  type Later = { at: number; k: number; a: number; n: number; attempt: number; reconcile?: boolean };
  const later: Later[] = []; // retries and reconciliations scheduled for a future tick (few, aggregated counts)

  const rep: SimReport = {
    params: p, generated: 0, duplicatesSent: 0, duplicatesRejected: 0, admitted: 0, admittedWithinWindow: 0,
    deferredPeak: 0, admissionSeconds: 0, completed: { read: 0, prepare: 0, submit: 0, pay: 0 }, awaitingApproval: 0,
    humanReview: 0, failures: 0, retries: 0, timeouts: 0, reconciledFoundDone: 0, resubmittedAfterReconcile: 0,
    duplicateMutations: 0, peakQueueDepth: 0, peakLagSec: 0, inFlightAtEnd: 0, simulatedSeconds: 0,
    agencies: p.agencies.map((a) => ({ id: a.id, calls: 0, completed: 0, throttledPeak: 0, backlogAtEnd: 0, failures: 0, timeouts: 0 })),
    series: { t: [], admitted: [], completed: [], queueDepth: [] },
    sampleEnvelopes: [],
  };

  let nextSeq = 0;
  let lastAdmitAt = 0;
  const ticksPerSec = Math.round(1 / DT);
  const windowTicks = Math.round(p.admissionWindowSec / DT);
  const endTicks = windowTicks + Math.round(p.drainSec / DT);
  const KA = KINDS.length * A;
  const endSec = Math.ceil(endTicks * DT) + Math.ceil(p.approvalDelaySec[1]) + 2;
  const approvals = new Float64Array(endSec * KA); // approved writes released per (second, kind, agency)
  let approvalsLeft = 0;
  const perTickGen = p.totalEnvelopes / windowTicks;
  let genCarry = 0;
  let batchLeft = 0;
  let secAdmitted = 0, secCompleted = 0;

  for (let tick = 0; tick < endTicks; tick++) {
    const now = tick * DT;

    // 1. generate envelopes in batches during the admission window
    if (tick < windowTicks && nextSeq < p.totalEnvelopes) {
      genCarry += perTickGen;
      let n = Math.min(Math.floor(genCarry), p.totalEnvelopes - nextSeq);
      genCarry -= n;
      while (n > 0) {
        if (batchLeft === 0) batchLeft = p.batchSize; // a new batch of envelopes is built
        const m = Math.min(n, batchLeft);
        for (let i = 0; i < m; i++) {
          const seq = nextSeq++;
          const k = pick(cumMix), a = pick(cumShare);
          pending.push(seq, k, a);
          if (rep.sampleEnvelopes.length < 3)
            rep.sampleEnvelopes.push({
              envelopeId: `env-${seq.toString().padStart(7, "0")}`, idempotencyKey: `idem-${p.seed.toString(36)}-${seq.toString(36)}`,
              kind: KINDS[k], agency: p.agencies[a].id, serviceTier: KINDS[k] === "pay" ? 4 : KINDS[k] === "submit" ? 3 : KINDS[k] === "prepare" ? 2 : 1,
              createdAtSimSec: Math.round(now * 10) / 10, synthetic: true,
            });
          if (rnd() < p.clientDuplicateRate) { pending.push(seq, k, a); rep.duplicatesSent++; }
        }
        rep.generated += m;
        batchLeft -= m;
        n -= m;
      }
    }

    // 2. front door: duplicate-key check, then admission up to capacity; the rest waits (back-pressure)
    let cap = Math.floor(p.frontDoorPerSec * DT);
    let tickAdmitted = 0;
    let read = head;
    while (read < pending.length && cap > 0) {
      const seq = pending[read], k = pending[read + 1], a = pending[read + 2];
      read += 3;
      if (seen[seq]) { rep.duplicatesRejected++; continue; }
      seen[seq] = 1;
      intake[idx(k, a)]++;
      tickAdmitted++;
      cap--;
    }
    head = read;
    if (head > 300_000) { pending = pending.slice(head); head = 0; }
    const waiting = (pending.length - head) / 3;
    rep.deferredPeak = Math.max(rep.deferredPeak, waiting);
    rep.admitted += tickAdmitted;
    if (tick < windowTicks) rep.admittedWithinWindow += tickAdmitted;
    if (tickAdmitted > 0) lastAdmitAt = now + DT;
    secAdmitted += tickAdmitted;

    // 3. workers take tasks from intake
    let wcap = (p.workers * DT * 1000) / p.workerMsPerTask;
    const intakeTotal = intake.reduce((s, x) => s + x, 0);
    const share = intakeTotal > 0 ? Math.min(1, wcap / intakeTotal) : 0;
    let tickCompleted = 0;
    for (let k = 0; k < KINDS.length && wcap > 0; k++)
      for (let a = 0; a < A; a++) {
        const n = Math.floor(intake[idx(k, a)] * share + (rnd() < (intake[idx(k, a)] * share) % 1 ? 1 : 0));
        const m = Math.min(n, intake[idx(k, a)]);
        if (m <= 0) continue;
        intake[idx(k, a)] -= m;
        wcap -= m;
        const kind = KINDS[k];
        if (kind === "prepare") { rep.completed.prepare += m; tickCompleted += m; }
        else if (kind === "read") dispatch[idx(k, a)] += m;
        else {
          // writes stop until the user approves the exact action; only an approved share is released
          const approved = take(m, p.approvalShare, rnd);
          rep.awaitingApproval += m - approved;
          const [lo, hi] = p.approvalDelaySec;
          for (let i = 0; i < approved; i++) approvals[Math.floor(now + lo + rnd() * (hi - lo)) * KA + idx(k, a)]++;
          approvalsLeft += approved;
        }
      }

    // 4. scheduled work becomes due: approvals (on whole seconds), retries, reconciliations
    if ((tick + 1) % ticksPerSec === 0) {
      const sec = Math.round(now);
      for (let k = 0; k < KINDS.length; k++)
        for (let a = 0; a < A; a++) {
          const n = approvals[sec * KA + idx(k, a)];
          if (!n) continue;
          approvalsLeft -= n;
          if (KINDS[k] === "pay") payQueue[a] += n;
          else dispatch[idx(k, a)] += n;
        }
    }
    for (let i = later.length - 1; i >= 0; i--) {
      const L = later[i];
      if (L.at > now) continue;
      later.splice(i, 1);
      if (L.reconcile) {
        // ask the agency what happened before doing anything again
        const done = take(L.n, p.reconcileFoundDone, rnd);
        rep.reconciledFoundDone += done;
        rep.completed[KINDS[L.k]] += done;
        rep.agencies[L.a].completed += done;
        tickCompleted += done;
        const redo = L.n - done;
        if (redo > 0) {
          rep.resubmittedAfterReconcile += redo;
          if (L.attempt >= p.maxAttempts) rep.humanReview += redo;
          else later.push({ at: now + p.retryBackoffSec, k: L.k, a: L.a, n: redo, attempt: L.attempt + 1 });
        }
        continue;
      }
      if (KINDS[L.k] === "pay") payQueue[L.a] += L.n;
      else dispatch[idx(L.k, L.a)] += L.n;
      if (L.attempt > 1) rep.retries += L.n;
    }

    // 5. per-agency dispatch within the agreed rate limit; payments also within the payment rail's limit
    let payTokens = p.paymentQuotaPerSec * DT;
    for (let a = 0; a < A; a++) {
      let tokens = p.agencies[a].quotaPerSec * DT;
      const sendFrom = (q: Float64Array, i: number, k: number, attempt: number) => {
        let n = Math.min(q[i], Math.floor(tokens));
        if (KINDS[k] === "pay") n = Math.min(n, Math.floor(payTokens));
        if (n <= 0) return;
        q[i] -= n;
        tokens -= n;
        if (KINDS[k] === "pay") payTokens -= n;
        rep.agencies[a].calls += n;
        const to = take(n, p.timeoutRate, rnd);
        const fail = take(n - to, p.failureRate, rnd);
        const ok = n - to - fail;
        rep.completed[KINDS[k]] += ok;
        rep.agencies[a].completed += ok;
        tickCompleted += ok;
        if (to > 0) {
          rep.timeouts += to;
          rep.agencies[a].timeouts += to;
          later.push({ at: now + p.reconcileDelaySec, k, a, n: to, attempt, reconcile: true });
        }
        if (fail > 0) {
          rep.failures += fail;
          rep.agencies[a].failures += fail;
          if (attempt >= p.maxAttempts) rep.humanReview += fail;
          else later.push({ at: now + p.retryBackoffSec, k, a, n: fail, attempt: attempt + 1 });
        }
      };
      for (let k = 0; k < KINDS.length; k++) sendFrom(dispatch, idx(k, a), k, 1);
      sendFrom(payQueue, a, KINDS.indexOf("pay"), 1);
      const backlog = KINDS.reduce((s, _, k) => s + dispatch[idx(k, a)], 0) + payQueue[a];
      rep.agencies[a].throttledPeak = Math.max(rep.agencies[a].throttledPeak, backlog);
    }

    // 6. queue depth and lag (time to clear the current front-door and worker backlog at current rates)
    const depth = (pending.length - head) / 3 + intake.reduce((s, x) => s + x, 0) + dispatch.reduce((s, x) => s + x, 0) + payQueue.reduce((s, x) => s + x, 0);
    rep.peakQueueDepth = Math.max(rep.peakQueueDepth, depth);
    const frontBacklog = (pending.length - head) / 3 + intake.reduce((s, x) => s + x, 0);
    const rate = Math.min(p.frontDoorPerSec, (p.workers * 1000) / p.workerMsPerTask);
    rep.peakLagSec = Math.max(rep.peakLagSec, frontBacklog / rate);
    secCompleted += tickCompleted;

    if ((tick + 1) % ticksPerSec === 0) {
      rep.series.t.push(Math.round(now + DT));
      rep.series.admitted.push(secAdmitted);
      rep.series.completed.push(secCompleted);
      rep.series.queueDepth.push(Math.round(depth));
      secAdmitted = 0; secCompleted = 0;
      onProgress?.(tick / endTicks);
    }

    // stop early once everything that can finish has finished
    if (tick >= windowTicks && depth === 0 && later.length === 0 && approvalsLeft === 0) {
      rep.simulatedSeconds = Math.round(now + DT);
      break;
    }
    rep.simulatedSeconds = Math.round(now + DT);
  }

  rep.admissionSeconds = Math.round(lastAdmitAt * 10) / 10;
  rep.inFlightAtEnd = Math.round(approvalsLeft + (pending.length - head) / 3 + intake.reduce((s, x) => s + x, 0) + dispatch.reduce((s, x) => s + x, 0) + payQueue.reduce((s, x) => s + x, 0) + later.reduce((s, L) => s + L.n, 0));
  rep.agencies.forEach((r, a) => { r.backlogAtEnd = Math.round(KINDS.reduce((s, _, k) => s + dispatch[idx(k, a)], 0) + payQueue[a]); });
  return rep;
}

/** The brief's arithmetic: one million tasks over different windows, as tasks per second. */
export const RATE_TABLE: { label: { en: string; ar: string }; seconds: number }[] = [
  { label: { en: "1,000,000 tasks per day", ar: "مليون مهمة في اليوم" }, seconds: 86_400 },
  { label: { en: "1,000,000 tasks per hour", ar: "مليون مهمة في الساعة" }, seconds: 3_600 },
  { label: { en: "1,000,000 tasks per minute", ar: "مليون مهمة في الدقيقة" }, seconds: 60 },
  { label: { en: "1,000,000 tasks per 10 seconds", ar: "مليون مهمة في 10 ثوانٍ" }, seconds: 10 },
];
