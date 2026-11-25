"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BellIcon, CalendarCheckIcon, ListChecksIcon } from "@phosphor-icons/react";
import { AccountMenu } from "@/components/AccountMenu";
import { AppNav } from "@/components/AppNav";
import { Disclaimer } from "@/components/Disclaimer";
import { LangToggle } from "@/components/LangToggle";
import { ServiceIcon } from "@/components/ServiceIcon";
import { SessionGuard } from "@/components/SessionGuard";
import { StatusPill } from "@/components/StatusPill";
import { useT } from "@/components/useT";
import { STATE_LABEL } from "@/lib/engine/states";
import { fmtDate, fmtNum, fmtTime } from "@/lib/i18n";
import { getPersona } from "@/lib/personas";
import { SERVICE_MAP } from "@/lib/services";
import { useHydrated, useStore } from "@/lib/store";
import { BUCKETS, bucketOf, type Bucket } from "@/lib/tracker";

const TONE = { ok: "ok", warn: "warn", error: "error", info: "info", plain: "neutral" } as const;

export default function Tasks() {
  const { t, ar, lang } = useT();
  const router = useRouter();
  const hydrated = useHydrated();
  const personaId = useStore((s) => s.personaId);
  const allTxs = useStore((s) => s.txs);
  const reminders = useStore((s) => s.reminders);
  const bookings = useStore((s) => s.appointments);
  const selectTx = useStore((s) => s.selectTx);
  const [filter, setFilter] = useState<Bucket | "all">("all");
  const persona = personaId ? getPersona(personaId) : undefined;

  useEffect(() => {
    if (hydrated && !persona) router.replace("/login");
  }, [hydrated, persona, router]);
  if (!hydrated || !persona) return <div className="min-h-dvh bg-warm" />;

  const txs = allTxs.filter((x) => x.personaId === persona.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const counts = Object.fromEntries(BUCKETS.map((b) => [b.id, txs.filter((x) => bucketOf(x) === b.id).length])) as Record<Bucket, number>;
  const shown = filter === "all" ? txs : txs.filter((x) => bucketOf(x) === filter);
  const mine = reminders.filter((r) => r.personaId === persona.id);

  return (
    <div className="min-h-dvh">
      <AppNav menu>
        <LangToggle />
        <AccountMenu persona={persona} />
      </AppNav>
      <SessionGuard personaId={persona.id} />
      <main className="wrap py-8">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-teal sm:text-3xl"><ListChecksIcon size={26} aria-hidden="true" />{ar ? "مهامي" : "My tasks"}</h1>
        <p className="mt-2 max-w-[68ch] text-ink">{ar ? "كل طلب تابعه الوكيل لك، وحالته كما سجّلها محرك سير العمل. لا يظهر «مكتمل» إلا بعد تأكيد الجهة." : "Every request the agent has handled for you, with its state as the workflow engine recorded it. Completed appears only after the agency confirms."}</p>

        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={ar ? "تصفية حسب الحالة" : "Filter by status"}>
          {[{ id: "all" as const, label: { en: "All", ar: "الكل" } }, ...BUCKETS].map((b) => {
            const n = b.id === "all" ? txs.length : counts[b.id];
            return (
              <button key={b.id} type="button" aria-pressed={filter === b.id} onClick={() => setFilter(b.id)}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm ${filter === b.id ? "border-teal bg-teal text-white" : "border-line bg-white text-teal hover:bg-mint"}`}>
                {t(b.label)} <span className="tabular-nums opacity-80">{fmtNum(n, lang)}</span>
              </button>
            );
          })}
        </div>

        {txs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-white p-6">
            <p className="font-medium text-teal">{ar ? "لا توجد مهام بعد" : "No tasks yet"}</p>
            <p className="mt-1 text-sm text-ink">{ar ? "اطلب تجديدًا أو موعدًا من مساحة المستفيد وسيظهر هنا." : "Ask for a renewal or an appointment in the workspace and it appears here."}</p>
            <Link href="/workspace" className="mt-3 inline-flex rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white">{ar ? "افتح مساحة المستفيد" : "Open the workspace"}</Link>
          </div>
        ) : shown.length === 0 ? (
          <p className="mt-6 text-sm text-muted">{ar ? "لا توجد مهام بهذه الحالة." : "No tasks with this status."} <button type="button" onClick={() => setFilter("all")} className="text-green underline underline-offset-2">{ar ? "اعرض الكل" : "Show all"}</button></p>
        ) : (
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {shown.map((x) => {
              const b = BUCKETS.find((y) => y.id === bucketOf(x))!;
              const svc = SERVICE_MAP[x.serviceId];
              const target = svc.targets(persona).find((g) => g.id === x.targetId);
              return (
                <li key={x.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
                  <ServiceIcon id={x.serviceId} size={20} className="text-green" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-teal">{t(svc.name)}{target ? <span className="font-normal text-muted"> · {t(target.label)}</span> : null}</p>
                    <p className="text-sm text-muted"><span className="font-mono text-xs"><bdi>{x.id}</bdi></span> · {t(STATE_LABEL[x.state])} · <span className="num-ltr">{fmtTime(x.updatedAt, lang)}</span></p>
                    {x.blocker && bucketOf(x) === "blocked" && <p className="mt-1 text-sm text-ink">{t(x.blocker.reason)}</p>}
                  </div>
                  <StatusPill tone={TONE[b.tone]}>{t(b.label)}</StatusPill>
                  <button type="button" onClick={() => { selectTx(x.id); router.push("/workspace"); }} className="min-h-11 rounded-full border border-line px-4 text-sm text-teal hover:bg-mint">
                    {ar ? "افتح" : "Open"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <section aria-labelledby="rem-h" className="mt-10">
          <h2 id="rem-h" className="flex items-center gap-2 text-xl font-semibold text-teal"><BellIcon size={20} aria-hidden="true" />{ar ? "تذكيرات المواعيد النهائية" : "Deadline reminders"}</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-muted">{ar ? "لا توجد تذكيرات. اسأل «ما الذي سينتهي قريبًا؟» في مساحة المستفيد." : "No reminders. Ask “What’s expiring soon?” in the workspace."}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {mine.map((r) => {
                const svc = SERVICE_MAP[r.serviceId];
                const target = svc.targets(persona).find((g) => g.id === r.targetId);
                return (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
                    <ServiceIcon id={r.serviceId} size={18} className="text-green" />
                    <span className="text-teal">{t(svc.name)}{target ? ` · ${t(target.label)}` : ""}</span>
                    {target && <span className="text-muted">{ar ? "ينتهي" : "Expires"} <span className="num-ltr">{fmtDate(target.expiry, lang)}</span></span>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <section aria-labelledby="appt-h" className="mt-10">
          <h2 id="appt-h" className="flex items-center gap-2 text-xl font-semibold text-teal"><CalendarCheckIcon size={20} aria-hidden="true" />{ar ? "المواعيد" : "Appointments"}</h2>
          {bookings.filter((b) => b.personaId === persona.id).length === 0 ? (
            <p className="mt-2 text-sm text-muted">{ar ? "لا توجد مواعيد. اطلب «احجز موعد فحص طبي للرخصة» في مساحة المستفيد." : "No appointments. Ask “Book a medical exam for my licence” in the workspace."}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {bookings.filter((b) => b.personaId === persona.id).map((b) => (
                <li key={b.ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-line bg-white px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-muted"><bdi>{b.ref}</bdi></span>
                  <span className="min-w-0 flex-1 text-teal">{t(b.slot.place)} · <span className="num-ltr">{t(b.slot.label)}</span></span>
                  <StatusPill tone={b.status === "reserved" ? "ok" : "neutral"}>{b.status === "reserved" ? (ar ? "محجوز" : "Reserved") : (ar ? "ملغى" : "Cancelled")}</StatusPill>
                </li>
              ))}
            </ul>
          )}
        </section>
        <div className="mt-12"><Disclaimer /></div>
      </main>
    </div>
  );
}
