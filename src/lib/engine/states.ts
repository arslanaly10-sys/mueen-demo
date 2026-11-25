import type { L, TxState } from "../types";

// Transaction state model from the concept paper (section 6), extended with an explicit
// payment-confirmed state so "confirm", "pay" and "submit" remain separate approvals.
export const TRANSITIONS: Record<TxState, TxState[]> = {
  REQUESTED: ["IDENTITY_VERIFIED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  IDENTITY_VERIFIED: ["AUTHORITY_CHECKED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  AUTHORITY_CHECKED: ["PREREQUISITES_CHECKED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  PREREQUISITES_CHECKED: ["PREPARED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  PREPARED: ["USER_CONFIRMED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  USER_CONFIRMED: ["PAYMENT_CONFIRMED", "RECONCILIATION_REQUIRED", "BLOCKED", "HUMAN_REVIEW", "CANCELLED"],
  RECONCILIATION_REQUIRED: ["PAYMENT_CONFIRMED", "HUMAN_REVIEW", "BLOCKED"],
  PAYMENT_CONFIRMED: ["SUBMITTED", "BLOCKED", "HUMAN_REVIEW", "RECONCILIATION_REQUIRED"],
  SUBMITTED: ["GOVERNMENT_CONFIRMED", "HUMAN_REVIEW", "RECONCILIATION_REQUIRED"],
  GOVERNMENT_CONFIRMED: ["RECEIPT_ISSUED"],
  RECEIPT_ISSUED: [],
  BLOCKED: ["CANCELLED", "HUMAN_REVIEW"],
  HUMAN_REVIEW: ["CANCELLED"],
  CANCELLED: [],
};

export const canTransition = (from: TxState, to: TxState) => TRANSITIONS[from].includes(to);

export const TERMINAL: TxState[] = ["RECEIPT_ISSUED", "CANCELLED"];

export const HAPPY_PATH: TxState[] = [
  "REQUESTED",
  "IDENTITY_VERIFIED",
  "AUTHORITY_CHECKED",
  "PREREQUISITES_CHECKED",
  "PREPARED",
  "USER_CONFIRMED",
  "PAYMENT_CONFIRMED",
  "SUBMITTED",
  "GOVERNMENT_CONFIRMED",
  "RECEIPT_ISSUED",
];

export const STATE_LABEL: Record<TxState, L> = {
  REQUESTED: { en: "Request received", ar: "تم استلام الطلب" },
  IDENTITY_VERIFIED: { en: "Identity verified", ar: "تم التحقق من الهوية" },
  AUTHORITY_CHECKED: { en: "Authority checked", ar: "تم التحقق من الصلاحية" },
  PREREQUISITES_CHECKED: { en: "Information checked", ar: "تم التحقق من المعلومات" },
  PREPARED: { en: "Ready for your approval", ar: "جاهز لموافقتك" },
  USER_CONFIRMED: { en: "Details approved · payment pending", ar: "تمت الموافقة على التفاصيل · بانتظار الدفع" },
  PAYMENT_CONFIRMED: { en: "Payment confirmed", ar: "تم تأكيد الدفع" },
  SUBMITTED: { en: "Submitted to agency", ar: "أُرسل إلى الجهة" },
  GOVERNMENT_CONFIRMED: { en: "Confirmed by agency", ar: "أكدته الجهة" },
  RECEIPT_ISSUED: { en: "Receipt issued", ar: "صدر الإيصال" },
  BLOCKED: { en: "Action needed", ar: "إجراء مطلوب" },
  HUMAN_REVIEW: { en: "Review required", ar: "مراجعة مطلوبة" },
  RECONCILIATION_REQUIRED: { en: "Review required · status being reconciled", ar: "مراجعة مطلوبة · جارٍ مطابقة الحالة" },
  CANCELLED: { en: "Cancelled", ar: "أُلغي" },
};

/** Brand status labels — distinguish the agent's role from the agency's. */
export function brandStatus(state: TxState, agency: L): { label: L; tone: "info" | "ok" | "warn" | "error" | "neutral" } {
  switch (state) {
    case "REQUESTED":
    case "IDENTITY_VERIFIED":
    case "AUTHORITY_CHECKED":
    case "PREREQUISITES_CHECKED":
      return { label: { en: "Information checked", ar: "تم التحقق من المعلومات" }, tone: "info" };
    case "PREPARED":
    case "USER_CONFIRMED":
      return { label: { en: "Ready for your approval", ar: "جاهز لموافقتك" }, tone: "info" };
    case "PAYMENT_CONFIRMED":
    case "SUBMITTED":
      return { label: { en: `Submitted to ${agency.en}`, ar: `أُرسل إلى ${agency.ar}` }, tone: "info" };
    case "GOVERNMENT_CONFIRMED":
    case "RECEIPT_ISSUED":
      return { label: { en: `Confirmed by ${agency.en}`, ar: `أكدته ${agency.ar}` }, tone: "ok" };
    case "BLOCKED":
      return { label: { en: "Action needed", ar: "إجراء مطلوب" }, tone: "warn" };
    case "HUMAN_REVIEW":
    case "RECONCILIATION_REQUIRED":
      return { label: { en: "Review required", ar: "مراجعة مطلوبة" }, tone: "warn" };
    case "CANCELLED":
      return { label: { en: "Cancelled", ar: "أُلغي" }, tone: "neutral" };
  }
}
