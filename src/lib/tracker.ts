import type { L, Transaction, TxState } from "./types";

/** The task tracker's statuses (the brief's seven, plus cancelled), each mapped from engine states. */
export type Bucket = "queued" | "in_progress" | "awaiting_approval" | "blocked" | "outcome_unknown" | "human_review" | "completed" | "cancelled";

export const BUCKET_OF: Record<TxState, Bucket> = {
  REQUESTED: "queued",
  IDENTITY_VERIFIED: "in_progress",
  AUTHORITY_CHECKED: "in_progress",
  PREREQUISITES_CHECKED: "in_progress",
  PREPARED: "awaiting_approval", // details shown; waiting for the user's submission approval
  USER_CONFIRMED: "awaiting_approval", // details approved; waiting for the separate payment approval
  PAYMENT_CONFIRMED: "in_progress",
  SUBMITTED: "in_progress",
  GOVERNMENT_CONFIRMED: "in_progress",
  RECEIPT_ISSUED: "completed",
  BLOCKED: "blocked",
  HUMAN_REVIEW: "human_review",
  RECONCILIATION_REQUIRED: "outcome_unknown",
  CANCELLED: "cancelled",
};

export const BUCKETS: { id: Bucket; label: L; tone: "ok" | "warn" | "error" | "info" | "plain" }[] = [
  { id: "queued", label: { en: "Queued", ar: "في الانتظار" }, tone: "plain" },
  { id: "in_progress", label: { en: "In progress", ar: "قيد التنفيذ" }, tone: "info" },
  { id: "awaiting_approval", label: { en: "Awaiting approval", ar: "بانتظار موافقتك" }, tone: "warn" },
  { id: "blocked", label: { en: "Blocked", ar: "متوقف" }, tone: "error" },
  { id: "outcome_unknown", label: { en: "Outcome unknown", ar: "النتيجة غير معروفة" }, tone: "warn" },
  { id: "human_review", label: { en: "Human review", ar: "مراجعة بشرية" }, tone: "warn" },
  { id: "completed", label: { en: "Completed", ar: "مكتملة" }, tone: "ok" },
  { id: "cancelled", label: { en: "Cancelled", ar: "ملغاة" }, tone: "plain" },
];

export const bucketOf = (tx: Transaction) => BUCKET_OF[tx.state];

/** Seconds from request to the agency's receipt, for completed tasks only. */
export function latencySec(tx: Transaction): number | null {
  if (!tx.receipt) return null;
  return Math.max(0, (new Date(tx.receipt.issuedAt).getTime() - new Date(tx.createdAt).getTime()) / 1000);
}
