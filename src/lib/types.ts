// Shared domain types for the Saudi Government AI Services Platform concept demonstrator.
// Everything here describes SYNTHETIC data and MOCK government services.

export type Lang = "ar" | "en";
export type L = { ar: string; en: string };

export type ServiceId =
  | "driving_license"
  | "iqama_domestic"
  | "passport"
  | "vehicle_registration"
  | "work_permit"
  | "health_certificate"
  | "consulting_license";

export type Role = "individual" | "sponsor" | "establishment_rep" | "professional";

export type Action = "read" | "prepare" | "submit" | "pay";

/** Risk tiers from the concept paper (section 7). */
export type RiskTier = 0 | 1 | 2 | 3 | 4;

export type CheckStatus = "pass" | "fail" | "unverified";

export interface Check {
  id: string;
  label: L;
  status: CheckStatus;
  detail: L;
  /** Whether the value came from an (mock) authoritative source or was user-provided. */
  source: "authoritative" | "user";
  /** Official next step when the check fails. */
  nextStep?: L;
}

export interface Target {
  id: string;
  label: L;
  sublabel?: L;
  expiry: string; // ISO date
}

export interface DurationOption {
  value: number;
  unit: "year" | "month";
}

// ---------------------------------------------------------------- Persona data

export interface DomesticWorker {
  id: string;
  name: L;
  nationality: L;
  iqamaNumber: string;
  iqamaExpiry: string;
  passportExpiry: string;
  absentFromWork: boolean;
  biometricsRegistered: boolean;
  outstandingFees: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  model: L;
  registrationExpiry: string;
  insuranceValid: boolean;
  inspectionValid: boolean;
  unpaidFines: number;
}

export interface Establishment {
  id: string;
  name: L;
  nitaqatZone: "platinum" | "green" | "yellow" | "red";
  workers: EstablishmentWorker[];
}

export interface EstablishmentWorker {
  id: string;
  name: L;
  occupation: L;
  permitExpiry: string;
  iqamaValid: boolean;
}

export interface HealthCertificate {
  id: string;
  holder: L;
  facility: L;
  expiry: string;
  healthEducationCompleted: boolean;
  medicalExamValid: boolean;
}

export interface Persona {
  id: string;
  name: L;
  initials: string;
  nationality: "saudi" | "resident";
  nationalityLabel: L;
  idNumber: string; // synthetic
  roles: Role[];
  summary: L;
  scenarioHints: L[];
  drivingLicense?: {
    number: string;
    expiry: string;
    medicalExamValid: boolean;
    unpaidFines: number;
  };
  passport?: { number: string; expiry: string };
  vehicles?: Vehicle[];
  domesticWorkers?: DomesticWorker[];
  establishments?: Establishment[];
  healthCertificates?: HealthCertificate[];
  consultingLicense?: {
    number: string;
    expiry: string;
    termYears: number;
    violations: boolean;
  };
  /** Simulated infrastructure faults for demo scenarios. */
  faults?: { paymentTimeout?: ServiceId[] };
}

// ---------------------------------------------------------------- Governance

export interface Mandate {
  id: string;
  personaId: string;
  serviceId: ServiceId;
  targetId: string;
  actions: Action[];
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
  /** most the agent may pay under this mandate, in SAR; the policy engine blocks anything above */
  spendLimit?: number;
  /** server HMAC; a copy with a wider scope, later expiry or no revocation fails it */
  sig?: string;
}

export type ConnectorHealth = "up" | "degraded" | "down";

export interface AdminConfig {
  killSwitch: boolean;
  disabledServices: ServiceId[];
  connectorHealth: Partial<Record<ServiceId, ConnectorHealth>>;
  policyVersion: string;
}

// ---------------------------------------------------------------- Transactions

export type TxState =
  | "REQUESTED"
  | "IDENTITY_VERIFIED"
  | "AUTHORITY_CHECKED"
  | "PREREQUISITES_CHECKED"
  | "PREPARED"
  | "USER_CONFIRMED"
  | "PAYMENT_CONFIRMED"
  | "SUBMITTED"
  | "GOVERNMENT_CONFIRMED"
  | "RECEIPT_ISSUED"
  | "BLOCKED"
  | "HUMAN_REVIEW"
  | "RECONCILIATION_REQUIRED"
  | "CANCELLED";

export interface TxHistoryEntry {
  state: TxState;
  at: string;
  note: L;
}

export interface Transaction {
  id: string;
  personaId: string;
  serviceId: ServiceId;
  targetId: string;
  mandateId: string;
  state: TxState;
  history: TxHistoryEntry[];
  checks: Check[];
  durationIndex: number;
  idempotencyKey: string;
  preview?: {
    fields: { label: L; value: L }[];
    fee: number;
    payee: L;
    duration: DurationOption;
  };
  payment?: {
    status: "pending" | "confirmed" | "unknown";
    amount: number;
    reference: string;
    attempts: number;
  };
  submission?: { reference: string; submittedAt: string };
  receipt?: {
    number: string;
    issuedAt: string;
    newExpiry: string;
    agency: L;
  };
  blocker?: { reason: L; nextStep?: L };
  review?: { reason: L; caseId: string };
  createdAt: string;
  updatedAt: string;
  /** Server HMAC over the transaction; the backend rejects modified copies. */
  sig?: string;
}

// ---------------------------------------------------------------- Audit

export type AuditActor = "user" | "agent" | "policy" | "connector" | "agency" | "admin" | "officer" | "system";

export interface AuditEvent {
  seq: number;
  at: string;
  actor: AuditActor;
  type: string;
  txId?: string;
  personaId?: string;
  summary: L;
  data?: Record<string, unknown>;
  prevHash: string;
  hash: string;
}

export interface AuditHead {
  seq: number;
  hash: string;
}

// ---------------------------------------------------------------- Agent interpretation

export type InterpretScope =
  | "single"
  | "multi"
  | "expiring_all"
  | "out_of_scope"
  | "smalltalk"
  | "unclear"
  // daily tasks beyond renewals
  | "status"
  | "appointment"
  | "life_event"
  | "business_review";

export type LifeEvent = "hiring_domestic_worker" | "family_travel" | "new_baby";
export type AppointmentPurpose = "driving_medical" | "primary_care";

export interface Intent {
  serviceId: ServiceId;
  targetId?: string | null;
}

export interface Interpretation {
  scope: InterpretScope;
  language: Lang;
  intents: Intent[];
  injectionSuspected: boolean;
  reply: string;
  engine: "claude" | "scripted";
  outOfScopeTopic?: "hiring_domestic_worker" | "other";
  lifeEvent?: LifeEvent;
  appointmentPurpose?: AppointmentPurpose;
}
