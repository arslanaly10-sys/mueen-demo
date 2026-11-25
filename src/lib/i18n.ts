import type { L, Lang } from "./types";

export const tr = (l: L | undefined, lang: Lang) => (l ? l[lang] : "");

const NUM = { ar: new Intl.NumberFormat("ar-SA"), en: new Intl.NumberFormat("en-US") };
export const fmtNum = (n: number, lang: Lang) => NUM[lang].format(n);
export const fmtSAR = (n: number, lang: Lang) => (lang === "ar" ? `${fmtNum(n, lang)} ريال` : `SAR ${fmtNum(n, lang)}`);

export function fmtDate(iso: string, lang: Lang) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
export function fmtHijri(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-US-u-ca-islamic-umalqura", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}
export function fmtTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-SA-u-ca-gregory" : "en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(iso));
}
export function fmtDuration(d: { value: number; unit: "year" | "month" }, lang: Lang) {
  if (lang === "en") return `${d.value} ${d.unit}${d.value > 1 ? "s" : ""}`;
  const n = fmtNum(d.value, "ar");
  if (d.unit === "year") return d.value === 1 ? "سنة واحدة" : d.value === 2 ? "سنتان" : d.value <= 10 ? `${n} سنوات` : `${n} سنة`;
  return d.value === 1 ? "شهر واحد" : d.value <= 10 ? `${n} أشهر` : `${n} شهرًا`;
}
export function fmtDaysLeft(days: number, lang: Lang) {
  if (lang === "en") return days >= 0 ? `${days} days left` : `expired ${-days} days ago`;
  return days >= 0 ? `متبقٍ ${fmtNum(days, "ar")} يومًا` : `منتهية منذ ${fmtNum(-days, "ar")} يومًا`;
}

// UI copy. Product language follows the brand guide: calm, precise, never overstating.
export const T = {
  brand: { en: "Saudi Government AI Services Platform", ar: "منصة الخدمات الحكومية بالذكاء الاصطناعي" },
  placeholderName: { en: "Working name — subject to naming clearance", ar: "اسم مؤقت — يخضع لفحص العلامة التجارية" },
  concept: { en: "Concept for discussion", ar: "مفهوم للنقاش" },
  tagline: { en: "Your services, clearly connected.", ar: "خدماتك الحكومية، بخطوات أوضح" },
  message: {
    en: "Tell us what you need. We’ll explain the approved steps, ask before taking action, and keep you updated.",
    ar: "أخبرنا بما تحتاجه. سنوضح لك الخطوات المعتمدة، ونستأذنك قبل أي إجراء، ونبقيك على اطلاع.",
  },
  promise: { en: "A clear path from request to verified outcome.", ar: "مسار واضح من الطلب إلى نتيجة موثقة." },
  disclaimer: {
    en: "Independent concept demonstrator. Not an official government service, not endorsed by or connected to any government system. All people, records, fees and agency responses are synthetic or simulated.",
    ar: "نموذج مفاهيمي مستقل. ليس خدمة حكومية رسمية، وغير معتمد من أي جهة حكومية أو مرتبط بأنظمتها. جميع الأشخاص والسجلات والرسوم واستجابات الجهات افتراضية أو محاكاة.",
  },
  startDemo: { en: "Start the demo", ar: "ابدأ العرض" },
  openAdmin: { en: "Governance console", ar: "لوحة الحوكمة" },
  workspace: { en: "Workspace", ar: "مساحة العمل" },
  signOut: { en: "Switch persona", ar: "تبديل الشخصية" },
  askPlaceholder: { en: "What do you need done? Type or speak…", ar: "ماذا تحتاج أن يُنجز؟ اكتب أو تحدّث…" },
  send: { en: "Send", ar: "إرسال" },
  listening: { en: "Listening…", ar: "أستمع…" },
  voiceUnsupported: { en: "Voice input isn't supported in this browser. Try Chrome or Edge.", ar: "الإدخال الصوتي غير مدعوم في هذا المتصفح. جرّب كروم أو إيدج." },
  tryAsking: { en: "Try asking", ar: "جرّب أن تطلب" },
  aiInterpreted: { en: "Interpreted by AI", ar: "فهم بالذكاء الاصطناعي" },
  scripted: { en: "Scripted interpreter", ar: "مفسّر مبرمج" },
  verifiedByEngine: { en: "Checked by policy engine", ar: "تحقق محرك السياسات" },
  engineClaude: { en: "AI: Claude", ar: "الذكاء الاصطناعي: Claude" },
  engineScripted: { en: "AI: scripted mode", ar: "الذكاء الاصطناعي: وضع مبرمج" },
  reset: { en: "Reset demo data", ar: "إعادة ضبط بيانات العرض" },
  timeline: { en: "Timeline", ar: "المسار" },
  records: { en: "My records", ar: "سجلاتي" },
  authorities: { en: "Authorities", ar: "الصلاحيات" },
  activity: { en: "Activity", ar: "السجل" },
  noActiveRequest: { en: "No request yet. Ask for a service to see each step here.", ar: "لا يوجد طلب بعد. اطلب خدمة لترى كل خطوة هنا." },
  noAuthorities: { en: "You haven't granted any authority yet.", ar: "لم تمنح أي صلاحية بعد." },
  revoke: { en: "Revoke", ar: "إلغاء الصلاحية" },
  revoked: { en: "Revoked", ar: "ملغاة" },
  expired: { en: "Expired", ar: "منتهية" },
  active: { en: "Active", ar: "سارية" },
  until: { en: "until", ar: "حتى" },
  renew: { en: "Ask to renew", ar: "اطلب التجديد" },
  agency: { en: "Responsible agency", ar: "الجهة المسؤولة" },
  planTitle: { en: "Proposed plan", ar: "الخطة المقترحة" },
  planNote: { en: "Nothing happens until you approve. Each service needs its own consent.", ar: "لن يحدث شيء قبل موافقتك. كل خدمة تحتاج موافقة مستقلة." },
  setupAuthority: { en: "Set up authority", ar: "إعداد الصلاحية" },
  chooseWhich: { en: "Which one?", ar: "أيّها تقصد؟" },
  steps: {
    en: ["Grant scoped, revocable authority", "Read-only checks with the agency", "You review the exact details", "You approve payment separately", "Submitted once · tracked to receipt"],
    ar: ["منح صلاحية محددة وقابلة للإلغاء", "فحص للقراءة فقط لدى الجهة", "تراجع التفاصيل بدقة", "توافق على الدفع بشكل مستقل", "إرسال مرة واحدة · ومتابعة حتى الإيصال"],
  },
  authorityTitle: { en: "Authority setup", ar: "إعداد الصلاحية" },
  authorityIntro: { en: "Choose exactly what the agent may do. You can revoke this at any time.", ar: "حدّد بدقة ما يمكن للوكيل فعله. يمكنك إلغاء ذلك في أي وقت." },
  beneficiary: { en: "Beneficiary / document", ar: "المستفيد / الوثيقة" },
  service: { en: "Service", ar: "الخدمة" },
  permittedActions: { en: "Permitted actions", ar: "الإجراءات المسموحة" },
  validFor: { en: "Valid for", ar: "مدة الصلاحية" },
  h24: { en: "24 hours", ar: "24 ساعة" },
  d7: { en: "7 days", ar: "7 أيام" },
  d30: { en: "30 days", ar: "30 يومًا" },
  stillAsks: { en: "Submission and payment still ask you every time.", ar: "الإرسال والدفع يطلبان موافقتك في كل مرة." },
  noPasswords: { en: "The agent never receives your password, one-time codes or session cookies.", ar: "لا يتلقى الوكيل كلمة مرورك أو رموز التحقق أو ملفات الجلسة." },
  grantAndCheck: { en: "Grant authority & check information", ar: "امنح الصلاحية وافحص المعلومات" },
  granted: { en: "Authority granted", ar: "تم منح الصلاحية" },
  required: { en: "required", ar: "إلزامي" },
  checklist: { en: "Information checked", ar: "تم التحقق من المعلومات" },
  authoritative: { en: "Agency record", ar: "سجل الجهة" },
  userProvided: { en: "You provided", ar: "مقدّم منك" },
  source: { en: "Rule source", ar: "مصدر القاعدة" },
  checkedAt: { en: "checked", ar: "فُحص" },
  reviewTitle: { en: "Ready for your approval", ar: "جاهز لموافقتك" },
  reviewIntro: { en: "This is exactly what will be sent. Nothing has been submitted yet.", ar: "هذا بالضبط ما سيُرسل. لم يُرسل شيء بعد." },
  duration: { en: "Renewal period", ar: "مدة التجديد" },
  fee: { en: "Government fee (illustrative)", ar: "الرسوم الحكومية (توضيحية)" },
  payee: { en: "Paid to", ar: "يُدفع إلى" },
  approveDetails: { en: "Approve these details", ar: "أوافق على هذه التفاصيل" },
  cancel: { en: "Cancel request", ar: "إلغاء الطلب" },
  paymentTitle: { en: "Payment approval", ar: "الموافقة على الدفع" },
  paymentIntro: { en: "A separate approval. No stored card or hidden payment is used.", ar: "موافقة مستقلة. لا تُستخدم بطاقة محفوظة أو دفع مخفي." },
  amount: { en: "Amount", ar: "المبلغ" },
  approvePay: { en: "Approve payment", ar: "أوافق على دفع" },
  simulatedPayment: { en: "Simulated payment — no money moves in this demo.", ar: "دفع محاكى — لا تنتقل أي أموال في هذا العرض." },
  submitting: { en: "Submitting once to the agency…", ar: "جارٍ الإرسال مرة واحدة إلى الجهة…" },
  awaitingAgency: { en: "Waiting for the agency's authoritative response…", ar: "بانتظار الاستجابة الرسمية من الجهة…" },
  reconTitle: { en: "Review required — payment status unknown", ar: "مراجعة مطلوبة — حالة الدفع غير معروفة" },
  reconBody: {
    en: "The payment gateway did not respond in time. I will not pay again. I'll ask the payment authority for the authoritative status of this reference instead.",
    ar: "لم تستجب بوابة الدفع في الوقت المحدد. لن أدفع مرة أخرى، وسأطلب من جهة الدفع الحالة الرسمية لهذا المرجع بدلًا من ذلك.",
  },
  reconcile: { en: "Check payment status", ar: "تحقق من حالة الدفع" },
  receiptTitle: { en: "Confirmed by", ar: "أكدته" },
  receiptBody: { en: "The agency confirmed your renewal. This receipt came from the agency's response, not from the AI.", ar: "أكدت الجهة تجديدك. هذا الإيصال صادر من استجابة الجهة وليس من الذكاء الاصطناعي." },
  receiptNo: { en: "Receipt", ar: "الإيصال" },
  newExpiry: { en: "New expiry", ar: "تاريخ الانتهاء الجديد" },
  agencyRef: { en: "Agency reference", ar: "مرجع الجهة" },
  paymentRef: { en: "Payment reference", ar: "مرجع الدفع" },
  blockedTitle: { en: "Action needed", ar: "إجراء مطلوب" },
  nextStep: { en: "Official next step", ar: "الخطوة الرسمية التالية" },
  remindMe: { en: "Remind me", ar: "ذكّرني" },
  reminderSet: { en: "Reminder saved", ar: "تم حفظ التذكير" },
  talkToHuman: { en: "Talk to a human", ar: "التحدث مع موظف" },
  reviewRequired: { en: "Review required", ar: "مراجعة مطلوبة" },
  humanBody: { en: "A human officer will review this with the full context you approved sharing. You won't need to explain again.", ar: "سيراجع موظف مختص الطلب مع السياق الذي وافقت على مشاركته، ولن تحتاج إلى الشرح مجددًا." },
  caseId: { en: "Case", ar: "رقم الحالة" },
  cancelled: { en: "Request cancelled. Nothing further will be sent.", ar: "أُلغي الطلب. لن يُرسل أي شيء آخر." },
  injectionNotice: {
    en: "Part of your message looked like an instruction to change my rules or skip a step. I treated it as information only. I can act only within the authority you grant, and every check and approval still applies.",
    ar: "بدا جزء من رسالتك كتعليمات لتغيير قواعدي أو تخطي خطوة. تعاملت معه كمعلومة فقط. لا أعمل إلا ضمن الصلاحية التي تمنحها، وتبقى جميع الفحوصات والموافقات سارية.",
  },
  nothingExpiring: { en: "Nothing you can renew is due in the next 90 days.", ar: "لا توجد وثائق قابلة للتجديد تنتهي خلال 90 يومًا." },
  expiringIntro: { en: "These are due within 90 days. Each is a separate service with its own approval:", ar: "هذه تنتهي خلال 90 يومًا. كل منها خدمة مستقلة بموافقة مستقلة:" },
  outOfScopeTitle: { en: "Information only — not an action", ar: "للعلم فقط — ليس إجراءً" },
  hiringSteps: {
    en: [
      "Confirm sponsor eligibility on the official recruitment platform",
      "Choose a licensed recruitment office and agree the contract",
      "Visa issuance and fee payment — owned by the responsible agencies",
      "Worker arrival, medical check and iqama issuance",
      "Afterwards, I can monitor and prepare iqama renewals with your approval",
    ],
    ar: [
      "التحقق من أهلية صاحب العمل عبر منصة الاستقدام الرسمية",
      "اختيار مكتب استقدام مرخص والاتفاق على العقد",
      "إصدار التأشيرة وسداد الرسوم — من اختصاص الجهات المسؤولة",
      "وصول العامل والفحص الطبي وإصدار الإقامة",
      "بعد ذلك يمكنني متابعة تجديد الإقامة وتجهيزه بموافقتك",
    ],
  },
  notAuthorizedTitle: { en: "Not authorized", ar: "غير مصرّح" },
  daysLeft: { en: "days left", ar: "يوم متبقٍ" },
  hijri: { en: "Hijri", ar: "هجري" },
  agentSays: { en: "Agent", ar: "الوكيل" },
  you: { en: "You", ar: "أنت" },
  thinking: { en: "Understanding your request…", ar: "أفهم طلبك…" },
  error: { en: "The agent couldn't answer. Nothing was submitted. Send your message again.", ar: "تعذّر على الوكيل الرد. لم يُرسل أي شيء. أرسل رسالتك مرة أخرى." },
} satisfies Record<string, L | { en: string[]; ar: string[] }>;
