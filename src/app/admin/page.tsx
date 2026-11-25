"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowCounterClockwiseIcon, CheckCircleIcon, CircleNotchIcon, ClockIcon, PowerIcon, ProhibitIcon, PulseIcon, ScrollIcon, SealCheckIcon, ShieldCheckIcon, ShieldSlashIcon, UsersIcon, WarningCircleIcon, WarningOctagonIcon } from "@phosphor-icons/react";
import { AppNav } from "@/components/AppNav";
import { LangToggle } from "@/components/LangToggle";
import { Disclaimer } from "@/components/Disclaimer";
import { EngineBadge } from "@/components/EngineBadge";
import { ServiceIcon } from "@/components/ServiceIcon";
import { StatusPill } from "@/components/StatusPill";
import { useT } from "@/components/useT";
import { useHydrated, useStore } from "@/lib/store";
import { engine } from "@/lib/client";
import { SERVICES, SERVICE_MAP } from "@/lib/services";
import { PERSONAS, getPersona } from "@/lib/personas";
import { STATE_LABEL, brandStatus } from "@/lib/engine/states";
import { fmtTime, fmtNum } from "@/lib/i18n";
import type { AuditEvent, ConnectorHealth, L, ServiceId } from "@/lib/types";

function Section({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        <span className="text-green">{icon}</span>
        <h2 className="flex-1 font-semibold text-teal">{title}</h2>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const HEALTH: { v: ConnectorHealth; l: L; tone: "ok" | "warn" | "error" }[] = [
  { v: "up", l: { en: "Healthy", ar: "سليم" }, tone: "ok" },
  { v: "degraded", l: { en: "Degraded", ar: "متدهور" }, tone: "warn" },
  { v: "down", l: { en: "Down", ar: "متوقف" }, tone: "error" },
];

export default function Admin() {
  const { t, lang } = useT();
  const hydrated = useHydrated();
  const s = useStore();
  const [verify, setVerify] = useState<{ ok: boolean; count: number; brokenAt?: number } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);

  if (!hydrated) return <div className="min-h-dvh bg-warm" />;

  const { config, txs, audit } = s;
  const logAdmin = (type: string, summary: L, data?: Record<string, unknown>) => engine({ action: "admin", adminEvent: { type, summary, data } });

  async function setKill(on: boolean) {
    s.setConfig({ killSwitch: on });
    setConfirmKill(false);
    await logAdmin(on ? "KILL_SWITCH_ON" : "KILL_SWITCH_OFF", on ? { en: "Emergency stop activated — all agent actions paused", ar: "تفعيل الإيقاف الطارئ — توقف جميع إجراءات الوكيل" } : { en: "Emergency stop lifted", ar: "رفع الإيقاف الطارئ" });
  }
  async function toggleService(id: ServiceId) {
    const disabled = config.disabledServices.includes(id);
    s.setConfig({ disabledServices: disabled ? config.disabledServices.filter((x) => x !== id) : [...config.disabledServices, id] });
    await logAdmin(disabled ? "SERVICE_ENABLED" : "SERVICE_DISABLED", { en: `${disabled ? "Enabled" : "Disabled"} ${SERVICE_MAP[id].name.en} in registry`, ar: `${disabled ? "تفعيل" : "تعطيل"} ${SERVICE_MAP[id].name.ar} في السجل` }, { serviceId: id });
  }
  async function setHealth(id: ServiceId, h: ConnectorHealth) {
    s.setConfig({ connectorHealth: { ...config.connectorHealth, [id]: h } });
    await logAdmin("CONNECTOR_HEALTH", { en: `${SERVICE_MAP[id].agencyShort.en} connector set to ${h}`, ar: `ضبط موصل ${SERVICE_MAP[id].agencyShort.ar} على ${h}` }, { serviceId: id, health: h });
  }
  async function runVerify(events: AuditEvent[]) {
    setVerifying(true);
    const r = await fetch("/api/audit/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ events }) }).then((x) => x.json());
    setVerify(r);
    setVerifying(false);
  }

  const count = (pred: (st: string) => boolean) => txs.filter((x) => pred(x.state)).length;
  const kpis = [
    { l: { en: "Requests", ar: "الطلبات" }, v: txs.length, Icon: PulseIcon, tone: "text-teal" },
    { l: { en: "Confirmed by agency", ar: "أكدتها الجهة" }, v: count((x) => x === "RECEIPT_ISSUED"), Icon: SealCheckIcon, tone: "text-green" },
    { l: { en: "Action needed", ar: "إجراء مطلوب" }, v: count((x) => x === "BLOCKED"), Icon: WarningCircleIcon, tone: "text-warn" },
    { l: { en: "Human review queue", ar: "قائمة المراجعة البشرية" }, v: count((x) => x === "HUMAN_REVIEW" || x === "RECONCILIATION_REQUIRED"), Icon: UsersIcon, tone: "text-warn" },
    { l: { en: "Policy denials", ar: "رفض السياسات" }, v: audit.filter((e) => e.type === "POLICY_DENY").length, Icon: ShieldSlashIcon, tone: "text-err" },
    { l: { en: "Duplicate payments", ar: "مدفوعات مكررة" }, v: 0, Icon: ShieldCheckIcon, tone: "text-green", note: { en: `${audit.filter((e) => e.type === "PAYMENT_RECONCILED").length} reconciled, never retried`, ar: `${audit.filter((e) => e.type === "PAYMENT_RECONCILED").length} مطابقة دون إعادة` } },
  ];
  const queue = txs.filter((x) => x.state === "HUMAN_REVIEW" || x.state === "RECONCILIATION_REQUIRED");

  return (
    <div className="min-h-dvh">
      <AppNav>
        <EngineBadge />
        <Link href="/workspace" className="rounded-full px-3 py-1.5 text-sm text-teal hover:bg-mint">{lang === "ar" ? "مساحة المستفيد" : "Beneficiary view"}</Link>
        <LangToggle />
      </AppNav>

      <main className="wrap space-y-5 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-teal">{lang === "ar" ? "لوحة الحوكمة والتشغيل" : "Governance & operations console"}</h1>
            <p className="mt-1 text-sm text-muted">
              {lang === "ar" ? "عرض المشغل (تجريبي) · إصدار السياسة" : "Operator view (demo) · policy version"} <span className="num-ltr font-mono">{config.policyVersion}</span>
            </p>
          </div>
          <button
            onClick={() => { if (confirm(lang === "ar" ? "مسح جميع بيانات العرض في هذا المتصفح؟" : "Clear all demo data in this browser?")) { s.reset(); setVerify(null); } }}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-sm text-teal hover:bg-mint"
          >
            <ArrowCounterClockwiseIcon size={14} aria-hidden="true" /> {lang === "ar" ? "إعادة ضبط بيانات العرض" : "Reset demo data"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-4">
              <k.Icon size={18} className={k.tone} aria-hidden="true" />
              <p className="mt-2 text-[28px] font-medium leading-tight text-teal sm:text-[38px]">{fmtNum(k.v, lang)}</p>
              <p className="text-xs text-muted">{t(k.l)}</p>
              {k.note && <p className="mt-1 text-xs text-green">{t(k.note)}</p>}
            </div>
          ))}
        </div>

        <section className={`rounded-2xl border p-4 sm:p-5 ${config.killSwitch ? "border-err bg-err-bg" : "border-line bg-white"}`}>
          <div className="flex flex-wrap items-center gap-4">
            <span className={`grid size-12 place-items-center rounded-xl ${config.killSwitch ? "bg-err text-white" : "bg-err-bg text-err"}`}>
              <PowerIcon size={22} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-teal">{lang === "ar" ? "الإيقاف الطارئ" : "Emergency stop"}</h2>
              <p className="text-sm text-muted">
                {lang === "ar"
                  ? "يوقف فورًا كل قراءة وتجهيز وإرسال ودفع يقوم به الوكيل لجميع الخدمات. يُطبق في محرك السياسات وليس في الواجهة فقط."
                  : "Immediately blocks every agent read, preparation, submission and payment across all services. Enforced in the policy engine, not just the UI."}
              </p>
            </div>
            {config.killSwitch ? (
              <button onClick={() => setKill(false)} className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-2">
                {lang === "ar" ? "رفع الإيقاف" : "Lift emergency stop"}
              </button>
            ) : confirmKill ? (
              <div className="flex gap-2">
                <button onClick={() => setKill(true)} className="rounded-full bg-err px-5 py-2.5 text-sm font-semibold text-white">{lang === "ar" ? "تأكيد الإيقاف" : "Confirm stop"}</button>
                <button onClick={() => setConfirmKill(false)} className="rounded-full border border-line px-4 py-2.5 text-sm text-teal">{lang === "ar" ? "تراجع" : "Back"}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmKill(true)} className="rounded-full border border-err/40 bg-white px-5 py-2.5 text-sm font-semibold text-err hover:bg-err-bg">
                {lang === "ar" ? "تفعيل الإيقاف الطارئ" : "Activate emergency stop"}
              </button>
            )}
          </div>
        </section>

        <Section title={lang === "ar" ? "سجل الخدمات والموصلات" : "Service registry & connectors"} icon={<ShieldCheckIcon size={18} />}>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-start text-xs text-muted">
                  <th className="px-4 py-2 text-start font-medium sm:px-2">{lang === "ar" ? "الخدمة" : "Service"}</th>
                  <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "الجهة المالكة" : "Owning agency"}</th>
                  <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "مستوى الخطورة" : "Risk tier"}</th>
                  <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "حالة الموصل" : "Connector"}</th>
                  <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "مفعّلة" : "Enabled"}</th>
                </tr>
              </thead>
              <tbody>
                {SERVICES.map((svc) => {
                  const enabled = !config.disabledServices.includes(svc.id);
                  const health = config.connectorHealth[svc.id] ?? "up";
                  return (
                    <tr key={svc.id} className="border-t border-line align-middle">
                      <td className="px-4 py-3 sm:px-2">
                        <span className="flex items-center gap-2 font-medium text-teal">
                          <ServiceIcon id={svc.id} size={16} className="text-green" /> {t(svc.name)}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">{t(svc.channel)}</span>
                      </td>
                      <td className="px-2 py-3 text-muted">{t(svc.agency)}</td>
                      <td className="px-2 py-3">
                        <StatusPill tone="plain">{lang === "ar" ? `المستوى ${fmtNum(svc.tier, lang)} · إرسال ودفع` : `Tier ${svc.tier} · submit & pay`}</StatusPill>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex gap-1" role="radiogroup" aria-label={lang === "ar" ? "حالة الموصل" : "Connector health"}>
                          {HEALTH.map((h) => (
                            <button
                              key={h.v}
                              role="radio"
                              aria-checked={health === h.v}
                              onClick={() => setHealth(svc.id, h.v)}
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                health === h.v
                                  ? h.tone === "ok"
                                    ? "border-green bg-mint font-semibold text-green"
                                    : h.tone === "warn"
                                      ? "border-warn bg-warn-bg font-semibold text-warn"
                                      : "border-err bg-err-bg font-semibold text-err"
                                  : "border-line text-muted hover:bg-warm"
                              }`}
                            >
                              {t(h.l)}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <button
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => toggleService(svc.id)}
                          className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-green" : "bg-line"}`}
                          aria-label={t(svc.name)}
                        >
                          <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${enabled ? "start-[22px]" : "start-0.5"}`} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>

        <div className="grid gap-5 xl:grid-cols-2">
          <Section title={lang === "ar" ? "مراقبة الطلبات" : "Transaction monitoring"} icon={<PulseIcon size={18} />}>
            {txs.length === 0 ? (
              <p className="text-sm text-muted">{lang === "ar" ? "لا توجد طلبات بعد. ابدأ من مساحة المستفيد." : "No requests yet. Start one from the beneficiary view."}</p>
            ) : (
              <ul className="space-y-2">
                {[...txs].reverse().map((x) => {
                  const svc = SERVICE_MAP[x.serviceId];
                  const st = brandStatus(x.state, svc.agencyShort);
                  return (
                    <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line p-3">
                      <ServiceIcon id={svc.id} className="text-green" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-teal">{t(svc.name)}</p>
                        <p className="text-xs text-muted">
                          <span className="font-mono">{x.id}</span> · {t(getPersona(x.personaId)?.name)} · <span className="num-ltr">{fmtTime(x.updatedAt, lang)}</span>
                        </p>
                      </div>
                      <StatusPill tone={st.tone}>{t(STATE_LABEL[x.state])}</StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title={lang === "ar" ? "قائمة المراجعة البشرية" : "Human review queue"} icon={<UsersIcon size={18} />}>
            {queue.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted"><CheckCircleIcon size={16} className="text-green" aria-hidden="true" /> {lang === "ar" ? "لا توجد حالات بانتظار المراجعة." : "No cases waiting for review."}</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((x) => (
                  <li key={x.id} className="rounded-xl border border-warn/30 bg-warn-bg p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <WarningOctagonIcon size={16} className="text-warn" aria-hidden="true" />
                      <span className="text-sm font-medium text-teal">{t(SERVICE_MAP[x.serviceId].name)}</span>
                      <span className="font-mono text-xs text-muted">{x.review?.caseId ?? x.id}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#6b430c]">{t(x.review?.reason ?? x.history[x.history.length - 1].note)}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted"><ClockIcon size={12} aria-hidden="true" /> {t(getPersona(x.personaId)?.name)} · {t(STATE_LABEL[x.state])}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section
          title={lang === "ar" ? "سجل التدقيق المقاوم للتلاعب" : "Tamper-evident audit log"}
          icon={<ScrollIcon size={18} />}
          action={
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => runVerify(audit)}
                disabled={verifying}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-2 disabled:opacity-50"
              >
                {verifying ? <CircleNotchIcon size={13} className="animate-spin" aria-hidden="true" /> : <ShieldCheckIcon size={13} aria-hidden="true" />}
                {lang === "ar" ? "تحقق من السلسلة" : "Verify chain"}
              </button>
              <button
                onClick={() => { s.tamperAudit(); setVerify(null); }}
                disabled={audit.length < 2}
                className="inline-flex items-center gap-1.5 rounded-full border border-err/30 px-3 py-1.5 text-xs font-semibold text-err hover:bg-err-bg disabled:opacity-40"
                title={lang === "ar" ? "يعدّل حدثًا محليًا لإظهار كشف التلاعب" : "Edits one event locally to demonstrate tamper detection"}
              >
                <ProhibitIcon size={13} aria-hidden="true" /> {lang === "ar" ? "محاكاة تلاعب" : "Simulate tampering"}
              </button>
            </div>
          }
        >
          {verify && (
            <div className={`mb-4 flex items-center gap-2 rounded-xl p-3 text-sm font-medium ${verify.ok ? "bg-mint text-green" : "bg-err-bg text-err"}`} role="status">
              {verify.ok ? <CheckCircleIcon size={18} aria-hidden="true" /> : <ShieldSlashIcon size={18} aria-hidden="true" />}
              {verify.ok
                ? lang === "ar" ? `السلسلة سليمة — ${fmtNum(verify.count, lang)} حدثًا موقّعًا.` : `Chain intact — ${verify.count} signed events.`
                : lang === "ar" ? `تم كشف تلاعب عند الحدث #${verify.brokenAt}.` : `Tampering detected at event #${verify.brokenAt}.`}
            </div>
          )}
          <p className="mb-3 text-xs text-muted">
            {lang === "ar"
              ? "كل حدث موقّع من الخادم بـ HMAC-SHA256 ويتضمن بصمة الحدث السابق. تُعرض الملخصات فقط؛ البيانات الشخصية محجوبة."
              : "Each event is HMAC-SHA256 signed by the server and includes the previous event's hash. Summaries only; personal data is redacted."}
          </p>
          {audit.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <div className="scroll-thin -mx-4 max-h-[560px] overflow-auto sm:mx-0">
              <table className="w-full min-w-[720px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-muted">
                    <th className="px-4 py-2 text-start font-medium sm:px-2">#</th>
                    <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "الوقت" : "Time"}</th>
                    <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "الجهة الفاعلة" : "Actor"}</th>
                    <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "الحدث" : "Event"}</th>
                    <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "الملخص" : "Summary"}</th>
                    <th className="px-2 py-2 text-start font-medium">{lang === "ar" ? "البصمة" : "Hash"}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...audit].reverse().slice(0, 150).map((e) => (
                    <tr key={e.seq} className={`border-t border-line ${verify && !verify.ok && verify.brokenAt === e.seq ? "bg-err-bg" : ""}`}>
                      <td className="px-4 py-2 font-mono text-muted sm:px-2">{e.seq}</td>
                      <td className="num-ltr whitespace-nowrap px-2 py-2 text-muted">{fmtTime(e.at, lang)}</td>
                      <td className="px-2 py-2 font-medium capitalize text-teal">{e.actor}</td>
                      <td className="px-2 py-2 font-mono text-muted">{e.type}</td>
                      <td className="px-2 py-2 text-ink">{t(e.summary)}</td>
                      <td className="px-2 py-2 font-mono text-muted" title={e.hash}>{e.hash.slice(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <p className="text-xs text-muted">
          {lang === "ar" ? `الشخصيات الافتراضية: ${PERSONAS.length}. ` : `Synthetic personas: ${PERSONAS.length}. `}
          {lang === "ar"
            ? "في هذا العرض تُحفظ البيانات في متصفحك فقط ويكون الخادم عديم الحالة؛ النسخة الفعلية تتطلب قاعدة بيانات واستضافة حكومية معتمدة."
            : "In this demo, state lives in your browser and the server is stateless; a real deployment needs a database on approved government hosting."}
        </p>
        <Disclaimer />
      </main>
    </div>
  );
}
