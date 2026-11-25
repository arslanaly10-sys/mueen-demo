import "server-only";
import { createHmac } from "node:crypto";
import type { AuditActor, AuditEvent, AuditHead, L, Transaction } from "../types";

// Server-held key. In production this would live in an HSM / KMS managed by the operator.
const SECRET = process.env.AUDIT_SIGNING_SECRET || "mueen-demo-local-secret-change-me";

export const GENESIS = "0".repeat(64);

const hmac = (s: string) => createHmac("sha256", SECRET).update(s).digest("hex");

function eventPayload(e: Omit<AuditEvent, "hash">) {
  return JSON.stringify([e.seq, e.at, e.actor, e.type, e.txId ?? null, e.personaId ?? null, e.summary, e.data ?? null, e.prevHash]);
}

export interface NewEvent {
  actor: AuditActor;
  type: string;
  txId?: string;
  personaId?: string;
  summary: L;
  data?: Record<string, unknown>;
}

/** Appends events to a tamper-evident chain: each hash covers the previous hash. */
export function chain(head: AuditHead | null, events: NewEvent[]): AuditEvent[] {
  let seq = head?.seq ?? 0;
  let prev = head?.hash ?? GENESIS;
  return events.map((e) => {
    seq += 1;
    const base = { ...e, seq, at: new Date().toISOString(), prevHash: prev };
    const hash = hmac(eventPayload(base));
    prev = hash;
    return { ...base, hash };
  });
}

export function verifyChain(events: AuditEvent[]): { ok: boolean; count: number; brokenAt?: number } {
  let prev = GENESIS;
  for (const e of events) {
    if (e.prevHash !== prev) return { ok: false, count: events.length, brokenAt: e.seq };
    const { hash, ...rest } = e;
    if (hmac(eventPayload(rest)) !== hash) return { ok: false, count: events.length, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true, count: events.length };
}

/** Transactions are signed so the stateless backend can reject client-side tampering. */
export function signTx(tx: Transaction): Transaction {
  const { sig: _omit, ...rest } = tx;
  void _omit;
  return { ...rest, sig: hmac(JSON.stringify(rest)) };
}

export function verifyTx(tx: Transaction): boolean {
  const { sig, ...rest } = tx;
  return !!sig && hmac(JSON.stringify(rest)) === sig;
}

export const shortHash = (s: string) => hmac(s).slice(0, 10).toUpperCase();
