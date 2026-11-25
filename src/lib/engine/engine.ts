import "server-only";
import { randomUUID } from "node:crypto";
import type {
  Action,
  AppointmentPurpose,
  AdminConfig,
  AuditEvent,
  AuditHead,
  L,
  Mandate,
  Persona,
  ServiceId,
  Transaction,
  TxState,
} from "../types";
import { getPersona } from "../personas";
import { SERVICE_MAP, type ServiceDef } from "../services";
import { evaluate } from "./policy";
import { canTransition, STATE_LABEL } from "./states";
import { chain, shortHash, signMandate, signSession, signStepUp, signTx, verifyMandate, verifySession, verifyStepUp, verifyTx, type NewEvent } from "./crypto";
import * as connectors from "./connectors";

export type EngineAction =
  | "login"
  | "session"
  | "review"
  | "appointment"
  | "stepup"
  | "grant"
  | "revoke"
  | "start"
  | "confirm"
  | "pay"
  | "reconcile"
  | "submit"
  | "track"
  | "cancel"
  | "escalate"
  | "admin";

export interface EngineRequest {
  action: EngineAction;
  personaId?: string;
  auditHead: AuditHead | null;
  config: AdminConfig;
  tx?: Transaction;
  mandate?: Mandate | null;
  serviceId?: ServiceId;
  targetId?: string;
  durationIndex?: number;
  grant?: { actions: Action[]; hours: number; spendLimit?: number };
  appointment?: { op: "slots" | "reserve" | "cancel"; purpose: AppointmentPurpose; slotId?: string; ref?: string };
  adminEvent?: { type: string; summary: L; data?: Record<string, unknown> };
  injectionNote?: boolean;
  sessionEvent?: SessionEvent;
  /** signed session from login; person-scoped actions act only for its persona */
  session?: string;
  /** a fresh step-up token, required for Tier 3 (submit) and Tier 4 (pay) approvals */
  stepUp?: string;
  /** the demo one-time code, checked by the server at login and step-up (never a real credential) */
  code?: string;
  /** a human service officer's decision on a case in the review queue */
  review?: { decision: "approve" | "return" | "reject"; note?: string; officer?: string };
}

// ---------------------------------------------------------------- appointments (mock connectors)

export interface Slot { id: string; label: L; place: L; startsAt: string }
export interface Booking { ref: string; purpose: AppointmentPurpose; slot: Slot; personaId: string; connectorId: string; status: "reserved" | "cancelled"; at: string }

const APPT_CONNECTOR: Record<AppointmentPurpose, { id: string; places: L[] }> = {
  driving_medical: { id: "conn.health.medical-exam-centres.mock", places: [{ en: "Approved medical exam centre, Al Olaya (synthetic)", ar: "مركز فحص طبي معتمد، العليا (افتراضي)" }, { en: "Approved medical exam centre, Al Malaz (synthetic)", ar: "مركز فحص طبي معتمد، الملز (افتراضي)" }] },
  primary_care: { id: "conn.health.primary-care.mock", places: [{ en: "Primary health care centre, Al Nakheel (synthetic)", ar: "مركز الرعاية الصحية الأولية، النخيل (افتراضي)" }] },
};

/** Deterministic open slots for the next three working days, so the same request sees the same slots. */
function slotsFor(purpose: AppointmentPurpose): Slot[] {
  const out: Slot[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  const times = [6, 7.5, 10]; // 09:00, 10:30, 13:00 in Riyadh (UTC+3)
  let days = 0;
  while (out.length < 6 && days < 10) {
    d.setUTCDate(d.getUTCDate() + 1);
    days++;
    const wd = d.getUTCDay();
    if (wd === 5 || wd === 6) continue; // Friday and Saturday
    APPT_CONNECTOR[purpose].places.forEach((place, pi) =>
      times.slice(0, pi === 0 ? 2 : 1).forEach((h) => {
        const at = new Date(d.getTime() + h * 3600_000);
        const day = at.toISOString().slice(0, 10);
        const hh = String(Math.floor(h + 3)).padStart(2, "0") + ":" + (h % 1 ? "30" : "00");
        out.push({ id: `${purpose}:${pi}:${at.toISOString()}`, startsAt: at.toISOString(), place, label: { en: `${day} at ${hh}`, ar: `${day} الساعة ${hh}` } });
      }),
    );
  }
  return out.slice(0, 6);
}

export interface EngineResponse {
  /** a renewed session token (the server-side session expires after 30 minutes without activity) */
  session?: string;
  stepUp?: string;
  tx?: Transaction;
  slots?: Slot[];
  booking?: Booking;
  mandate?: Mandate;
  events: AuditEvent[];
  error?: { code: string; message: L };
}

class EngineError extends Error {
  constructor(public code: string, public messageL: L) {
    super(code);
  }
}

const now = () => new Date().toISOString();

function move(tx: Transaction, to: TxState, note: L, events: NewEvent[]) {
  if (!canTransition(tx.state, to))
    throw new EngineError("INVALID_TRANSITION", {
      en: `Invalid transition ${tx.state} → ${to}. The request was not changed.`,
      ar: `انتقال غير مسموح ${tx.state} ← ${to}. لم يتغير الطلب.`,
    });
  tx.history.push({ state: to, at: now(), note });
  events.push({
    actor: to === "GOVERNMENT_CONFIRMED" || to === "RECEIPT_ISSUED" ? "agency" : "system",
    type: "STATE_" + to,
    txId: tx.id,
    personaId: tx.personaId,
    summary: { en: `${STATE_LABEL[to].en} — ${note.en}`, ar: `${STATE_LABEL[to].ar} — ${note.ar}` },
    data: { from: tx.state, to },
  });
  tx.state = to;
  tx.updatedAt = now();
}

function policyGate(
  tx: Transaction,
  persona: Persona,
  service: ServiceDef,
  mandate: Mandate | null | undefined,
  action: Action,
  config: AdminConfig,
  events: NewEvent[],
): boolean {
  const d = evaluate({ persona, service, targetId: tx.targetId, mandate, action, config, amount: action === "pay" ? tx.preview?.fee : undefined });
  events.push({
    actor: "policy",
    type: d.allow ? "POLICY_ALLOW" : "POLICY_DENY",
    txId: tx.id,
    personaId: persona.id,
    summary: {
      en: `${d.allow ? "Allowed" : "Denied"} “${action}” (${d.code}) under policy ${config.policyVersion}`,
      ar: `${d.allow ? "سُمح" : "رُفض"} إجراء «${action}» (${d.code}) وفق السياسة ${config.policyVersion}`,
    },
    data: { action, code: d.code, mandateId: mandate?.id ?? null, policyVersion: config.policyVersion },
  });
  if (!d.allow) {
    tx.blocker = { reason: d.reason };
    if (tx.state !== "BLOCKED" && canTransition(tx.state, "BLOCKED")) move(tx, "BLOCKED", d.reason, events);
  }
  return d.allow;
}

function requireTx(req: EngineRequest): Transaction {
  if (!req.tx) throw new EngineError("NO_TX", { en: "Missing transaction.", ar: "الطلب غير موجود." });
  if (!verifyTx(req.tx))
    throw new EngineError("TX_TAMPERED", {
      en: "This transaction copy failed its integrity check and was rejected.",
      ar: "فشلت نسخة الطلب في فحص السلامة وتم رفضها.",
    });
  return structuredClone(req.tx);
}

function ctx(personaId?: string, serviceId?: ServiceId) {
  const persona = personaId ? getPersona(personaId) : undefined;
  if (!persona) throw new EngineError("NO_PERSONA", { en: "Unknown identity.", ar: "هوية غير معروفة." });
  const service = serviceId ? SERVICE_MAP[serviceId] : undefined;
  if (serviceId && !service) throw new EngineError("NO_SERVICE", { en: "Unknown service.", ar: "خدمة غير معروفة." });
  return { persona, service: service! };
}

function buildPreview(tx: Transaction, persona: Persona, service: ServiceDef) {
  const duration = service.durations[tx.durationIndex] ?? service.durations[0];
  tx.preview = {
    fields: service.previewFields(persona, tx.targetId),
    fee: service.feeFor(duration),
    payee: service.payee,
    duration,
  };
}

/** Citizen-side events the audit log records. The server owns their wording; the browser only names the event. */
export type SessionEvent = "CONSENT_GIVEN" | "CONSENT_WITHDRAWN" | "SIGNED_OUT" | "SESSION_TIMEOUT" | "DATA_EXPORTED" | "DATA_DELETED";
const SESSION_SUMMARY: Record<SessionEvent, L> = {
  CONSENT_GIVEN: { en: "Consented to the privacy notice (version 2026-11)", ar: "وافق على إشعار الخصوصية (الإصدار 2026-11)" },
  CONSENT_WITHDRAWN: { en: "Withdrew consent; the agent can no longer act", ar: "سحب الموافقة؛ لم يعد بإمكان الوكيل التصرف" },
  SIGNED_OUT: { en: "Signed out", ar: "سجّل الخروج" },
  SESSION_TIMEOUT: { en: "Signed out after 10 minutes without activity", ar: "سُجّل الخروج بعد 10 دقائق دون نشاط" },
  DATA_EXPORTED: { en: "Exported a copy of their data", ar: "صدّر نسخة من بياناته" },
  DATA_DELETED: { en: "Deleted their requests, authorities and conversation from this device", ar: "حذف طلباته وصلاحياته ومحادثته من هذا الجهاز" },
};

const PERSON_ACTIONS: EngineAction[] = ["grant", "revoke", "start", "confirm", "pay", "reconcile", "submit", "track", "cancel", "escalate", "session", "appointment", "stepup"];

// the demo's one-time code; a real deployment verifies through the national identity platform instead
const DEMO_CODE = "246810";
const APPROVAL_WINDOW_MS = 15 * 60_000;
const openApprovalWindow = (tx: Transaction) => { tx.approvalExpiresAt = new Date(Date.now() + APPROVAL_WINDOW_MS).toISOString(); };

/** Tier 3 and 4 approvals need a fresh step-up and an open approval window. */
function approvalGate(tx: Transaction, req: EngineRequest, events: NewEvent[]): boolean {
  if (!verifyStepUp(req.stepUp, tx.personaId))
    throw new EngineError("STEP_UP_REQUIRED", { en: "Confirm it's you before approving. Nothing was sent.", ar: "أكّد هويتك قبل الموافقة. لم يُرسل أي شيء." });
  if (tx.approvalExpiresAt && new Date(tx.approvalExpiresAt).getTime() < Date.now()) {
    tx.blocker = { reason: { en: "The approval window closed after 15 minutes, so the checks must run again before anything is sent.", ar: "أُغلقت نافذة الموافقة بعد 15 دقيقة، فيجب إعادة الفحوص قبل إرسال أي شيء." }, nextStep: { en: "Ask again to re-run the checks.", ar: "اطلب مجددًا لإعادة الفحوص." } };
    move(tx, "BLOCKED", { en: "Approval window expired; nothing was sent", ar: "انتهت نافذة الموافقة؛ لم يُرسل أي شيء" }, events);
    return false;
  }
  return true;
}

export function runEngine(req: EngineRequest): EngineResponse {
  const events: NewEvent[] = [];
  const out: EngineResponse = { events: [] };
  // the operator's hard stop lives on the server: a browser cannot leave it out of its request
  if (process.env.PLATFORM_KILL_SWITCH === "1") req = { ...req, config: { ...req.config, killSwitch: true } };
  try {
    if (PERSON_ACTIONS.includes(req.action)) {
      // authentication: the session proves who is asking; it does not by itself authorise anything
      const who = verifySession(req.session);
      if (!who) throw new EngineError("SESSION_REQUIRED", { en: "Your session has ended. Sign in again to continue; nothing was sent.", ar: "انتهت جلستك. سجّل الدخول مجددًا للمتابعة؛ لم يُرسل أي شيء." });
      const claimed = req.tx?.personaId ?? req.mandate?.personaId ?? req.personaId ?? who;
      if (claimed !== who) throw new EngineError("WRONG_PERSON", { en: "This session cannot act for that person.", ar: "لا يمكن لهذه الجلسة التصرف عن هذا الشخص." });
      req = { ...req, personaId: who };
      if (!verifyMandate(req.mandate)) throw new EngineError("MANDATE_TAMPERED", { en: "This authority failed its integrity check and was rejected. Grant it again.", ar: "فشلت هذه الصلاحية في فحص السلامة ورُفضت. امنحها مجددًا." });
      out.session = signSession(who);
    }
    switch (req.action) {
      case "login": {
        const { persona } = ctx(req.personaId);
        if (req.code !== DEMO_CODE) throw new EngineError("BAD_CODE", { en: "That code is not correct. Enter the 6 digits again or use the demo code.", ar: "الرمز غير صحيح. أدخل الأرقام الستة مرة أخرى أو استخدم رمز العرض." });
        events.push({
          actor: "system",
          type: "IDENTITY_VERIFIED",
          personaId: persona.id,
          summary: { en: "Signed in with simulated national single sign-on + one-time code", ar: "تسجيل دخول عبر محاكاة النفاذ الوطني الموحد + رمز التحقق" },
          data: { method: "simulated-sso-otp" },
        });
        out.session = signSession(persona.id);
        break;
      }

      case "session": {
        const { persona } = ctx(req.personaId);
        const ev = req.sessionEvent;
        if (!ev || !(ev in SESSION_SUMMARY)) throw new EngineError("BAD_SESSION", { en: "Unknown session event.", ar: "حدث جلسة غير معروف." });
        events.push({ actor: "user", type: ev, personaId: persona.id, summary: SESSION_SUMMARY[ev], data: ev === "CONSENT_GIVEN" ? { noticeVersion: "2026-11" } : undefined });
        break;
      }

      case "grant": {
        const { persona, service } = ctx(req.personaId, req.serviceId);
        if (!req.targetId || !req.grant) throw new EngineError("BAD_GRANT", { en: "Incomplete authority request.", ar: "طلب صلاحية غير مكتمل." });
        const allowed: Action[] = ["read", "prepare", "submit", "pay"];
        const actions = req.grant.actions.filter((a) => allowed.includes(a));
        const hours = Math.min(Math.max(req.grant.hours, 1), 24 * 30);
        const mandate: Mandate = {
          id: "MND-" + randomUUID().slice(0, 8).toUpperCase(),
          personaId: persona.id,
          serviceId: service.id,
          targetId: req.targetId,
          actions,
          grantedAt: now(),
          expiresAt: new Date(Date.now() + hours * 3600_000).toISOString(),
          ...(actions.includes("pay") && Number.isFinite(req.grant.spendLimit) ? { spendLimit: Math.min(Math.max(Math.round(req.grant.spendLimit!), 0), 10_000) } : {}),
        };
        out.mandate = signMandate(mandate);
        events.push({
          actor: "user",
          type: "MANDATE_GRANTED",
          personaId: persona.id,
          summary: {
            en: `Granted scoped authority for ${service.name.en} (${actions.join(", ")}) for ${hours}h`,
            ar: `منح صلاحية محددة لخدمة ${service.name.ar} (${actions.join("، ")}) لمدة ${hours} ساعة`,
          },
          data: { mandateId: mandate.id, serviceId: service.id, targetId: req.targetId, actions, expiresAt: mandate.expiresAt, spendLimit: mandate.spendLimit ?? null },
        });
        break;
      }

      case "revoke": {
        const { persona } = ctx(req.personaId);
        if (!req.mandate) throw new EngineError("NO_MANDATE", { en: "No authority to revoke.", ar: "لا توجد صلاحية لإلغائها." });
        out.mandate = signMandate({ ...req.mandate, revokedAt: now() });
        events.push({
          actor: "user",
          type: "MANDATE_REVOKED",
          personaId: persona.id,
          summary: { en: `Revoked authority ${req.mandate.id}; all future agent actions under it are blocked`, ar: `ألغى الصلاحية ${req.mandate.id}؛ مُنعت كل إجراءات الوكيل اللاحقة تحتها` },
          data: { mandateId: req.mandate.id },
        });
        break;
      }

      case "start": {
        const { persona, service } = ctx(req.personaId, req.serviceId);
        if (!req.targetId) throw new EngineError("NO_TARGET", { en: "Choose which document to renew.", ar: "اختر الوثيقة المراد تجديدها." });
        const t = now();
        const tx: Transaction = {
          id: "TX-" + randomUUID().slice(0, 8).toUpperCase(),
          personaId: persona.id,
          serviceId: service.id,
          targetId: req.targetId,
          mandateId: req.mandate?.id ?? "",
          state: "REQUESTED",
          history: [{ state: "REQUESTED", at: t, note: { en: "Request received from the conversation", ar: "استُلم الطلب من المحادثة" } }],
          checks: [],
          durationIndex: 0,
          idempotencyKey: randomUUID(),
          createdAt: t,
          updatedAt: t,
        };
        events.push({
          actor: "agent",
          type: "TX_CREATED",
          txId: tx.id,
          personaId: persona.id,
          summary: { en: `Agent opened a request for ${service.name.en}`, ar: `فتح الوكيل طلبًا لخدمة ${service.name.ar}` },
          data: { serviceId: service.id, targetId: tx.targetId, injectionNoted: !!req.injectionNote },
        });
        move(tx, "IDENTITY_VERIFIED", { en: "Session identity confirmed (simulated SSO)", ar: "تم تأكيد هوية الجلسة (محاكاة النفاذ الوطني)" }, events);

        const auth = service.authority(persona, tx.targetId);
        if (!auth.ok) {
          tx.blocker = { reason: auth.reason };
          events.push({ actor: "policy", type: "POLICY_DENY", txId: tx.id, personaId: persona.id, summary: { en: "Requester not eligible for this service", ar: "مقدم الطلب غير مؤهل لهذه الخدمة" }, data: { code: "NOT_ELIGIBLE_REQUESTER" } });
          move(tx, "BLOCKED", auth.reason, events);
          out.tx = signTx(tx);
          break;
        }
        if (!policyGate(tx, persona, service, req.mandate, "read", req.config, events)) {
          out.tx = signTx(tx);
          break;
        }
        move(tx, "AUTHORITY_CHECKED", auth.reason, events);

        const checks = connectors.readPrerequisites(service, persona, tx.targetId);
        tx.checks = checks;
        events.push({
          actor: "connector",
          type: "READ_PREREQUISITES",
          txId: tx.id,
          personaId: persona.id,
          summary: { en: `Read-only check of ${checks.length} prerequisites via ${service.agencyShort.en} mock connector`, ar: `فحص للقراءة فقط لعدد ${checks.length} متطلبات عبر موصل ${service.agencyShort.ar} التجريبي` },
          data: { fields: checks.map((c) => c.id), results: checks.map((c) => c.status) },
        });
        move(tx, "PREREQUISITES_CHECKED", { en: "Prerequisites checked against mock agency records", ar: "تم فحص المتطلبات مقابل السجلات التجريبية للجهة" }, events);

        const failed = checks.filter((c) => c.status === "fail");
        const unverified = checks.filter((c) => c.status === "unverified");
        if (failed.length) {
          const first = failed[0];
          tx.blocker = { reason: first.detail, nextStep: first.nextStep };
          const needsHuman = first.id === "absence";
          if (needsHuman) {
            tx.review = { reason: first.detail, caseId: "CASE-" + randomUUID().slice(0, 6).toUpperCase() };
            move(tx, "HUMAN_REVIEW", { en: "Routed to a human officer — the agent cannot resolve this", ar: "حُوّل إلى موظف مختص — لا يستطيع الوكيل معالجة هذا" }, events);
          } else {
            move(tx, "BLOCKED", { en: `Blocked: ${first.label.en}`, ar: `متوقف: ${first.label.ar}` }, events);
          }
        } else if (unverified.length) {
          tx.review = { reason: { en: "Some information could not be verified.", ar: "تعذر التحقق من بعض المعلومات." }, caseId: "CASE-" + randomUUID().slice(0, 6).toUpperCase() };
          move(tx, "HUMAN_REVIEW", { en: "Unverified information — human review", ar: "معلومات غير موثقة — مراجعة بشرية" }, events);
        } else if (policyGate(tx, persona, service, req.mandate, "prepare", req.config, events)) {
          buildPreview(tx, persona, service);
          openApprovalWindow(tx);
            move(tx, "PREPARED", { en: "Request prepared — nothing has been sent", ar: "تم تجهيز الطلب — لم يُرسل أي شيء" }, events);
        }
        out.tx = signTx(tx);
        break;
      }

      case "stepup": {
        const { persona } = ctx(req.personaId);
        if (req.code !== DEMO_CODE) throw new EngineError("BAD_CODE", { en: "That code is not correct. Enter the 6 digits again or use the demo code.", ar: "الرمز غير صحيح. أدخل الأرقام الستة مرة أخرى أو استخدم رمز العرض." });
        out.stepUp = signStepUp(persona.id);
        events.push({ actor: "user", type: "STEP_UP_VERIFIED", personaId: persona.id, summary: { en: "Re-verified identity for a Tier 3/4 approval (simulated, 5 minutes)", ar: "أعاد التحقق من الهوية لموافقة من المستوى 3 أو 4 (محاكاة، 5 دقائق)" }, data: { method: "simulated-otp" } });
        break;
      }

      case "confirm": {
        const tx = requireTx(req);
        const { persona, service } = ctx(tx.personaId, tx.serviceId);
        if (tx.state !== "PREPARED") throw new EngineError("BAD_STATE", { en: "This request is not awaiting approval.", ar: "هذا الطلب لا ينتظر الموافقة." });
        if (!approvalGate(tx, req, events)) { out.tx = signTx(tx); break; }
        if (typeof req.durationIndex === "number" && service.durations[req.durationIndex]) tx.durationIndex = req.durationIndex;
        if (policyGate(tx, persona, service, req.mandate, "submit", req.config, events)) {
          buildPreview(tx, persona, service);
          events.push({
            actor: "user",
            type: "USER_APPROVED_DETAILS",
            txId: tx.id,
            personaId: persona.id,
            summary: { en: `User approved exact submission details (${tx.preview!.duration.value} ${tx.preview!.duration.unit})`, ar: `وافق المستخدم على تفاصيل الإرسال (${tx.preview!.duration.value} ${tx.preview!.duration.unit === "year" ? "سنة" : "شهر"})` },
            data: { fields: tx.preview!.fields.map((f) => f.label.en), fee: tx.preview!.fee },
          });
          move(tx, "USER_CONFIRMED", { en: "You approved the details. Payment needs a separate approval.", ar: "وافقت على التفاصيل. الدفع يحتاج موافقة مستقلة." }, events);
          openApprovalWindow(tx);
        }
        out.tx = signTx(tx);
        break;
      }

      case "pay": {
        const tx = requireTx(req);
        const { persona, service } = ctx(tx.personaId, tx.serviceId);
        if (tx.state !== "USER_CONFIRMED") throw new EngineError("BAD_STATE", { en: "Payment is not expected at this step.", ar: "الدفع غير متوقع في هذه المرحلة." });
        if (!approvalGate(tx, req, events)) { out.tx = signTx(tx); break; }
        if (tx.payment && tx.payment.status !== "pending")
          throw new EngineError("DUPLICATE_PAYMENT", { en: "A payment already exists for this request. It will not be repeated.", ar: "يوجد دفع سابق لهذا الطلب، ولن يُكرر." });
        if (!policyGate(tx, persona, service, req.mandate, "pay", req.config, events)) {
          out.tx = signTx(tx);
          break;
        }
        events.push({
          actor: "user",
          type: "USER_APPROVED_PAYMENT",
          txId: tx.id,
          personaId: persona.id,
          summary: { en: `User approved payment of SAR ${tx.preview!.fee} to ${tx.preview!.payee.en}`, ar: `وافق المستخدم على دفع ${tx.preview!.fee} ريال إلى ${tx.preview!.payee.ar}` },
          data: { amount: tx.preview!.fee },
        });
        const r = connectors.requestPayment(tx, persona);
        tx.payment = { status: r.outcome === "confirmed" ? "confirmed" : "unknown", amount: tx.preview!.fee, reference: r.reference, attempts: (tx.payment?.attempts ?? 0) + 1 };
        events.push({
          actor: "connector",
          type: r.outcome === "confirmed" ? "PAYMENT_CONFIRMED" : "PAYMENT_TIMEOUT",
          txId: tx.id,
          personaId: persona.id,
          summary:
            r.outcome === "confirmed"
              ? { en: `Payment gateway confirmed ${r.reference}`, ar: `أكدت بوابة الدفع العملية ${r.reference}` }
              : { en: `Payment gateway timed out on ${r.reference} — status unknown, no retry`, ar: `انتهت مهلة بوابة الدفع للعملية ${r.reference} — الحالة غير معروفة، بلا إعادة محاولة` },
          data: { reference: r.reference },
        });
        if (r.outcome === "confirmed") move(tx, "PAYMENT_CONFIRMED", { en: `Payment ${r.reference} confirmed`, ar: `تم تأكيد الدفع ${r.reference}` }, events);
        else
          move(
            tx,
            "RECONCILIATION_REQUIRED",
            { en: "Payment response lost. The agent will reconcile instead of paying again.", ar: "فُقدت استجابة الدفع. سيقوم الوكيل بالمطابقة بدلًا من الدفع مرة أخرى." },
            events,
          );
        out.tx = signTx(tx);
        break;
      }

      case "reconcile": {
        const tx = requireTx(req);
        const { persona } = ctx(tx.personaId, tx.serviceId);
        if (tx.state !== "RECONCILIATION_REQUIRED" || !tx.payment) throw new EngineError("BAD_STATE", { en: "Nothing to reconcile.", ar: "لا يوجد ما يُطابق." });
        const s = connectors.paymentStatus(tx.payment.reference);
        events.push({
          actor: "connector",
          type: "PAYMENT_RECONCILED",
          txId: tx.id,
          personaId: persona.id,
          summary: { en: `Reconciled ${tx.payment.reference} with payment authority: ${s}`, ar: `تمت مطابقة ${tx.payment.reference} مع جهة الدفع: ${s === "confirmed" ? "مؤكد" : "غير موجود"}` },
          data: { reference: tx.payment.reference, status: s },
        });
        if (s === "confirmed") {
          tx.payment.status = "confirmed";
          move(tx, "PAYMENT_CONFIRMED", { en: "Reconciliation found the original payment — no second charge", ar: "وجدت المطابقة الدفعة الأصلية — دون خصم ثانٍ" }, events);
        } else {
          tx.review = { reason: { en: "Payment could not be reconciled.", ar: "تعذرت مطابقة الدفع." }, caseId: "CASE-" + randomUUID().slice(0, 6).toUpperCase() };
          move(tx, "HUMAN_REVIEW", { en: "Payment dispute routed to a human", ar: "حُوّل نزاع الدفع إلى موظف" }, events);
        }
        out.tx = signTx(tx);
        break;
      }

      case "submit": {
        const tx = requireTx(req);
        const { persona, service } = ctx(tx.personaId, tx.serviceId);
        if (tx.state !== "PAYMENT_CONFIRMED") throw new EngineError("BAD_STATE", { en: "Not ready to submit.", ar: "الطلب غير جاهز للإرسال." });
        if (!policyGate(tx, persona, service, req.mandate, "submit", req.config, events)) {
          out.tx = signTx(tx);
          break;
        }
        const r = connectors.submit(tx);
        tx.submission = { reference: r.reference, submittedAt: now() };
        events.push({
          actor: "connector",
          type: "SUBMITTED",
          txId: tx.id,
          personaId: persona.id,
          summary: { en: `Submitted once to ${service.agencyShort.en} with idempotency key; reference ${r.reference}`, ar: `أُرسل مرة واحدة إلى ${service.agencyShort.ar} بمفتاح منع التكرار؛ المرجع ${r.reference}` },
          data: { reference: r.reference, idempotencyKey: tx.idempotencyKey.slice(0, 8) + "…", connectorHealth: req.config.connectorHealth[service.id] ?? "up" },
        });
        move(tx, "SUBMITTED", { en: `Submitted to ${service.agency.en}`, ar: `أُرسل إلى ${service.agency.ar}` }, events);
        out.tx = signTx(tx);
        break;
      }

      case "track": {
        const tx = requireTx(req);
        const { persona, service } = ctx(tx.personaId, tx.serviceId);
        if (tx.state !== "SUBMITTED") throw new EngineError("BAD_STATE", { en: "Nothing to track.", ar: "لا يوجد ما يُتابع." });
        const s = connectors.agencyStatus(service, persona, tx);
        move(tx, "GOVERNMENT_CONFIRMED", { en: `Authoritative completion received from ${service.agencyShort.en}`, ar: `استُلم تأكيد رسمي من ${service.agencyShort.ar}` }, events);
        tx.receipt = s.receipt;
        move(tx, "RECEIPT_ISSUED", { en: `Receipt ${s.receipt.number} · valid until ${s.receipt.newExpiry}`, ar: `الإيصال ${s.receipt.number} · ساري حتى ${s.receipt.newExpiry}` }, events);
        out.tx = signTx(tx);
        break;
      }

      case "cancel": {
        const tx = requireTx(req);
        move(tx, "CANCELLED", { en: "Cancelled by you — nothing further will be sent", ar: "ألغيته — لن يُرسل أي شيء آخر" }, events);
        out.tx = signTx(tx);
        break;
      }

      case "escalate": {
        const tx = requireTx(req);
        tx.review = tx.review ?? { reason: tx.blocker?.reason ?? { en: "User asked for a human", ar: "طلب المستخدم موظفًا" }, caseId: "CASE-" + randomUUID().slice(0, 6).toUpperCase() };
        move(tx, "HUMAN_REVIEW", { en: "Handed to a human officer with full context and your consent", ar: "حُوّل إلى موظف مختص مع السياق الكامل وبموافقتك" }, events);
        out.tx = signTx(tx);
        break;
      }

      case "appointment": {
        const { persona } = ctx(req.personaId);
        const a = req.appointment;
        if (!a || !(a.purpose in APPT_CONNECTOR)) throw new EngineError("BAD_APPOINTMENT", { en: "Unknown appointment request.", ar: "طلب موعد غير معروف." });
        if (req.config.killSwitch) throw new EngineError("KILL_SWITCH", { en: "The platform operator has paused all agent actions (emergency stop).", ar: "أوقف مشغل المنصة جميع إجراءات الوكيل مؤقتًا (إيقاف طارئ)." });
        const c = APPT_CONNECTOR[a.purpose];
        if (a.op === "slots") {
          out.slots = slotsFor(a.purpose);
          events.push({ actor: "connector", type: "APPOINTMENT_SLOTS_READ", personaId: persona.id, summary: { en: `Read ${out.slots.length} open slots from ${c.id} (simulated)`, ar: `قراءة ${out.slots.length} مواعيد متاحة من ${c.id} (محاكاة)` }, data: { connector: c.id } });
        } else if (a.op === "reserve") {
          // a write: the UI sends it only after the person approves the exact slot
          const slot = slotsFor(a.purpose).find((x) => x.id === a.slotId);
          if (!slot) throw new EngineError("SLOT_GONE", { en: "That slot is no longer available. Choose another.", ar: "لم يعد هذا الموعد متاحًا. اختر موعدًا آخر." });
          const booking: Booking = { ref: "APPT-" + shortHash(`appt:${persona.id}:${slot.id}`), purpose: a.purpose, slot, personaId: persona.id, connectorId: c.id, status: "reserved", at: now() };
          out.booking = booking;
          events.push({ actor: "user", type: "USER_APPROVED_APPOINTMENT", personaId: persona.id, summary: { en: `Approved reserving ${slot.place.en}, ${slot.label.en}`, ar: `وافق على حجز ${slot.place.ar}، ${slot.label.ar}` }, data: { slotId: slot.id } });
          events.push({ actor: "connector", type: "APPOINTMENT_RESERVED", personaId: persona.id, summary: { en: `${c.id} reserved ${booking.ref} (simulated)`, ar: `حجز ${c.id} الموعد ${booking.ref} (محاكاة)` }, data: { ref: booking.ref, connector: c.id } });
        } else {
          if (!a.ref) throw new EngineError("BAD_APPOINTMENT", { en: "Missing booking reference.", ar: "مرجع الحجز مفقود." });
          events.push({ actor: "user", type: "APPOINTMENT_CANCELLED", personaId: persona.id, summary: { en: `Cancelled ${a.ref.slice(0, 20)} (simulated)`, ar: `ألغى ${a.ref.slice(0, 20)} (محاكاة)` }, data: { ref: a.ref.slice(0, 20), connector: c.id } });
        }
        break;
      }

      case "review": {
        const tx = requireTx(req);
        const { persona, service } = ctx(tx.personaId, tx.serviceId);
        const r = req.review;
        if (!verifyMandate(req.mandate)) throw new EngineError("MANDATE_TAMPERED", { en: "The case's authority failed its integrity check.", ar: "فشلت صلاحية الحالة في فحص السلامة." });
        if (tx.state !== "HUMAN_REVIEW" || !r || !["approve", "return", "reject"].includes(r.decision))
          throw new EngineError("BAD_REVIEW", { en: "This case is not waiting for review.", ar: "هذه الحالة ليست بانتظار المراجعة." });
        // the officer's note is untrusted text: bounded, and carried as data, never as instructions
        const note = (r.note ?? "").toString().replace(/\s+/g, " ").trim().slice(0, 300);
        if (r.decision !== "approve" && !note) throw new EngineError("NOTE_REQUIRED", { en: "Write a note for the beneficiary.", ar: "اكتب ملاحظة للمستفيد." });
        const officer = (r.officer ?? "officer.demo").toString().slice(0, 40);
        const caseId = tx.review?.caseId ?? tx.id;
        events.push({
          actor: "officer",
          type: r.decision === "approve" ? "REVIEW_APPROVED" : r.decision === "return" ? "REVIEW_RETURNED" : "REVIEW_REJECTED",
          txId: tx.id,
          personaId: persona.id,
          summary: r.decision === "approve"
            ? { en: `Officer verified the evidence for ${caseId}; returned to the beneficiary to approve`, ar: `تحقق الموظف من أدلة ${caseId}؛ أُعيد إلى المستفيد للموافقة` }
            : r.decision === "return"
              ? { en: `Officer returned ${caseId} to the beneficiary with a note`, ar: `أعاد الموظف ${caseId} إلى المستفيد مع ملاحظة` }
              : { en: `Officer rejected ${caseId}`, ar: `رفض الموظف ${caseId}` },
          data: { caseId, officer, note: note || null },
        });
        if (r.decision === "approve") {
          // the officer's verification replaces the unresolved checks; the beneficiary still approves the action
          tx.checks = tx.checks.map((c) => (c.status === "pass" ? c : { ...c, status: "pass", detail: { en: `Verified by a human officer (${caseId})`, ar: `تحقق منه موظف مختص (${caseId})` } }));
          tx.blocker = undefined;
          if (policyGate(tx, persona, service, req.mandate, "prepare", req.config, events)) {
            buildPreview(tx, persona, service);
            openApprovalWindow(tx);
            move(tx, "PREPARED", { en: "Officer verified the case. Waiting for your approval; nothing has been sent", ar: "تحقق الموظف من الحالة. بانتظار موافقتك؛ لم يُرسل أي شيء" }, events);
          }
        } else if (r.decision === "return") {
          tx.blocker = { reason: { en: note, ar: note }, nextStep: { en: "Resolve the officer's note, then ask again.", ar: "عالج ملاحظة الموظف ثم اطلب مجددًا." } };
          move(tx, "BLOCKED", { en: "Returned by a human officer with a note", ar: "أعاده موظف مختص مع ملاحظة" }, events);
        } else {
          tx.blocker = { reason: { en: note, ar: note } };
          move(tx, "CANCELLED", { en: "Rejected by a human officer", ar: "رفضه موظف مختص" }, events);
        }
        out.tx = signTx(tx);
        break;
      }

      case "admin": {
        if (!req.adminEvent) throw new EngineError("BAD_ADMIN", { en: "Missing admin event.", ar: "حدث إداري مفقود." });
        events.push({ actor: "admin", type: req.adminEvent.type, summary: req.adminEvent.summary, data: req.adminEvent.data });
        break;
      }
    }
  } catch (e) {
    if (e instanceof EngineError) out.error = { code: e.code, message: e.messageL };
    else throw e;
  }
  out.events = chain(req.auditHead, events);
  return out;
}
