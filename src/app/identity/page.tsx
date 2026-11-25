"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BuildingsIcon, CpuIcon, FingerprintIcon, PlugsConnectedIcon, ShieldCheckIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { AccountMenu } from "@/components/AccountMenu";
import { AppNav } from "@/components/AppNav";
import { Disclaimer } from "@/components/Disclaimer";
import { LangToggle } from "@/components/LangToggle";
import { SessionGuard } from "@/components/SessionGuard";
import { StatusPill } from "@/components/StatusPill";
import { useT } from "@/components/useT";
import { revokeMandate } from "@/components/workspace/agent";
import { fmtDate, fmtTime } from "@/lib/i18n";
import { getPersona } from "@/lib/personas";
import { REGISTRY, WORKLOADS, OP_LABEL } from "@/lib/registry";
import { SERVICES, SERVICE_MAP } from "@/lib/services";
import { useHydrated, useStore } from "@/lib/store";
import type { L } from "@/lib/types";

function Block({ id, icon, title, lede, children }: { id: string; icon: React.ReactNode; title: string; lede: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-white p-5">
      <h2 id={id} className="flex items-center gap-2 text-lg font-semibold text-teal"><span className="text-green">{icon}</span>{title}</h2>
      <p className="mt-1 text-sm text-muted">{lede}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const ROLE_L: Record<string, L> = {
  individual: { en: "Document holder", ar: "صاحب وثيقة" },
  sponsor: { en: "Registered domestic-worker sponsor", ar: "صاحب عمل منزلي مسجّل" },
  establishment_rep: { en: "Establishment representative", ar: "ممثل منشأة" },
  professional: { en: "Licensed consulting professional", ar: "مهني استشاري مرخّص" },
};

export default function Identity() {
  const { t, ar, lang } = useT();
  const router = useRouter();
  const hydrated = useHydrated();
  const personaId = useStore((s) => s.personaId);
  const mandates = useStore((s) => s.mandates);
  const audit = useStore((s) => s.audit);
  const [busy, setBusy] = useState<string | null>(null);
  const persona = personaId ? getPersona(personaId) : undefined;

  useEffect(() => {
    if (hydrated && !persona) router.replace("/login");
  }, [hydrated, persona, router]);
  if (!hydrated || !persona) return <div className="min-h-dvh bg-warm" />;

  const signedIn = [...audit].reverse().find((e) => e.type === "IDENTITY_VERIFIED" && e.personaId === persona.id);
  const records = SERVICES.flatMap((s) => s.targets(persona).map((tg) => ({ svc: s, tg, auth: s.authority(persona, tg.id) })));
  const mine = mandates.filter((m) => m.personaId === persona.id).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));

  return (
    <div className="min-h-dvh">
      <AppNav menu>
        <LangToggle />
        <AccountMenu persona={persona} />
      </AppNav>
      <SessionGuard personaId={persona.id} />
      <main className="wrap py-8">
        <h1 className="text-2xl font-semibold text-teal sm:text-3xl">{ar ? "الهوية والصلاحيات" : "Identity and authority"}</h1>
        <p className="mt-2 max-w-[70ch] text-ink">
          {ar
            ? "تسجيل الدخول يثبت من أنت، ولا يمنحك وحده حق التصرف نيابةً عن أحد. لكل صفة مصدرها الرسمي، ولكل إجراء تفويض محدد الخدمة والسجل والمدة. كل الهويات هنا افتراضية."
            : "Signing in proves who you are. On its own it does not let you act for anyone else. Each role has its own official source, and each action needs a mandate scoped to a service, a record and a time. Every identity here is synthetic."}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Block id="person-h" icon={<FingerprintIcon size={20} aria-hidden="true" />} title={ar ? "هوية الشخص" : "Person identity"} lede={ar ? "من سجّل الدخول، وبأي طريقة." : "Who signed in, and how."}>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <dt className="text-muted">{ar ? "الاسم" : "Name"}</dt><dd className="text-ink">{t(persona.name)}</dd>
              <dt className="text-muted">{ar ? "رقم الهوية" : "ID number"}</dt><dd className="num-ltr text-ink">{persona.idNumber}</dd>
              <dt className="text-muted">{ar ? "الصفة" : "Status"}</dt><dd className="text-ink">{t(persona.nationalityLabel)}</dd>
              <dt className="text-muted">{ar ? "طريقة التحقق" : "Verified by"}</dt><dd className="text-ink">{ar ? "محاكاة النفاذ الوطني الموحد + رمز لمرة واحدة (لا تكامل حي)" : "Simulated national single sign-on + one-time code (no live integration)"}</dd>
              <dt className="text-muted">{ar ? "وقت التحقق" : "Verified at"}</dt><dd className="num-ltr text-ink">{signedIn ? fmtTime(signedIn.at, lang) : "—"}</dd>
            </dl>
            <p className="mt-3 text-xs text-muted">{ar ? "لا تُجمع ولا تُخزَّن كلمات مرور أو رموز أو بيانات حيوية حقيقية." : "No real password, code or biometric is collected or stored."}</p>
          </Block>

          <Block id="org-h" icon={<BuildingsIcon size={20} aria-hidden="true" />} title={ar ? "المنشآت والصفات" : "Organizations and roles"} lede={ar ? "الصفات التي يقرّها المصدر الرسمي لكل خدمة." : "Roles the official source confirms for each service."}>
            <ul className="space-y-1.5 text-sm">
              {persona.roles.map((r) => <li key={r} className="flex items-center gap-2"><ShieldCheckIcon size={16} className="text-green" aria-hidden="true" /> {t(ROLE_L[r])} <span className="text-muted">· {ar ? "من سجل الجهة (محاكاة)" : "from the agency record (simulated)"}</span></li>)}
            </ul>
            {(persona.establishments ?? []).map((e) => (
              <div key={e.id} className="mt-3 rounded-xl border border-line p-3 text-sm">
                <p className="font-medium text-teal">{t(e.name)}</p>
                <p className="text-muted">{ar ? "النطاق" : "Nitaqat zone"}: {e.nitaqatZone} · {e.workers.length} {ar ? "عمال" : "workers"}</p>
              </div>
            ))}
          </Block>
        </div>

        <div className="mt-4">
          <Block id="ben-h" icon={<UsersThreeIcon size={20} aria-hidden="true" />} title={ar ? "المستفيدون والسجلات المرتبطة" : "Beneficiaries and linked records"} lede={ar ? "السجلات التي تخصك أو تخص من تملك صفة عنه، ولماذا." : "The records that are yours or belong to someone you hold a role for, and why."}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead><tr className="text-xs text-muted"><th className="py-2 text-start font-medium">{ar ? "السجل" : "Record"}</th><th className="py-2 text-start font-medium">{ar ? "الخدمة" : "Service"}</th><th className="py-2 text-start font-medium">{ar ? "ينتهي" : "Expires"}</th><th className="py-2 text-start font-medium">{ar ? "أساس الصفة" : "Basis"}</th></tr></thead>
                <tbody>
                  {records.map(({ svc, tg, auth }) => (
                    <tr key={svc.id + tg.id} className="border-t border-line align-top">
                      <td className="py-2.5 pe-3 text-teal">{t(tg.label)}{tg.sublabel ? <span className="block text-xs text-muted">{t(tg.sublabel)}</span> : null}</td>
                      <td className="py-2.5 pe-3 text-ink">{t(svc.name)}</td>
                      <td className="num-ltr py-2.5 pe-3 text-ink">{fmtDate(tg.expiry, lang)}</td>
                      <td className="py-2.5"><StatusPill tone={auth.ok ? "ok" : "error"}>{auth.ok ? (ar ? "مسموح" : "Allowed") : (ar ? "غير مسموح" : "Not allowed")}</StatusPill><span className="mt-1 block text-xs text-muted">{t(auth.reason)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Block>
        </div>

        <div className="mt-4">
          <Block id="man-h" icon={<ShieldCheckIcon size={20} aria-hidden="true" />} title={ar ? "التفويضات" : "Mandates"} lede={ar ? "ما يسمح لك الوكيل بفعله، لأي سجل، وحتى متى. الإلغاء يوقف الخطوة التالية فورًا." : "What the agent may do, for which record, until when. Revoking stops the next step at once."}>
            {mine.length === 0 ? (
              <p className="text-sm text-muted">{ar ? "لا توجد تفويضات. يُطلب التفويض عند أول طلب لكل خدمة." : "No mandates yet. One is requested the first time you ask for each service."}</p>
            ) : (
              <ul className="space-y-2">
                {mine.map((m) => {
                  const expired = new Date(m.expiresAt).getTime() < Date.now();
                  const state = m.revokedAt ? "revoked" : expired ? "expired" : "active";
                  const tg = SERVICE_MAP[m.serviceId].targets(persona).find((x) => x.id === m.targetId);
                  return (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-teal">{t(SERVICE_MAP[m.serviceId].name)}{tg ? <span className="font-normal text-muted"> · {t(tg.label)}</span> : null}</p>
                        <p className="text-muted"><span className="font-mono text-xs"><bdi>{m.id}</bdi></span> · {m.actions.map((a) => t(OP_LABEL[a as keyof typeof OP_LABEL] ?? { en: a, ar: a })).join(" · ")} · {ar ? "حتى" : "until"} <span className="num-ltr">{fmtDate(m.expiresAt, lang)} {fmtTime(m.expiresAt, lang)}</span></p>
                      </div>
                      <StatusPill tone={state === "active" ? "ok" : state === "revoked" ? "error" : "neutral"}>{state === "active" ? (ar ? "سارٍ" : "Active") : state === "revoked" ? (ar ? "ملغى" : "Revoked") : (ar ? "منتهٍ" : "Expired")}</StatusPill>
                      {state === "active" && (
                        <button type="button" disabled={busy === m.id} onClick={async () => { setBusy(m.id); await revokeMandate(persona.id, m.id); setBusy(null); }}
                          className="min-h-11 rounded-full border border-err/40 px-4 text-sm font-semibold text-err hover:bg-err-bg disabled:opacity-50">
                          {ar ? "ألغِ التفويض" : "Revoke"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Block>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Block id="agent-h" icon={<CpuIcon size={20} aria-hidden="true" />} title={ar ? "هويات الوكيل" : "Agent workload identities"} lede={ar ? "برمجيات بلا صلاحية ذاتية للتصرف." : "Software with no authority of its own to act."}>
            <ul className="space-y-2 text-sm">
              {WORKLOADS.map((w) => <li key={w.id}><p className="font-mono text-xs text-muted"><bdi>{w.id}</bdi></p><p className="text-ink">{t(w.role)}</p><p className="text-muted">{t(w.cannot)}</p></li>)}
            </ul>
          </Block>
          <Block id="conn-h" icon={<PlugsConnectedIcon size={20} aria-hidden="true" />} title={ar ? "هويات موصلات الجهات" : "Agency connector identities"} lede={ar ? "كلها موصلات تجريبية. لكل موصل هوية خاصة يقرّها مالك الخدمة في الإنتاج." : "All mock connectors. In production each identity is approved by the service owner."}>
            <ul className="space-y-1.5 text-sm">
              {REGISTRY.map((c) => <li key={c.connectorId} className="flex flex-wrap gap-x-2"><span className="font-mono text-xs text-muted"><bdi>{c.connectorId}</bdi></span><span className="text-ink">{t(c.owner)}</span></li>)}
            </ul>
          </Block>
        </div>
        <div className="mt-12"><Disclaimer /></div>
      </main>
    </div>
  );
}
