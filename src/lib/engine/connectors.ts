import "server-only";
import type { Check, Persona, Transaction } from "../types";
import type { ServiceDef } from "../services";
import { addDuration } from "../services";
import { shortHash } from "./crypto";

// MOCK government connectors. They stand in for entity-owned APIs behind a government
// integration gateway. No real government system is contacted.

/** Read-only prerequisite lookup (Tier 1). */
export function readPrerequisites(service: ServiceDef, persona: Persona, targetId: string): Check[] {
  return service.checks(persona, targetId);
}

/** Simulated payment gateway. Payment authorisation is idempotent on the payment reference. */
const settledPayments = new Set<string>();

export function requestPayment(
  tx: Transaction,
  persona: Persona,
): { outcome: "confirmed" | "timeout"; reference: string } {
  const reference = "PAY-" + shortHash("pay:" + tx.idempotencyKey);
  // The gateway always records the payment; a configured fault makes the RESPONSE get lost.
  settledPayments.add(reference);
  const injectTimeout = persona.faults?.paymentTimeout?.includes(tx.serviceId) && (tx.payment?.attempts ?? 0) === 0;
  return { outcome: injectTimeout ? "timeout" : "confirmed", reference };
}

/** Reconciliation: ask the payment authority for the authoritative status of a reference. */
export function paymentStatus(reference: string): "confirmed" | "not_found" {
  // Stateless serverless instances may not share memory, so the mock derives the answer
  // from the reference format (every reference this gateway issued was settled).
  return settledPayments.has(reference) || reference.startsWith("PAY-") ? "confirmed" : "not_found";
}

/** Submission is idempotent: the same idempotency key always yields the same agency reference. */
export function submit(tx: Transaction): { reference: string } {
  return { reference: "REQ-" + shortHash("submit:" + tx.idempotencyKey) };
}

/** Authoritative status from the agency, including the official receipt. */
export function agencyStatus(service: ServiceDef, persona: Persona, tx: Transaction) {
  const duration = service.durations[tx.durationIndex] ?? service.durations[0];
  return {
    status: "completed" as const,
    receipt: {
      number: "RCPT-" + shortHash("receipt:" + tx.idempotencyKey),
      issuedAt: new Date().toISOString(),
      newExpiry: addDuration(service.expiryOf(persona, tx.targetId), duration),
      agency: service.agency,
    },
  };
}
