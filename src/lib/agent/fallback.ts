import type { Interpretation, Intent, Lang, Persona, ServiceId } from "../types";
import { SERVICES } from "../services";

// Deterministic scripted interpreter. Used when no Claude API key is configured or the model
// call fails, so a live demonstration never depends on network access.

const INJECTION_PATTERNS = [
  /ignore (all |the |your )?(previous|prior|above) (instructions|rules)/i,
  /system prompt/i,
  /you are now/i,
  /without (my )?(payment|paying|approval|confirmation|consent)/i,
  /(skip|bypass|override|disable) (the )?(check|checks|payment|approval|policy|rules|verification)/i,
  /act as (an? )?(admin|administrator|officer)/i,
  /for all (users|citizens|workers)/i,
  /تجاهل (كل )?(التعليمات|القواعد)/,
  /بدون (دفع|موافقة|تأكيد)/,
  /(تخط|تجاوز|عطل|عطّل) (الشروط|الفحص|التحقق|الدفع|السياسة)/,
];

export function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((r) => r.test(text));
}

export function detectLang(text: string): Lang {
  return /[؀-ۿ]/.test(text) ? "ar" : "en";
}

const EXPIRING_ALL = [
  /\b(everything|all (my )?(documents|renewals|papers))\b/i,
  /what('s| is) (expiring|due)/i,
  /expir(ing|e) soon/i,
  /كل (شي|شيء|وثائقي|الوثائق|اللي)/,
  /(ينتهي|تنتهي|قربت تنتهي|اللي بتنتهي)/,
];

const HIRING = [/hir(e|ing) (a )?(new )?(domestic worker|maid|housemaid)/i, /(استقدام|أستقدم|استقدم|توظيف) (عاملة|عامل|خادمة)/];

function matchServices(text: string, lang: Lang): ServiceId[] {
  const lower = text.toLowerCase();
  const hits: { id: ServiceId; score: number }[] = [];
  for (const s of SERVICES) {
    let score = 0;
    for (const k of [...s.keywords.en, ...s.keywords.ar]) {
      if (lower.includes(k.toLowerCase())) score = Math.max(score, k.length);
    }
    if (score) hits.push({ id: s.id, score });
  }
  // Disambiguation: "رخصة عمل" / "work license" should not also count as a driving license.
  let ids = hits.sort((a, b) => b.score - a.score).map((h) => h.id);
  // Generic words ("license", "رخصة") only mean a driving license when nothing more specific matched.
  if (ids.length > 1 && ids.includes("driving_license") && !/driv|قياد|سواق/i.test(text)) ids = ids.filter((i) => i !== "driving_license");
  if (ids.includes("iqama_domestic") && ids.includes("work_permit") && /(منزل|domestic|maid|عمالتي|عمالتك|خادمة)/i.test(text)) ids = ids.filter((i) => i !== "work_permit");
  void lang;
  return ids;
}

function matchTarget(text: string, persona: Persona, serviceId: ServiceId): string | null {
  const svc = SERVICES.find((s) => s.id === serviceId)!;
  const targets = svc.targets(persona);
  if (targets.length === 1) return targets[0].id;
  const lower = text.toLowerCase();
  const hit = targets.find((t) => {
    const first = (s: string) => s.split(/\s+/)[0].toLowerCase();
    return lower.includes(first(t.label.en)) || text.includes(t.label.ar.split(/\s+/)[0]);
  });
  return hit?.id ?? null;
}

export function scriptedInterpret(text: string, persona: Persona): Interpretation {
  const language = detectLang(text);
  const injectionSuspected = detectInjection(text);
  const ar = language === "ar";

  if (HIRING.some((r) => r.test(text)))
    return {
      scope: "out_of_scope",
      outOfScopeTopic: "hiring_domestic_worker",
      language,
      intents: [],
      injectionSuspected,
      engine: "scripted",
      reply: ar
        ? "استقدام عامل منزلي رحلة متعددة الجهات وليست ضمن الخدمات السبع في هذا العرض. يمكنني شرح الخطوات المعتمدة للعلم فقط، وكل خطوة تحتاج موافقتك والجهة المسؤولة عنها."
        : "Hiring a domestic worker is a multi-agency journey outside the seven services in this demo. I can explain the approved steps for information only — each step would need your consent and its responsible agency.",
    };

  const ids = matchServices(text, language);
  if (EXPIRING_ALL.some((r) => r.test(text)) && ids.length === 0)
    return {
      scope: "expiring_all",
      language,
      intents: [],
      injectionSuspected,
      engine: "scripted",
      reply: ar ? "سأراجع وثائقك التي تقترب من الانتهاء وأعرض خطة لكل خدمة على حدة. كل خدمة تحتاج موافقة مستقلة." : "I'll review what is expiring soon and show a separate plan for each service. Each one needs its own approval.",
    };

  if (ids.length === 0) {
    const greeting = /^(hi|hello|hey|salam|السلام|مرحبا|اهلا|أهلا|هلا)/i.test(text.trim());
    return {
      scope: greeting ? "smalltalk" : "unclear",
      language,
      intents: [],
      injectionSuspected,
      engine: "scripted",
      reply: greeting
        ? ar
          ? "أهلًا بك! أخبرني ماذا تحتاج، مثل: «جدد رخصتي» أو «جدد إقامة العاملة»."
          : "Hello! Tell me what you need — for example, “Renew my driving license” or “Renew my domestic worker's iqama”."
        : ar
          ? "لم أتأكد من الخدمة المطلوبة. هل تقصد إحدى الخدمات التالية؟"
          : "I'm not sure which service you mean. Did you mean one of these?",
    };
  }

  const intents: Intent[] = ids.map((id) => ({ serviceId: id, targetId: matchTarget(text, persona, id) }));
  const names = ids.map((id) => SERVICES.find((s) => s.id === id)!.name[language]);
  return {
    scope: intents.length > 1 ? "multi" : "single",
    language,
    intents,
    injectionSuspected,
    engine: "scripted",
    reply: ar
      ? `فهمت أنك تريد: ${names.join("، ")}. سأعرض الخطة ونقاط الموافقة قبل أي إجراء.`
      : `I understand you want: ${names.join(", ")}. I'll show the plan and approval points before taking any action.`,
  };
}
