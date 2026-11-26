import type {
  Check,
  DurationOption,
  L,
  Persona,
  RiskTier,
  Role,
  ServiceId,
  Target,
} from "./types";

// Service registry for the seven renewal workflows in the concept paper.
// Rules are SIMPLIFIED MOCK RULES modelled on public service guides; fees are ILLUSTRATIVE.
// Every live integration would need the owning agency to confirm rules, fees and authority.

const DAY = 86_400_000;
export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);

function addDuration(baseIso: string, d: DurationOption): string {
  const base = new Date(Math.max(new Date(baseIso).getTime(), Date.now()));
  if (d.unit === "year") base.setFullYear(base.getFullYear() + d.value);
  else base.setMonth(base.getMonth() + d.value);
  return base.toISOString().slice(0, 10);
}

const pass = (id: string, label: L, detail: L): Check => ({ id, label, status: "pass", detail, source: "authoritative" });
const fail = (id: string, label: L, detail: L, nextStep: L): Check => ({
  id,
  label,
  status: "fail",
  detail,
  source: "authoritative",
  nextStep,
});

function windowCheck(expiry: string, windowDays: number, what: L): Check {
  const d = daysUntil(expiry);
  const label = { en: "Renewal window", ar: "فترة التجديد" };
  if (d <= windowDays)
    return pass("window", label, {
      en: d >= 0 ? `${what.en} expires in ${d} days — within the ${windowDays}-day renewal window.` : `${what.en} expired ${-d} days ago — renewal is allowed.`,
      ar: d >= 0 ? `${what.ar} تنتهي خلال ${d} يومًا — ضمن فترة التجديد (${windowDays} يومًا).` : `${what.ar} منتهية منذ ${-d} يومًا — التجديد متاح.`,
    });
  return fail(
    "window",
    label,
    { en: `${what.en} is valid for ${d} more days — outside the renewal window.`, ar: `${what.ar} سارية لمدة ${d} يومًا — خارج فترة التجديد.` },
    { en: `I can remind you when the window opens (${d - windowDays} days).`, ar: `يمكنني تذكيرك عند فتح فترة التجديد (بعد ${d - windowDays} يومًا).` },
  );
}

export interface ServiceDef {
  id: ServiceId;
  name: L;
  agency: L;
  agencyShort: L;
  channel: L;
  tier: RiskTier;
  requiredRole: Role;
  citizensOnly?: boolean;
  description: L;
  durations: DurationOption[];
  feeFor: (d: DurationOption) => number;
  payee: L;
  ruleSource: L;
  targets: (p: Persona) => Target[];
  /** Is the requester the eligible owner/representative for this service? */
  authority: (p: Persona, targetId?: string) => { ok: boolean; reason: L };
  checks: (p: Persona, targetId: string) => Check[];
  previewFields: (p: Persona, targetId: string) => { label: L; value: L }[];
  expiryOf: (p: Persona, targetId: string) => string;
  keywords: { en: string[]; ar: string[] };
}

const lit = (s: string): L => ({ en: s, ar: s });
export const ROLE_LABEL: Record<Role, L> = {
  individual: { en: "the document holder", ar: "صاحب الوثيقة" },
  sponsor: { en: "a registered domestic-worker sponsor", ar: "صاحب عمل منزلي مسجّل" },
  establishment_rep: { en: "an authorized establishment representative", ar: "ممثل مفوَّض عن المنشأة" },
  professional: { en: "the licensed consulting professional", ar: "صاحب الترخيص المهني الاستشاري" },
};

function roleAuthority(p: Persona, role: Role, citizensOnly = false): { ok: boolean; reason: L } {
  if (citizensOnly && p.nationality !== "saudi")
    return {
      ok: false,
      reason: {
        en: "This service is available to Saudi citizens only. Your verified identity is a resident identity, so I cannot act on it.",
        ar: "هذه الخدمة متاحة للمواطنين السعوديين فقط، وهويتك الموثقة هوية مقيم، لذلك لا يمكنني تنفيذها.",
      },
    };
  if (!p.roles.includes(role))
    return {
      ok: false,
      reason: {
        en: `Only ${ROLE_LABEL[role].en} can request this service. Your verified profile does not hold that role.`,
        ar: `يمكن طلب هذه الخدمة فقط من ${ROLE_LABEL[role].ar}، وملفك الموثق لا يتضمن هذه الصفة.`,
      },
    };
  return { ok: true, reason: { en: `Verified as ${ROLE_LABEL[role].en}.`, ar: `تم التحقق بصفتك ${ROLE_LABEL[role].ar}.` } };
}

export const SERVICES: ServiceDef[] = [
  // 1 ─ Private driving-license renewal
  {
    id: "driving_license",
    name: { en: "Driving-license renewal", ar: "تجديد رخصة القيادة" },
    agency: { en: "Ministry of Interior · General Directorate of Traffic", ar: "وزارة الداخلية · الإدارة العامة للمرور" },
    agencyShort: { en: "Traffic", ar: "المرور" },
    channel: { en: "Mock connector modelled on the Absher service guide", ar: "موصل تجريبي مبني على دليل خدمة أبشر" },
    tier: 3,
    requiredRole: "individual",
    description: { en: "Renew a private driving license.", ar: "تجديد رخصة قيادة خاصة." },
    durations: [1, 2, 5, 10].map((v) => ({ value: v, unit: "year" as const })),
    feeFor: (d) => 40 * d.value,
    payee: { en: "General Directorate of Traffic (simulated)", ar: "الإدارة العامة للمرور (محاكاة)" },
    ruleSource: { en: "Absher “Renew Driving License” guide · mock rule set", ar: "دليل أبشر «تجديد رخصة القيادة» · قواعد تجريبية" },
    targets: (p) =>
      p.drivingLicense
        ? [{ id: "dl", label: { en: "Private driving license", ar: "رخصة قيادة خاصة" }, sublabel: lit(p.drivingLicense.number), expiry: p.drivingLicense.expiry }]
        : [],
    authority: (p) => (p.drivingLicense ? roleAuthority(p, "individual") : { ok: false, reason: { en: "No driving license is linked to your identity.", ar: "لا توجد رخصة قيادة مرتبطة بهويتك." } }),
    checks: (p) => {
      const dl = p.drivingLicense!;
      return [
        pass("identity", { en: "Identity & license record", ar: "الهوية وسجل الرخصة" }, { en: `License ${dl.number} found and linked to your identity.`, ar: `تم العثور على الرخصة ${dl.number} مرتبطة بهويتك.` }),
        windowCheck(dl.expiry, 180, { en: "The license", ar: "الرخصة" }),
        dl.medicalExamValid
          ? pass("medical", { en: "Medical examination", ar: "الفحص الطبي" }, { en: "A valid medical examination from an approved center is on record.", ar: "يوجد فحص طبي ساري من مركز معتمد." })
          : fail(
              "medical",
              { en: "Medical examination", ar: "الفحص الطبي" },
              { en: "No valid medical examination is on record.", ar: "لا يوجد فحص طبي ساري في السجل." },
              { en: "Complete a medical examination at an approved center. The result is linked to your record automatically; then ask me again.", ar: "أجرِ الفحص الطبي في مركز معتمد، وستُربط النتيجة بسجلك تلقائيًا، ثم اطلب مني مجددًا." },
            ),
        dl.unpaidFines === 0
          ? pass("fines", { en: "Traffic violations", ar: "المخالفات المرورية" }, { en: "No unpaid traffic fines.", ar: "لا توجد مخالفات مرورية غير مسددة." })
          : fail(
              "fines",
              { en: "Traffic violations", ar: "المخالفات المرورية" },
              { en: `Unpaid traffic fines: SAR ${dl.unpaidFines}.`, ar: `مخالفات مرورية غير مسددة: ${dl.unpaidFines} ريال.` },
              { en: "Fines must be settled through the official payment channel before renewal. I will not pay them without a separate request from you.", ar: "يجب سداد المخالفات عبر قناة السداد الرسمية قبل التجديد، ولن أسددها دون طلب مستقل منك." },
            ),
      ];
    },
    previewFields: (p) => [
      { label: { en: "License number", ar: "رقم الرخصة" }, value: lit(p.drivingLicense!.number) },
      { label: { en: "License type", ar: "نوع الرخصة" }, value: { en: "Private", ar: "خاصة" } },
      { label: { en: "Delivery", ar: "التسليم" }, value: { en: "Digital license (no courier fee)", ar: "رخصة رقمية (بدون رسوم توصيل)" } },
    ],
    expiryOf: (p) => p.drivingLicense!.expiry,
    keywords: {
      en: ["driving", "driver", "license", "licence", "driving license"],
      ar: ["رخصة القيادة", "رخصة قيادة", "رخصتي", "رخصتك", "الرخصة", "رخصه", "رخصة السواقة", "رخصة"],
    },
  },

  // 2 ─ Iqama / Resident ID renewal for a registered domestic worker
  {
    id: "iqama_domestic",
    name: { en: "Domestic-worker iqama renewal", ar: "تجديد إقامة عامل منزلي" },
    agency: { en: "Ministry of Interior · General Directorate of Passports", ar: "وزارة الداخلية · المديرية العامة للجوازات" },
    agencyShort: { en: "Passports", ar: "الجوازات" },
    channel: { en: "Mock connector modelled on the Absher Resident ID Renewal guide", ar: "موصل تجريبي مبني على دليل أبشر لتجديد هوية مقيم" },
    tier: 3,
    requiredRole: "sponsor",
    description: { en: "Renew the resident ID of a registered domestic worker you sponsor.", ar: "تجديد هوية مقيم لعامل منزلي مسجّل على كفالتك." },
    durations: [1, 2].map((v) => ({ value: v, unit: "year" as const })),
    feeFor: (d) => 600 * d.value,
    payee: { en: "General Directorate of Passports (simulated)", ar: "المديرية العامة للجوازات (محاكاة)" },
    ruleSource: { en: "Absher “Resident ID Renewal” guide (family member / registered domestic worker) · mock rule set", ar: "دليل أبشر «تجديد هوية مقيم» (فرد أسرة / عمالة منزلية) · قواعد تجريبية" },
    targets: (p) =>
      (p.domesticWorkers ?? []).map((w) => ({ id: w.id, label: w.name, sublabel: { en: `Iqama ${w.iqamaNumber} · ${w.nationality.en}`, ar: `إقامة ${w.iqamaNumber} · ${w.nationality.ar}` }, expiry: w.iqamaExpiry })),
    authority: (p, targetId) => {
      const r = roleAuthority(p, "sponsor");
      if (!r.ok) return r;
      if (targetId && !(p.domesticWorkers ?? []).some((w) => w.id === targetId))
        return { ok: false, reason: { en: "That person is not linked to you as a registered domestic worker.", ar: "هذا الشخص غير مرتبط بك كعامل منزلي مسجّل." } };
      return r;
    },
    checks: (p, targetId) => {
      const w = p.domesticWorkers!.find((x) => x.id === targetId)!;
      const passportDays = daysUntil(w.passportExpiry);
      return [
        pass("relationship", { en: "Sponsor relationship", ar: "علاقة الكفالة" }, { en: `${w.name.en} is registered to you as a domestic worker.`, ar: `${w.name.ar} مسجّل/ة على كفالتك كعامل منزلي.` }),
        windowCheck(w.iqamaExpiry, 90, { en: "The iqama", ar: "الإقامة" }),
        passportDays > 90
          ? pass("passport", { en: "Worker passport validity", ar: "صلاحية جواز العامل" }, { en: `Passport valid for ${passportDays} more days.`, ar: `الجواز ساري لمدة ${passportDays} يومًا.` })
          : fail(
              "passport",
              { en: "Worker passport validity", ar: "صلاحية جواز العامل" },
              passportDays < 0
                ? { en: `The worker's passport expired ${-passportDays} days ago.`, ar: `جواز العامل منتهٍ منذ ${-passportDays} يومًا.` }
                : { en: `The worker's passport expires in ${passportDays} days.`, ar: `جواز العامل ينتهي خلال ${passportDays} يومًا.` },
              { en: "The worker must renew their passport with their embassy, then update the passport details through the official Passports service. I cannot work around this rule.", ar: "يجب على العامل تجديد جوازه لدى سفارة بلده، ثم تحديث بيانات الجواز عبر خدمة الجوازات الرسمية. لا يمكنني تجاوز هذا الشرط." },
            ),
        w.absentFromWork
          ? fail(
              "absence",
              { en: "Absence-from-work status", ar: "بلاغ التغيب عن العمل" },
              { en: "An absent-from-work report is registered for this worker.", ar: "يوجد بلاغ تغيب عن العمل مسجّل لهذا العامل." },
              { en: "Absence reports are resolved only through the official Passports channel. I have stopped and can route this to a human officer.", ar: "تُعالج بلاغات التغيب فقط عبر قناة الجوازات الرسمية. توقفت عن التنفيذ ويمكنني تحويل الطلب إلى موظف مختص." },
            )
          : pass("absence", { en: "Absence-from-work status", ar: "بلاغ التغيب عن العمل" }, { en: "No absence report on record.", ar: "لا يوجد بلاغ تغيب." }),
        w.biometricsRegistered
          ? pass("biometrics", { en: "Fingerprint & photo", ar: "البصمة والصورة" }, { en: "Biometrics registered.", ar: "البصمة والصورة مسجلة." })
          : fail("biometrics", { en: "Fingerprint & photo", ar: "البصمة والصورة" }, { en: "Biometrics not registered.", ar: "البصمة غير مسجلة." }, { en: "Book a biometrics appointment with Passports.", ar: "احجز موعدًا لتسجيل البصمة لدى الجوازات." }),
      ];
    },
    previewFields: (p, targetId) => {
      const w = p.domesticWorkers!.find((x) => x.id === targetId)!;
      return [
        { label: { en: "Beneficiary", ar: "المستفيد" }, value: w.name },
        { label: { en: "Iqama number", ar: "رقم الإقامة" }, value: lit(w.iqamaNumber) },
        { label: { en: "Relationship", ar: "العلاقة" }, value: { en: "Registered domestic worker", ar: "عامل منزلي مسجّل" } },
      ];
    },
    expiryOf: (p, t) => p.domesticWorkers!.find((x) => x.id === t)!.iqamaExpiry,
    keywords: {
      en: ["iqama", "resident id", "residency", "domestic worker", "maid", "housemaid", "worker's iqama"],
      ar: ["إقامة", "اقامة", "إقامات", "اقامات", "عمالتي", "عمالتك", "العاملة", "عاملة منزلية", "عامل منزلي", "الخادمة", "هوية مقيم"],
    },
  },

  // 3 ─ Saudi passport renewal
  {
    id: "passport",
    name: { en: "Saudi passport renewal", ar: "تجديد جواز السفر السعودي" },
    agency: { en: "Ministry of Interior · General Directorate of Passports", ar: "وزارة الداخلية · المديرية العامة للجوازات" },
    agencyShort: { en: "Passports", ar: "الجوازات" },
    channel: { en: "Mock connector modelled on the Absher passport-renewal guide", ar: "موصل تجريبي مبني على دليل أبشر لتجديد الجواز" },
    tier: 3,
    requiredRole: "individual",
    citizensOnly: true,
    description: { en: "Renew your Saudi passport.", ar: "تجديد جواز سفرك السعودي." },
    durations: [5, 10].map((v) => ({ value: v, unit: "year" as const })),
    feeFor: (d) => (d.value === 5 ? 300 : 600),
    payee: { en: "General Directorate of Passports (simulated)", ar: "المديرية العامة للجوازات (محاكاة)" },
    ruleSource: { en: "Absher “Renewing the Saudi Passport” guide · mock rule set", ar: "دليل أبشر «تجديد الجواز السعودي» · قواعد تجريبية" },
    targets: (p) => (p.passport ? [{ id: "passport", label: { en: "Saudi passport", ar: "جواز السفر السعودي" }, sublabel: lit(p.passport.number), expiry: p.passport.expiry }] : []),
    authority: (p) => {
      const r = roleAuthority(p, "individual", true);
      if (r.ok && !p.passport) return { ok: false, reason: { en: "No passport is linked to your identity.", ar: "لا يوجد جواز مرتبط بهويتك." } };
      return r;
    },
    checks: (p) => {
      const pp = p.passport!;
      const fines = p.drivingLicense?.unpaidFines ?? 0;
      return [
        pass("citizenship", { en: "Citizenship & identity", ar: "الجنسية والهوية" }, { en: "Verified Saudi national identity.", ar: "هوية وطنية سعودية موثقة." }),
        windowCheck(pp.expiry, 180, { en: "The passport", ar: "الجواز" }),
        pass("photo", { en: "Recent photo on record", ar: "صورة حديثة في السجل" }, { en: "Photo on file meets requirements.", ar: "الصورة المسجلة تستوفي المتطلبات." }),
        fines === 0
          ? pass("violations", { en: "Outstanding violations", ar: "المخالفات القائمة" }, { en: "No outstanding violations.", ar: "لا توجد مخالفات قائمة." })
          : {
              id: "violations",
              label: { en: "Outstanding violations", ar: "المخالفات القائمة" },
              status: "pass",
              source: "authoritative",
              detail: { en: `Traffic fines of SAR ${fines} exist; the mock rule set does not require them for passport renewal.`, ar: `توجد مخالفات بقيمة ${fines} ريال، والقواعد التجريبية لا تشترط سدادها لتجديد الجواز.` },
            },
      ];
    },
    previewFields: (p) => [
      { label: { en: "Passport number", ar: "رقم الجواز" }, value: lit(p.passport!.number) },
      { label: { en: "Delivery", ar: "التسليم" }, value: { en: "Collect from Passports office (appointment to be booked)", ar: "الاستلام من مكتب الجوازات (يُحجز موعد)" } },
    ],
    expiryOf: (p) => p.passport!.expiry,
    keywords: { en: ["passport"], ar: ["جواز", "الجواز", "جوازي", "جواز السفر"] },
  },

  // 4 ─ Vehicle registration (Istimara)
  {
    id: "vehicle_registration",
    name: { en: "Vehicle-registration renewal (Istimara)", ar: "تجديد رخصة سير المركبة (الاستمارة)" },
    agency: { en: "Ministry of Interior · General Directorate of Traffic", ar: "وزارة الداخلية · الإدارة العامة للمرور" },
    agencyShort: { en: "Traffic", ar: "المرور" },
    channel: { en: "Mock connector modelled on the Absher vehicle-registration guide", ar: "موصل تجريبي مبني على دليل أبشر لتجديد الاستمارة" },
    tier: 3,
    requiredRole: "individual",
    description: { en: "Renew the registration of a vehicle you own.", ar: "تجديد رخصة سير مركبة تملكها." },
    durations: [1, 2, 3].map((v) => ({ value: v, unit: "year" as const })),
    feeFor: (d) => 100 * d.value,
    payee: { en: "General Directorate of Traffic (simulated)", ar: "الإدارة العامة للمرور (محاكاة)" },
    ruleSource: { en: "Absher “Renew Vehicle Registration” guide · mock rule set", ar: "دليل أبشر «تجديد رخصة سير» · قواعد تجريبية" },
    targets: (p) => (p.vehicles ?? []).map((v) => ({ id: v.id, label: { en: `Vehicle ${v.plate}`, ar: `مركبة ${v.plate}` }, sublabel: v.model, expiry: v.registrationExpiry })),
    authority: (p, targetId) => {
      if (!(p.vehicles ?? []).length) return { ok: false, reason: { en: "No vehicle is registered in your name.", ar: "لا توجد مركبة مسجلة باسمك." } };
      if (targetId && !(p.vehicles ?? []).some((v) => v.id === targetId)) return { ok: false, reason: { en: "You are not the registered owner of that vehicle.", ar: "لست المالك المسجّل لهذه المركبة." } };
      return { ok: true, reason: { en: "Verified as the registered vehicle owner.", ar: "تم التحقق بصفتك المالك المسجّل للمركبة." } };
    },
    checks: (p, targetId) => {
      const v = p.vehicles!.find((x) => x.id === targetId)!;
      return [
        pass("ownership", { en: "Ownership", ar: "الملكية" }, { en: `You are the registered owner of ${v.plate}.`, ar: `أنت المالك المسجّل للمركبة ${v.plate}.` }),
        windowCheck(v.registrationExpiry, 180, { en: "The registration", ar: "الاستمارة" }),
        v.insuranceValid
          ? pass("insurance", { en: "Vehicle insurance", ar: "تأمين المركبة" }, { en: "Valid insurance policy found.", ar: "يوجد تأمين ساري." })
          : fail("insurance", { en: "Vehicle insurance", ar: "تأمين المركبة" }, { en: "No valid insurance.", ar: "لا يوجد تأمين ساري." }, { en: "Buy insurance from a licensed insurer; it links automatically.", ar: "اشترِ تأمينًا من شركة مرخصة وسيُربط تلقائيًا." }),
        v.inspectionValid
          ? pass("inspection", { en: "Periodic technical inspection", ar: "الفحص الفني الدوري" }, { en: "Valid inspection on record.", ar: "يوجد فحص دوري ساري." })
          : fail(
              "inspection",
              { en: "Periodic technical inspection", ar: "الفحص الفني الدوري" },
              { en: "The periodic technical inspection has expired.", ar: "الفحص الفني الدوري منتهٍ." },
              { en: "Book and pass a periodic inspection at an authorized center. Results link automatically; then I can prepare the renewal.", ar: "احجز وأجرِ الفحص الدوري في مركز معتمد، وستُربط النتيجة تلقائيًا، ثم أستطيع تجهيز التجديد." },
            ),
        v.unpaidFines === 0
          ? pass("fines", { en: "Vehicle violations", ar: "مخالفات المركبة" }, { en: "No unpaid fines on this vehicle.", ar: "لا توجد مخالفات على المركبة." })
          : fail("fines", { en: "Vehicle violations", ar: "مخالفات المركبة" }, { en: `Unpaid fines: SAR ${v.unpaidFines}.`, ar: `مخالفات غير مسددة: ${v.unpaidFines} ريال.` }, { en: "Settle fines through the official channel.", ar: "سدّد المخالفات عبر القناة الرسمية." }),
      ];
    },
    previewFields: (p, targetId) => {
      const v = p.vehicles!.find((x) => x.id === targetId)!;
      return [
        { label: { en: "Plate", ar: "اللوحة" }, value: lit(v.plate) },
        { label: { en: "Vehicle", ar: "المركبة" }, value: v.model },
      ];
    },
    expiryOf: (p, t) => p.vehicles!.find((x) => x.id === t)!.registrationExpiry,
    keywords: { en: ["vehicle", "registration", "istimara", "car registration", "car"], ar: ["استمارة", "الاستمارة", "استمارتي", "رخصة سير", "المركبة", "سيارتي", "السيارة"] },
  },

  // 5 ─ Expatriate work-permit renewal (Qiwa)
  {
    id: "work_permit",
    name: { en: "Expatriate work-permit renewal", ar: "تجديد رخصة العمل للعمالة الوافدة" },
    agency: { en: "Ministry of Human Resources and Social Development", ar: "وزارة الموارد البشرية والتنمية الاجتماعية" },
    agencyShort: { en: "HRSD", ar: "الموارد البشرية" },
    channel: { en: "Mock connector modelled on the Qiwa work-permit service", ar: "موصل تجريبي مبني على خدمة رخص العمل في قوى" },
    tier: 3,
    requiredRole: "establishment_rep",
    description: { en: "Renew a work permit for an employee of your establishment.", ar: "تجديد رخصة عمل لموظف في منشأتك." },
    durations: [3, 6, 12].map((v) => ({ value: v, unit: "month" as const })),
    feeFor: (d) => 800 * d.value,
    payee: { en: "HRSD (simulated)", ar: "وزارة الموارد البشرية (محاكاة)" },
    ruleSource: { en: "HRSD “Issue and Renew Work License” (Qiwa) · mock rule set", ar: "خدمة «إصدار وتجديد رخصة العمل» (قوى) · قواعد تجريبية" },
    targets: (p) =>
      (p.establishments ?? []).flatMap((e) =>
        e.workers.map((w) => ({ id: w.id, label: w.name, sublabel: { en: `${w.occupation.en} · ${e.name.en}`, ar: `${w.occupation.ar} · ${e.name.ar}` }, expiry: w.permitExpiry })),
      ),
    authority: (p) => roleAuthority(p, "establishment_rep"),
    checks: (p, targetId) => {
      const est = p.establishments!.find((e) => e.workers.some((w) => w.id === targetId))!;
      const w = est.workers.find((x) => x.id === targetId)!;
      const zoneL: Record<string, L> = { platinum: { en: "Platinum", ar: "البلاتيني" }, green: { en: "Green", ar: "الأخضر" }, yellow: { en: "Yellow", ar: "الأصفر" }, red: { en: "Red", ar: "الأحمر" } };
      return [
        pass("rep", { en: "Authorized representative", ar: "الممثل المفوَّض" }, { en: `You are an authorized representative of ${est.name.en}.`, ar: `أنت ممثل مفوَّض عن ${est.name.ar}.` }),
        est.nitaqatZone === "red"
          ? fail(
              "nitaqat",
              { en: "Nitaqat zone", ar: "نطاق المنشأة (نطاقات)" },
              { en: "The establishment is in the Red zone. Work permits cannot be renewed while in the Red zone.", ar: "المنشأة في النطاق الأحمر، ولا يمكن تجديد رخص العمل أثناء وجودها فيه." },
              { en: "Improve the establishment's Saudization ratio to leave the Red zone. I will not attempt to bypass this rule.", ar: "حسّن نسبة التوطين للخروج من النطاق الأحمر. لن أحاول تجاوز هذا الشرط." },
            )
          : pass("nitaqat", { en: "Nitaqat zone", ar: "نطاق المنشأة (نطاقات)" }, { en: `Establishment is in the ${zoneL[est.nitaqatZone].en} zone.`, ar: `المنشأة في النطاق ${zoneL[est.nitaqatZone].ar}.` }),
        windowCheck(w.permitExpiry, 180, { en: "The work permit", ar: "رخصة العمل" }),
        w.iqamaValid
          ? pass("iqama", { en: "Employee iqama", ar: "إقامة الموظف" }, { en: "Employee iqama is valid.", ar: "إقامة الموظف سارية." })
          : fail("iqama", { en: "Employee iqama", ar: "إقامة الموظف" }, { en: "Employee iqama is not valid.", ar: "إقامة الموظف غير سارية." }, { en: "Renew the iqama first.", ar: "جدّد الإقامة أولًا." }),
      ];
    },
    previewFields: (p, targetId) => {
      const est = p.establishments!.find((e) => e.workers.some((w) => w.id === targetId))!;
      const w = est.workers.find((x) => x.id === targetId)!;
      return [
        { label: { en: "Employee", ar: "الموظف" }, value: w.name },
        { label: { en: "Occupation", ar: "المهنة" }, value: w.occupation },
        { label: { en: "Establishment", ar: "المنشأة" }, value: est.name },
      ];
    },
    expiryOf: (p, t) => p.establishments!.flatMap((e) => e.workers).find((w) => w.id === t)!.permitExpiry,
    keywords: { en: ["work permit", "work license", "qiwa", "permit"], ar: ["رخصة عمل", "رخصة العمل", "رخص العمل", "قوى", "تصريح عمل"] },
  },

  // 6 ─ Balady health-certificate renewal
  {
    id: "health_certificate",
    name: { en: "Health-certificate renewal", ar: "تجديد الشهادة الصحية" },
    agency: { en: "Ministry of Municipalities and Housing", ar: "وزارة البلديات والإسكان" },
    agencyShort: { en: "Municipality", ar: "البلدية" },
    channel: { en: "Mock connector modelled on the Balady health-certificate guide", ar: "موصل تجريبي مبني على دليل بلدي للشهادة الصحية" },
    tier: 3,
    requiredRole: "establishment_rep",
    description: { en: "Renew a food-handler health certificate for a worker.", ar: "تجديد الشهادة الصحية لعامل في نشاط غذائي." },
    durations: [{ value: 1, unit: "year" }],
    feeFor: () => 100,
    payee: { en: "Municipality (simulated)", ar: "البلدية (محاكاة)" },
    ruleSource: { en: "Balady “Health Certificate Renewal” guide · mock rule set", ar: "دليل بلدي «تجديد الشهادة الصحية» · قواعد تجريبية" },
    targets: (p) => (p.healthCertificates ?? []).map((h) => ({ id: h.id, label: h.holder, sublabel: h.facility, expiry: h.expiry })),
    authority: (p) => roleAuthority(p, "establishment_rep"),
    checks: (p, targetId) => {
      const h = p.healthCertificates!.find((x) => x.id === targetId)!;
      return [
        pass("employer", { en: "Employer link", ar: "ارتباط المنشأة" }, { en: `${h.holder.en} works at ${h.facility.en}.`, ar: `${h.holder.ar} يعمل في ${h.facility.ar}.` }),
        windowCheck(h.expiry, 60, { en: "The certificate", ar: "الشهادة" }),
        h.healthEducationCompleted
          ? pass("education", { en: "Health-education course", ar: "دورة التثقيف الصحي" }, { en: "Course completed.", ar: "تم اجتياز الدورة." })
          : fail(
              "education",
              { en: "Health-education course", ar: "دورة التثقيف الصحي" },
              { en: "The required health-education course is not completed.", ar: "لم تُجتز دورة التثقيف الصحي المطلوبة." },
              { en: "The worker must complete the approved health-education course; then I can prepare the renewal.", ar: "يجب على العامل اجتياز دورة التثقيف الصحي المعتمدة، ثم أستطيع تجهيز التجديد." },
            ),
        h.medicalExamValid
          ? pass("medical", { en: "Medical examination", ar: "الفحص الطبي" }, { en: "Valid medical examination on record.", ar: "يوجد فحص طبي ساري." })
          : fail("medical", { en: "Medical examination", ar: "الفحص الطبي" }, { en: "Medical exam missing.", ar: "الفحص الطبي غير موجود." }, { en: "Complete the medical exam.", ar: "أجرِ الفحص الطبي." }),
      ];
    },
    previewFields: (p, targetId) => {
      const h = p.healthCertificates!.find((x) => x.id === targetId)!;
      return [
        { label: { en: "Certificate holder", ar: "صاحب الشهادة" }, value: h.holder },
        { label: { en: "Facility", ar: "المنشأة" }, value: h.facility },
      ];
    },
    expiryOf: (p, t) => p.healthCertificates!.find((x) => x.id === t)!.expiry,
    keywords: { en: ["health certificate", "health card", "balady", "food handler"], ar: ["شهادة صحية", "الشهادة الصحية", "الشهادات الصحية", "بلدي", "كرت صحي"] },
  },

  // 7 ─ MoC consulting professional-license renewal
  {
    id: "consulting_license",
    name: { en: "Consulting professional-license renewal", ar: "تجديد الترخيص المهني الاستشاري" },
    agency: { en: "Ministry of Commerce", ar: "وزارة التجارة" },
    agencyShort: { en: "Commerce", ar: "التجارة" },
    channel: { en: "Mock connector modelled on the MoC “Renew license” service", ar: "موصل تجريبي مبني على خدمة «تجديد ترخيص» في وزارة التجارة" },
    tier: 3,
    requiredRole: "professional",
    description: { en: "Renew your consulting professional license (three-year term).", ar: "تجديد ترخيصك المهني الاستشاري (مدة ثلاث سنوات)." },
    durations: [{ value: 3, unit: "year" }],
    feeFor: () => 1500,
    payee: { en: "Ministry of Commerce (simulated)", ar: "وزارة التجارة (محاكاة)" },
    ruleSource: { en: "MoC “Renew license” service guide · mock rule set", ar: "دليل خدمة «تجديد ترخيص» بوزارة التجارة · قواعد تجريبية" },
    targets: (p) => (p.consultingLicense ? [{ id: "cl", label: { en: "Consulting professional license", ar: "ترخيص مهني استشاري" }, sublabel: lit(p.consultingLicense.number), expiry: p.consultingLicense.expiry }] : []),
    authority: (p) => roleAuthority(p, "professional"),
    checks: (p) => {
      const c = p.consultingLicense!;
      const d = daysUntil(c.expiry);
      return [
        pass("holder", { en: "License holder", ar: "صاحب الترخيص" }, { en: `License ${c.number} is held by you.`, ar: `الترخيص ${c.number} باسمك.` }),
        windowCheck(c.expiry, 120, { en: "The license", ar: "الترخيص" }),
        d >= 60
          ? pass("timing", { en: "Recommended lead time", ar: "المهلة الموصى بها" }, { en: `Applying ${d} days before expiry meets the recommended 60-day lead time.`, ar: `التقديم قبل ${d} يومًا من الانتهاء يحقق المهلة الموصى بها (60 يومًا).` })
          : { id: "timing", label: { en: "Recommended lead time", ar: "المهلة الموصى بها" }, status: "pass", source: "authoritative", detail: { en: `Only ${d} days remain; the guide recommends 60. Processing may take longer.`, ar: `يتبقى ${d} يومًا فقط، والدليل يوصي بـ60 يومًا، وقد تطول المعالجة.` } },
        c.violations
          ? fail("violations", { en: "Professional violations", ar: "المخالفات المهنية" }, { en: "Open violations on record.", ar: "توجد مخالفات قائمة." }, { en: "Resolve with the Ministry.", ar: "راجع الوزارة." })
          : pass("violations", { en: "Professional violations", ar: "المخالفات المهنية" }, { en: "No open violations.", ar: "لا توجد مخالفات قائمة." }),
      ];
    },
    previewFields: (p) => [
      { label: { en: "License number", ar: "رقم الترخيص" }, value: lit(p.consultingLicense!.number) },
      { label: { en: "Term", ar: "المدة" }, value: { en: "3 years", ar: "3 سنوات" } },
    ],
    expiryOf: (p) => p.consultingLicense!.expiry,
    keywords: { en: ["consulting", "consultant", "professional license", "ministry of commerce"], ar: ["استشاري", "الاستشاري", "ترخيص مهني", "الترخيص المهني", "وزارة التجارة"] },
  },
];

export const SERVICE_MAP = Object.fromEntries(SERVICES.map((s) => [s.id, s])) as Record<ServiceId, ServiceDef>;
export const SERVICE_IDS = SERVICES.map((s) => s.id) as ServiceId[];
export { addDuration };
