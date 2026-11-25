import type { Persona } from "./types";

// All people, numbers and records below are SYNTHETIC and exist only for the demo.
// Dates are relative to "today" so the scenarios stay valid whenever the demo runs.

const DAY = 86_400_000;
export const daysFromNow = (d: number) => new Date(Date.now() + d * DAY).toISOString().slice(0, 10);

export const PERSONAS: Persona[] = [
  {
    id: "faisal",
    name: { en: "Faisal Al-Harbi", ar: "فيصل الحربي" },
    initials: "FH",
    nationality: "saudi",
    nationalityLabel: { en: "Saudi citizen", ar: "مواطن سعودي" },
    idNumber: "1000000101",
    roles: ["individual"],
    summary: {
      en: "Citizen with a driving license due for renewal and a car whose inspection has lapsed.",
      ar: "مواطن تقترب رخصة قيادته من موعد التجديد، وانتهى الفحص الدوري لسيارته.",
    },
    scenarioHints: [
      { en: "Eligible driving-license renewal (happy path)", ar: "تجديد رخصة قيادة مستوفية للشروط (المسار الكامل)" },
      { en: "Vehicle registration blocked by expired inspection", ar: "تجديد استمارة متوقف بسبب انتهاء الفحص الدوري" },
    ],
    drivingLicense: { number: "DL-0000-4471", expiry: daysFromNow(38), medicalExamValid: true, unpaidFines: 0 },
    passport: { number: "P-S0001101", expiry: daysFromNow(140) },
    vehicles: [
      {
        id: "veh-faisal-1",
        plate: "ح ر ب 4471",
        model: { en: "Sedan, 2021", ar: "سيدان، 2021" },
        registrationExpiry: daysFromNow(19),
        insuranceValid: true,
        inspectionValid: false,
        unpaidFines: 0,
      },
    ],
  },
  {
    id: "noura",
    name: { en: "Noura Al-Qahtani", ar: "نورة القحطاني" },
    initials: "NQ",
    nationality: "saudi",
    nationalityLabel: { en: "Saudi citizen · sponsor", ar: "مواطنة سعودية · صاحبة عمل منزلي" },
    idNumber: "1000000202",
    roles: ["individual", "sponsor"],
    summary: {
      en: "Sponsor of three registered domestic workers; her own license needs a medical exam first.",
      ar: "صاحبة عمل لثلاث عمالة منزلية مسجلة، ورخصتها تحتاج فحصًا طبيًا أولًا.",
    },
    scenarioHints: [
      { en: "Domestic-worker iqama renewal (happy path)", ar: "تجديد إقامة عامل منزلي (المسار الكامل)" },
      { en: "Missing medical exam blocks license renewal", ar: "غياب الفحص الطبي يوقف تجديد الرخصة" },
      { en: "Expired passport / absent-from-work status", ar: "جواز منتهٍ / بلاغ تغيب عن العمل" },
    ],
    drivingLicense: { number: "DL-0000-5520", expiry: daysFromNow(24), medicalExamValid: false, unpaidFines: 0 },
    passport: { number: "P-S0002202", expiry: daysFromNow(900) },
    domesticWorkers: [
      {
        id: "dw-maria",
        name: { en: "Maria Santos", ar: "ماريا سانتوس" },
        nationality: { en: "Philippines", ar: "الفلبين" },
        iqamaNumber: "2000000301",
        iqamaExpiry: daysFromNow(27),
        passportExpiry: daysFromNow(610),
        absentFromWork: false,
        biometricsRegistered: true,
        outstandingFees: 0,
      },
      {
        id: "dw-siti",
        name: { en: "Siti Rahayu", ar: "سيتي رحايو" },
        nationality: { en: "Indonesia", ar: "إندونيسيا" },
        iqamaNumber: "2000000302",
        iqamaExpiry: daysFromNow(33),
        passportExpiry: daysFromNow(-12),
        absentFromWork: false,
        biometricsRegistered: true,
        outstandingFees: 0,
      },
      {
        id: "dw-lakshmi",
        name: { en: "Lakshmi Nair", ar: "لاكشمي ناير" },
        nationality: { en: "India", ar: "الهند" },
        iqamaNumber: "2000000303",
        iqamaExpiry: daysFromNow(41),
        passportExpiry: daysFromNow(400),
        absentFromWork: true,
        biometricsRegistered: true,
        outstandingFees: 0,
      },
    ],
  },
  {
    id: "khalid",
    name: { en: "Khalid Al-Otaibi", ar: "خالد العتيبي" },
    initials: "KO",
    nationality: "saudi",
    nationalityLabel: { en: "Business owner · establishment representative", ar: "صاحب منشأة · ممثل مفوَّض" },
    idNumber: "1000000303",
    roles: ["individual", "establishment_rep"],
    summary: {
      en: "Runs two establishments. One is in the red Nitaqat zone; the payment gateway will time out once.",
      ar: "يدير منشأتين إحداهما في النطاق الأحمر، وستتعطل بوابة الدفع مرة واحدة أثناء العرض.",
    },
    scenarioHints: [
      { en: "Work-permit renewal with payment timeout → reconciliation", ar: "تجديد رخصة عمل مع انقطاع الدفع ← المطابقة" },
      { en: "Red-zone establishment cannot renew", ar: "منشأة في النطاق الأحمر لا يمكنها التجديد" },
      { en: "Health certificate needs health-education course", ar: "شهادة صحية تتطلب دورة التثقيف الصحي" },
    ],
    drivingLicense: { number: "DL-0000-6630", expiry: daysFromNow(700), medicalExamValid: true, unpaidFines: 0 },
    passport: { number: "P-S0003303", expiry: daysFromNow(1200) },
    establishments: [
      {
        id: "est-catering",
        name: { en: "Otaibi Catering Co. (synthetic)", ar: "شركة العتيبي للإعاشة (افتراضية)" },
        nitaqatZone: "green",
        workers: [
          {
            id: "wk-rajesh",
            name: { en: "Rajesh Kumar", ar: "راجيش كومار" },
            occupation: { en: "Cook", ar: "طباخ" },
            permitExpiry: daysFromNow(52),
            iqamaValid: true,
          },
        ],
      },
      {
        id: "est-logistics",
        name: { en: "Otaibi Logistics (synthetic)", ar: "العتيبي للخدمات اللوجستية (افتراضية)" },
        nitaqatZone: "red",
        workers: [
          {
            id: "wk-omar",
            name: { en: "Omar Farouk", ar: "عمر فاروق" },
            occupation: { en: "Driver", ar: "سائق" },
            permitExpiry: daysFromNow(35),
            iqamaValid: true,
          },
        ],
      },
    ],
    healthCertificates: [
      {
        id: "hc-rajesh",
        holder: { en: "Rajesh Kumar", ar: "راجيش كومار" },
        facility: { en: "Otaibi Catering kitchen", ar: "مطبخ العتيبي للإعاشة" },
        expiry: daysFromNow(16),
        healthEducationCompleted: true,
        medicalExamValid: true,
      },
      {
        id: "hc-anwar",
        holder: { en: "Anwar Hossain", ar: "أنور حسين" },
        facility: { en: "Otaibi Catering kitchen", ar: "مطبخ العتيبي للإعاشة" },
        expiry: daysFromNow(22),
        healthEducationCompleted: false,
        medicalExamValid: true,
      },
    ],
    faults: { paymentTimeout: ["work_permit"] },
  },
  {
    id: "sara",
    name: { en: "Dr. Sara Al-Mutairi", ar: "د. سارة المطيري" },
    initials: "SM",
    nationality: "saudi",
    nationalityLabel: { en: "Saudi citizen · licensed consultant", ar: "مواطنة سعودية · مستشارة مرخَّصة" },
    idNumber: "1000000404",
    roles: ["individual", "professional"],
    summary: {
      en: "Consulting professional whose three-year license is due; she also has unpaid traffic fines.",
      ar: "مستشارة يقترب موعد تجديد ترخيصها لثلاث سنوات، ولديها مخالفات مرورية غير مسددة.",
    },
    scenarioHints: [
      { en: "Consulting professional-license renewal", ar: "تجديد ترخيص مهني استشاري" },
      { en: "Passport renewal (happy path)", ar: "تجديد جواز السفر (المسار الكامل)" },
      { en: "Unpaid fines block driving-license renewal", ar: "المخالفات غير المسددة توقف تجديد الرخصة" },
    ],
    drivingLicense: { number: "DL-0000-7740", expiry: daysFromNow(60), medicalExamValid: true, unpaidFines: 450 },
    passport: { number: "P-S0004404", expiry: daysFromNow(75) },
    consultingLicense: { number: "MC-CONS-0404", expiry: daysFromNow(74), termYears: 3, violations: false },
  },
  {
    id: "ahmed",
    name: { en: "Ahmed Hassan", ar: "أحمد حسن" },
    initials: "AH",
    nationality: "resident",
    nationalityLabel: { en: "Resident (Egypt)", ar: "مقيم (مصر)" },
    idNumber: "2000000505",
    roles: ["individual"],
    summary: {
      en: "Resident with a driving license due. Asking for a Saudi passport shows the policy engine refusing.",
      ar: "مقيم تقترب رخصة قيادته من التجديد. طلب جواز سعودي يُظهر رفض محرك السياسات.",
    },
    scenarioHints: [
      { en: "Resident driving-license renewal", ar: "تجديد رخصة قيادة لمقيم" },
      { en: "Saudi passport request → not authorized", ar: "طلب جواز سعودي ← غير مصرّح" },
    ],
    drivingLicense: { number: "DL-0000-8850", expiry: daysFromNow(47), medicalExamValid: true, unpaidFines: 0 },
  },
];

export function getPersona(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}
