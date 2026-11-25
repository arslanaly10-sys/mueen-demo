"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DownloadSimpleIcon, ProhibitIcon, TrashIcon } from "@phosphor-icons/react";
import { AccountMenu } from "@/components/AccountMenu";
import { AppNav } from "@/components/AppNav";
import { Disclaimer } from "@/components/Disclaimer";
import { LangToggle } from "@/components/LangToggle";
import { SessionGuard } from "@/components/SessionGuard";
import { useT } from "@/components/useT";
import { engine } from "@/lib/client";
import { fmtDate, fmtNum } from "@/lib/i18n";
import { getPersona } from "@/lib/personas";
import { useHydrated, useStore } from "@/lib/store";

export default function MyData() {
  const { t, ar, lang } = useT();
  const router = useRouter();
  const hydrated = useHydrated();
  const s = useStore();
  const persona = s.personaId ? getPersona(s.personaId) : undefined;

  useEffect(() => {
    if (hydrated && !persona) router.replace("/login");
  }, [hydrated, persona, router]);
  if (!hydrated || !persona) return <div className="min-h-dvh bg-warm" />;

  const pid = persona.id;
  const mine = {
    txs: s.txs.filter((x) => x.personaId === pid),
    mandates: s.mandates.filter((m) => m.personaId === pid),
    chat: s.chats[pid] ?? [],
    reminders: s.reminders.filter((r) => r.personaId === pid),
    audit: s.audit.filter((e) => e.personaId === pid),
  };
  const consentAt = s.consents[pid];
  const rows: [string, string][] = [
    [ar ? "الهوية الموثّقة" : "Verified identity", `${t(persona.name)} · ${persona.idNumber} · ${t(persona.nationalityLabel)}`],
    [ar ? "الطلبات" : "Requests", fmtNum(mine.txs.length, lang)],
    [ar ? "الصلاحيات الممنوحة" : "Authorities granted", `${fmtNum(mine.mandates.length, lang)} (${fmtNum(mine.mandates.filter((m) => !m.revokedAt && new Date(m.expiresAt) > new Date()).length, lang)} ${ar ? "سارية" : "active"})`],
    [ar ? "رسائل المحادثة" : "Conversation messages", fmtNum(mine.chat.length, lang)],
    [ar ? "التذكيرات" : "Reminders", fmtNum(mine.reminders.length, lang)],
    [ar ? "أحداث سجل التدقيق عنك" : "Audit log events about you", fmtNum(mine.audit.length, lang)],
    [ar ? "الموافقة على إشعار الخصوصية" : "Privacy notice consent", consentAt ? fmtDate(consentAt, lang) : ar ? "لم تُمنح" : "Not given"],
  ];

  async function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), noticeVersion: "2026-11", persona, consentAt: consentAt ?? null, ...mine }, null, 2)], { type: "application/json" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `mueen-my-data-${pid}.json` });
    a.click();
    URL.revokeObjectURL(a.href);
    await engine({ action: "session", personaId: pid, sessionEvent: "DATA_EXPORTED" }).catch(() => null);
  }

  async function deleteData() {
    const ok = confirm(
      ar
        ? "حذف طلباتك وصلاحياتك ومحادثتك من هذا الجهاز؟ لا يمكن التراجع. يبقى سجل التدقيق الموقّع ويسجّل أن الحذف تم."
        : "Delete your requests, authorities and conversation from this device? This cannot be undone. The signed audit log stays and records that the deletion happened.",
    );
    if (!ok) return;
    await engine({ action: "session", personaId: pid, sessionEvent: "DATA_DELETED" }).catch(() => null);
    s.forgetPersona(pid);
    router.push("/workspace");
  }

  async function withdraw() {
    await engine({ action: "session", personaId: pid, sessionEvent: "CONSENT_WITHDRAWN" }).catch(() => null);
    s.setConsent(pid, null);
    router.push("/workspace");
  }

  return (
    <div className="min-h-dvh">
      <AppNav menu>
        <LangToggle />
        <AccountMenu persona={persona} />
      </AppNav>
      <SessionGuard personaId={pid} />
      <main className="wrap py-10">
        <h1 className="text-3xl font-semibold text-teal">{ar ? "بياناتي" : "My data"}</h1>
        <p className="mt-2 max-w-[68ch] text-ink">
          {ar ? "ما تحتفظ به المنصة عنك، وما يمكنك فعله به. التفاصيل في " : "What the platform holds about you, and what you can do with it. Details are in the "}
          <Link href="/privacy" className="text-green underline underline-offset-2">{ar ? "إشعار الخصوصية" : "privacy notice"}</Link>.
        </p>

        <dl className="mt-8 max-w-2xl divide-y divide-line rounded-[20px] border border-line bg-white">
          {rows.map(([k, v]) => (
            <div key={k} className="flex flex-wrap justify-between gap-x-6 gap-y-1 px-5 py-3.5">
              <dt className="text-sm text-muted">{k}</dt>
              <dd className="text-sm font-medium text-teal"><bdi>{v}</bdi></dd>
            </div>
          ))}
        </dl>

        <section aria-labelledby="actions-h" className="mt-10 max-w-2xl">
          <h2 id="actions-h" className="text-xl font-semibold text-teal">{ar ? "ما يمكنك فعله" : "What you can do"}</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-sm text-ink">{ar ? "نزّل نسخة من كل ما سبق بصيغة JSON." : "Download a copy of everything above as a JSON file."}</p>
              <button onClick={exportData} className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-2">
                <DownloadSimpleIcon size={16} aria-hidden="true" /> {ar ? "صدّر بياناتي" : "Export my data"}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-sm text-ink">{ar ? "أوقف الوكيل عن التصرف نيابةً عنك. ستُسأل مجددًا قبل أي استخدام." : "Stop the agent acting for you. You will be asked again before any further use."}</p>
              <button onClick={withdraw} disabled={!consentAt} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm text-teal hover:bg-mint disabled:opacity-50">
                <ProhibitIcon size={16} aria-hidden="true" /> {ar ? "اسحب الموافقة" : "Withdraw consent"}
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="max-w-md text-sm text-ink">{ar ? "احذف طلباتك وصلاحياتك ومحادثتك من هذا الجهاز. يبقى سجل التدقيق لأنه دليل ما نُفّذ." : "Delete your requests, authorities and conversation from this device. The audit log stays, as the evidence of what was done."}</p>
              <button onClick={deleteData} className="inline-flex items-center gap-2 rounded-full border border-err/40 bg-white px-5 py-2.5 text-sm font-semibold text-err hover:bg-err-bg">
                <TrashIcon size={16} aria-hidden="true" /> {ar ? "احذف بياناتي" : "Delete my data"}
              </button>
            </div>
          </div>
        </section>
        <div className="mt-12"><Disclaimer /></div>
      </main>
    </div>
  );
}
