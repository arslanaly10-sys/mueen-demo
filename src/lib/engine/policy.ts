import type { Action, AdminConfig, L, Mandate, Persona } from "../types";
import type { ServiceDef } from "../services";

// Deterministic policy & authority engine.
// Core design rule: the language model may PROPOSE; only this code (and the agency) DECIDES.

export type PolicyCode =
  | "ALLOW"
  | "KILL_SWITCH"
  | "SERVICE_DISABLED"
  | "CONNECTOR_DOWN"
  | "NOT_ELIGIBLE_REQUESTER"
  | "NO_MANDATE"
  | "MANDATE_MISMATCH"
  | "MANDATE_REVOKED"
  | "MANDATE_EXPIRED"
  | "ACTION_NOT_GRANTED";

export interface PolicyDecision {
  allow: boolean;
  code: PolicyCode;
  reason: L;
}

export function evaluate(args: {
  persona: Persona;
  service: ServiceDef;
  targetId: string;
  mandate?: Mandate | null;
  action: Action;
  config: AdminConfig;
  now?: number;
}): PolicyDecision {
  const { persona, service, targetId, mandate, action, config } = args;
  const now = args.now ?? Date.now();

  if (config.killSwitch)
    return {
      allow: false,
      code: "KILL_SWITCH",
      reason: {
        en: "The platform operator has paused all agent actions (emergency stop). Nothing will be read or submitted until it is lifted.",
        ar: "أوقف مشغل المنصة جميع إجراءات الوكيل مؤقتًا (إيقاف طارئ). لن تتم أي قراءة أو إرسال حتى يُرفع الإيقاف.",
      },
    };
  if (config.disabledServices.includes(service.id))
    return {
      allow: false,
      code: "SERVICE_DISABLED",
      reason: { en: "This service has been disabled in the service registry by its owner.", ar: "تم تعطيل هذه الخدمة في سجل الخدمات من قبل الجهة المالكة." },
    };
  if (config.connectorHealth[service.id] === "down")
    return {
      allow: false,
      code: "CONNECTOR_DOWN",
      reason: {
        en: `The ${service.agencyShort.en} connector is unavailable. I will not guess or retry — please try later or use the official channel.`,
        ar: `موصل ${service.agencyShort.ar} غير متاح حاليًا. لن أخمّن أو أعيد المحاولة تلقائيًا — حاول لاحقًا أو استخدم القناة الرسمية.`,
      },
    };

  const auth = service.authority(persona, targetId);
  if (!auth.ok) return { allow: false, code: "NOT_ELIGIBLE_REQUESTER", reason: auth.reason };

  if (!mandate)
    return { allow: false, code: "NO_MANDATE", reason: { en: "You have not granted authority for this action.", ar: "لم تمنح صلاحية لهذا الإجراء." } };
  if (mandate.personaId !== persona.id || mandate.serviceId !== service.id || mandate.targetId !== targetId)
    return {
      allow: false,
      code: "MANDATE_MISMATCH",
      reason: { en: "The authority you granted does not cover this service or beneficiary.", ar: "الصلاحية الممنوحة لا تشمل هذه الخدمة أو هذا المستفيد." },
    };
  if (mandate.revokedAt)
    return {
      allow: false,
      code: "MANDATE_REVOKED",
      reason: { en: "You revoked this authority. I have stopped all further actions for it.", ar: "لقد ألغيت هذه الصلاحية، وأوقفت جميع الإجراءات اللاحقة المرتبطة بها." },
    };
  if (new Date(mandate.expiresAt).getTime() < now)
    return { allow: false, code: "MANDATE_EXPIRED", reason: { en: "This authority has expired.", ar: "انتهت صلاحية هذا التفويض." } };
  if (!mandate.actions.includes(action))
    return {
      allow: false,
      code: "ACTION_NOT_GRANTED",
      reason: { en: `Your authority does not include “${action}”.`, ar: `الصلاحية الممنوحة لا تتضمن إجراء «${ACTION_LABEL[action].ar}».` },
    };

  return { allow: true, code: "ALLOW", reason: { en: "Permitted by policy and your authority.", ar: "مسموح وفق السياسة والصلاحية الممنوحة." } };
}

export const ACTION_LABEL: Record<Action, L> = {
  read: { en: "Read the records this service needs", ar: "قراءة السجلات التي تحتاجها الخدمة" },
  prepare: { en: "Prepare the renewal request", ar: "تجهيز طلب التجديد" },
  submit: { en: "Submit — only after you approve the details", ar: "الإرسال — فقط بعد موافقتك على التفاصيل" },
  pay: { en: "Request payment — only after you approve the amount", ar: "طلب الدفع — فقط بعد موافقتك على المبلغ" },
};
