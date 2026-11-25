import type { L, ServiceId } from "./types";

// Agency connector registry. EVERY connector here is a mock: no real government system, gateway or
// payment rail is contacted. In production each entry would come from the service owner's signed
// catalogue entry and connector certification.

export type Operation = "read" | "prepare" | "submit" | "pay" | "status";

export interface ConnectorEntry {
  serviceId: ServiceId;
  /** the connector's own workload identity, separate from any person or the agent */
  connectorId: string;
  owner: L;
  operations: Operation[];
  /** the only fields this connector may read or send */
  dataScope: L[];
  rateLimitPerSec: number;
  integration: "simulated";
  riskTier: 3 | 4;
}

const f = (en: string, ar: string): L => ({ en, ar });

export const REGISTRY: ConnectorEntry[] = [
  { serviceId: "driving_license", connectorId: "conn.traffic.licensing.mock", owner: f("General Directorate of Traffic", "الإدارة العامة للمرور"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Licence number and expiry", "رقم الرخصة وانتهاؤها"), f("Medical exam status", "حالة الفحص الطبي"), f("Unpaid fines total", "إجمالي المخالفات غير المسددة")], rateLimitPerSec: 800, integration: "simulated", riskTier: 4 },
  { serviceId: "vehicle_registration", connectorId: "conn.traffic.vehicles.mock", owner: f("General Directorate of Traffic", "الإدارة العامة للمرور"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Plate and registration expiry", "اللوحة وانتهاء الاستمارة"), f("Insurance validity", "سريان التأمين"), f("Periodic inspection date", "تاريخ الفحص الدوري")], rateLimitPerSec: 800, integration: "simulated", riskTier: 4 },
  { serviceId: "passport", connectorId: "conn.passports.citizen.mock", owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Passport number and expiry", "رقم الجواز وانتهاؤه"), f("Citizenship status", "صفة المواطنة"), f("Violations status", "حالة المخالفات")], rateLimitPerSec: 600, integration: "simulated", riskTier: 4 },
  { serviceId: "iqama_domestic", connectorId: "conn.passports.residency.mock", owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Sponsor relationship", "علاقة الكفالة"), f("Iqama and passport expiry", "انتهاء الإقامة والجواز"), f("Absence report flag", "مؤشر بلاغ التغيب")], rateLimitPerSec: 600, integration: "simulated", riskTier: 4 },
  { serviceId: "work_permit", connectorId: "conn.hr.workpermits.mock", owner: f("Ministry of Human Resources and Social Development", "وزارة الموارد البشرية والتنمية الاجتماعية"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Establishment representative role", "صفة ممثل المنشأة"), f("Nitaqat zone", "نطاق المنشأة"), f("Worker permit expiry", "انتهاء رخصة العامل")], rateLimitPerSec: 400, integration: "simulated", riskTier: 4 },
  { serviceId: "health_certificate", connectorId: "conn.municipal.health.mock", owner: f("Ministry of Municipalities and Housing", "وزارة البلديات والإسكان"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Certificate number and expiry", "رقم الشهادة وانتهاؤها"), f("Training course status", "حالة الدورة التثقيفية"), f("Facility", "المنشأة")], rateLimitPerSec: 300, integration: "simulated", riskTier: 4 },
  { serviceId: "consulting_license", connectorId: "conn.commerce.consulting.mock", owner: f("Ministry of Commerce", "وزارة التجارة"), operations: ["read", "prepare", "submit", "pay", "status"], dataScope: [f("Licence number and term", "رقم الترخيص ومدته"), f("Professional registration", "التسجيل المهني"), f("Unpaid fines", "المخالفات غير المسددة")], rateLimitPerSec: 200, integration: "simulated", riskTier: 4 },
];

export const REGISTRY_MAP = Object.fromEntries(REGISTRY.map((c) => [c.serviceId, c])) as Record<ServiceId, ConnectorEntry>;

/** Non-human identities the platform uses. None of them is a person or carries a person's authority on its own. */
export const WORKLOADS = [
  { id: "agent.concierge.orchestrator", role: f("Agent workload: interprets requests and proposes typed plans", "حمل عمل الوكيل: يفسّر الطلبات ويقترح خططًا محددة"), cannot: f("Cannot decide identity, authority, eligibility, payment or completion", "لا يقرر الهوية أو الصلاحية أو الأهلية أو الدفع أو الإنجاز") },
  { id: "policy.engine.deterministic", role: f("Policy engine: allows or blocks each action against the mandate and rules", "محرك السياسات: يسمح بكل إجراء أو يمنعه وفق التفويض والقواعد"), cannot: f("Cannot call agencies", "لا يتصل بالجهات") },
  { id: "workflow.state-machine", role: f("Workflow engine: owns transaction state, idempotency and reconciliation", "محرك سير العمل: يملك حالة المعاملة ومنع التكرار والمطابقة"), cannot: f("Cannot skip an approval", "لا يتجاوز أي موافقة") },
];

export const OP_LABEL: Record<Operation, L> = {
  read: f("Read", "قراءة"),
  prepare: f("Prepare", "تجهيز"),
  submit: f("Submit", "إرسال"),
  pay: f("Pay", "دفع"),
  status: f("Status", "حالة"),
};
