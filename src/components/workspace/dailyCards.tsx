"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BriefcaseIcon, CalendarCheckIcon, CheckCircleIcon, ListChecksIcon, MapTrifoldIcon, WarningIcon } from "@phosphor-icons/react";
import { engine } from "@/lib/client";
import type { Booking, Slot } from "@/lib/engine/engine";
import { STATE_LABEL } from "@/lib/engine/states";
import { fmtDate, fmtDaysLeft } from "@/lib/i18n";
import { getPersona } from "@/lib/personas";
import { SERVICE_MAP, daysUntil } from "@/lib/services";
import { useStore } from "@/lib/store";
import { BUCKETS, bucketOf } from "@/lib/tracker";
import type { AppointmentPurpose, L, LifeEvent, ServiceId } from "@/lib/types";
import { ServiceIcon } from "../ServiceIcon";
import { StatusPill } from "../StatusPill";
import { useT } from "../useT";
import * as agent from "./agent";
import { Btn, Card, CardHead, useBusy } from "./cards";

const TONE = { ok: "ok", warn: "warn", error: "error", info: "info", plain: "neutral" } as const;

// ───────────────────────────────────────────── Status check (Tier 1, read-only)

export function StatusCard({ personaId }: { personaId: string }) {
  const { t, ar } = useT();
  const all = useStore((s) => s.txs); // select the array itself: a filtered copy would re-render forever
  const txs = all.filter((x) => x.personaId === personaId);
  const persona = getPersona(personaId)!;
  return (
    <Card>
      <CardHead icon={<ListChecksIcon size={18} aria-hidden="true" />} title={ar ? "حالة طلباتك" : "Where your requests stand"} pill={<StatusPill tone="neutral">{ar ? "المستوى 1 · قراءة فقط" : "Tier 1 · read only"}</StatusPill>} />
      {txs.length === 0 ? (
        <p className="mt-3 text-sm text-ink">{ar ? "لا توجد طلبات بعد. اطلب تجديدًا وسأتابعه هنا." : "No requests yet. Ask for a renewal and I'll track it here."}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {txs.slice(-5).reverse().map((x) => {
            const b = BUCKETS.find((y) => y.id === bucketOf(x))!;
            const tg = SERVICE_MAP[x.serviceId].targets(persona).find((g) => g.id === x.targetId);
            return (
              <li key={x.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <ServiceIcon id={x.serviceId} size={16} className="text-green" />
                <span className="min-w-0 flex-1 text-teal">{t(SERVICE_MAP[x.serviceId].name)}{tg ? ` · ${t(tg.label)}` : ""} <span className="text-muted">· {t(STATE_LABEL[x.state])}</span></span>
                <StatusPill tone={TONE[b.tone]}>{t(b.label)}</StatusPill>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-sm"><Link href="/tasks" className="text-green underline underline-offset-2">{ar ? "افتح كل مهامي" : "Open all my tasks"}</Link></p>
    </Card>
  );
}

// ───────────────────────────────────────────── Appointment booking (a write: needs the person's approval)

const PURPOSE: Record<AppointmentPurpose, { title: L; owner: L }> = {
  driving_medical: { title: { en: "Medical exam for a driving licence", ar: "فحص طبي لرخصة القيادة" }, owner: { en: "Approved medical exam centres (simulated connector)", ar: "مراكز الفحص الطبي المعتمدة (موصل محاكاة)" } },
  primary_care: { title: { en: "Primary health care appointment", ar: "موعد في الرعاية الصحية الأولية" }, owner: { en: "Primary health care appointments (simulated connector)", ar: "مواعيد الرعاية الصحية الأولية (موصل محاكاة)" } },
};

export function AppointmentCard({ personaId, purpose }: { personaId: string; purpose: AppointmentPurpose }) {
  const { t, ar } = useT();
  const upsert = useStore((s) => s.upsertBooking);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [err, setErr] = useState<L | null>(null);
  const { busy, run } = useBusy();
  const p = PURPOSE[purpose];

  useEffect(() => {
    engine({ action: "appointment", personaId, appointment: { op: "slots", purpose } })
      .then((r) => (r.error ? setErr(r.error.message) : setSlots(r.slots ?? [])))
      .catch(() => setErr({ en: "Could not read open slots. Try again.", ar: "تعذرت قراءة المواعيد المتاحة. حاول مرة أخرى." }));
  }, [personaId, purpose]);

  const chosen = slots?.find((s) => s.id === pick);

  return (
    <Card accent={booking?.status === "reserved" ? "green" : "line"}>
      <CardHead icon={<CalendarCheckIcon size={18} aria-hidden="true" />} title={t(p.title)} pill={<StatusPill tone="neutral">{ar ? "المستوى 3 · حجز بموافقتك" : "Tier 3 · booking needs your approval"}</StatusPill>} />
      <p className="mt-1 text-sm text-muted">{t(p.owner)}</p>
      {err && <p role="alert" className="mt-3 text-sm text-err">{t(err)}</p>}
      {!slots && !err && <p className="mt-3 text-sm text-muted">{ar ? "جارٍ قراءة المواعيد المتاحة…" : "Reading open slots…"}</p>}

      {booking ? (
        <div className="mt-3 text-sm">
          {booking.status === "reserved" ? (
            <p className="flex items-center gap-2 font-medium text-green"><CheckCircleIcon size={18} aria-hidden="true" />{ar ? "تم الحجز" : "Reserved"} · <span className="font-mono"><bdi>{booking.ref}</bdi></span></p>
          ) : (
            <p className="text-muted">{ar ? "أُلغي الحجز" : "Booking cancelled"} · <span className="font-mono"><bdi>{booking.ref}</bdi></span></p>
          )}
          <p className="mt-1 text-ink">{t(booking.slot.place)} · <span className="num-ltr">{t(booking.slot.label)}</span></p>
          {booking.status === "reserved" && (
            <div className="mt-3">
              <Btn variant="ghost" busy={busy} onClick={() => run(async () => {
                const r = await engine({ action: "appointment", personaId, appointment: { op: "cancel", purpose, ref: booking.ref } });
                if (!r.error) { const b = { ...booking, status: "cancelled" as const }; setBooking(b); upsert(b); }
              })}>{ar ? "ألغِ الحجز" : "Cancel booking"}</Btn>
            </div>
          )}
        </div>
      ) : slots && slots.length > 0 ? (
        <>
          <fieldset className="mt-3">
            <legend className="text-sm font-medium text-teal">{ar ? "اختر موعدًا" : "Choose a slot"}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {slots.map((s) => (
                <label key={s.id} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${pick === s.id ? "border-green bg-mint/60" : "border-line"}`}>
                  <input type="radio" name={`slot-${personaId}-${purpose}`} className="mt-1 accent-[#187A62]" checked={pick === s.id} onChange={() => setPick(s.id)} />
                  <span><span className="num-ltr block font-medium text-teal">{t(s.label)}</span><span className="text-muted">{t(s.place)}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
          {chosen && (
            <div className="mt-4 rounded-xl bg-warm p-3 text-sm">
              <p className="font-medium text-teal">{ar ? "ما سيُرسل عند موافقتك" : "What will be sent when you approve"}</p>
              <ul className="mt-1 space-y-0.5 text-ink">
                <li>{ar ? "الإجراء: حجز موعد" : "Action: reserve an appointment"}</li>
                <li>{ar ? "المكان: " : "Place: "}{t(chosen.place)}</li>
                <li>{ar ? "الوقت: " : "Time: "}<span className="num-ltr">{t(chosen.label)}</span></li>
                <li>{ar ? "الرسوم: لا شيء" : "Fee: none"}</li>
              </ul>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn disabled={!chosen} busy={busy} onClick={() => run(async () => {
              const r = await engine({ action: "appointment", personaId, appointment: { op: "reserve", purpose, slotId: pick! } });
              if (r.error) setErr(r.error.message);
              else if (r.booking) { setBooking(r.booking); upsert(r.booking); }
            })}>
              <CalendarCheckIcon size={16} aria-hidden="true" />{ar ? "أوافق على الحجز" : "Approve booking"}
            </Btn>
          </div>
        </>
      ) : slots ? (
        <p className="mt-3 text-sm text-ink">{ar ? "لا توجد مواعيد متاحة في الأيام القادمة." : "No open slots in the coming days."}</p>
      ) : null}
    </Card>
  );
}

// ───────────────────────────────────────────── Life-event plan (cross-agency, prepare-only)

type Step = { title: L; owner: L; role: "info" | "prepare" | "book" | "agency"; note?: L; act?: () => void; actLabel?: L; status?: "ok" | "warn" };

const ROLE: Record<Step["role"], { l: L; tone: "neutral" | "info" | "warn" | "ok" }> = {
  info: { l: { en: "Information only in this demo", ar: "معلومات فقط في هذا العرض" }, tone: "neutral" },
  prepare: { l: { en: "The agent can prepare; you approve", ar: "يجهّز الوكيل وتوافق أنت" }, tone: "info" },
  book: { l: { en: "The agent can book; you approve", ar: "يحجز الوكيل وتوافق أنت" }, tone: "info" },
  agency: { l: { en: "The agency decides", ar: "الجهة تقرر" }, tone: "warn" },
};

export function LifeEventCard({ personaId, event }: { personaId: string; event: LifeEvent }) {
  const { t, ar } = useT();
  const persona = getPersona(personaId)!;
  const addMessage = useStore((s) => s.addMessage);
  const book = (purpose: AppointmentPurpose) => addMessage(personaId, { id: Math.random().toString(36).slice(2), role: "agent", kind: "appointment", purpose, at: new Date().toISOString() });

  const f = (en: string, a: string): L => ({ en, ar: a });
  let title: L, steps: Step[];
  if (event === "family_travel") {
    const pass = persona.passport;
    const days = pass ? daysUntil(pass.expiry) : null;
    title = f("Family travel readiness", "الاستعداد لسفر العائلة");
    steps = [
      { title: f("Check passport validity (six months or more)", "التحقق من صلاحية الجواز (ستة أشهر فأكثر)"), owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), role: "prepare",
        status: days !== null && days > 180 ? "ok" : "warn",
        note: pass ? f(`Your passport expires ${fmtDate(pass.expiry, "en")} (${fmtDaysLeft(days!, "en")}).`, `ينتهي جوازك ${fmtDate(pass.expiry, "ar")} (${fmtDaysLeft(days!, "ar")}).`) : f("No Saudi passport on your record; residents travel on their own passport.", "لا يوجد جواز سعودي في سجلك؛ يسافر المقيم بجواز بلده."),
        act: pass && days !== null && days <= 180 ? () => agent.proposePlan(personaId, "passport", "passport") : undefined, actLabel: f("Prepare passport renewal", "جهّز تجديد الجواز") },
      { title: f("Dependants' travel documents", "وثائق سفر التابعين"), owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), role: "info", note: f("Each dependant's document is a separate request with its own approval.", "وثيقة كل تابع طلب مستقل بموافقة مستقلة.") },
      { title: f("Unpaid traffic fines that could stop travel", "مخالفات مرورية غير مسددة قد تمنع السفر"), owner: f("General Directorate of Traffic", "الإدارة العامة للمرور"), role: "info", status: (persona.drivingLicense?.unpaidFines ?? 0) > 0 ? "warn" : "ok",
        note: f(`Unpaid fines on record: SAR ${persona.drivingLicense?.unpaidFines ?? 0}.`, `المخالفات غير المسددة في السجل: ${persona.drivingLicense?.unpaidFines ?? 0} ريال.`) },
      { title: f("Exit and re-entry for residents in your care", "الخروج والعودة للمقيمين على كفالتك"), owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), role: "agency" },
    ];
  } else if (event === "new_baby") {
    title = f("A new baby in the family", "مولود جديد في العائلة");
    steps = [
      { title: f("Register the birth", "تسجيل المولود"), owner: f("Civil Affairs", "الأحوال المدنية"), role: "agency", note: f("Birth registration and the family record stay with Civil Affairs.", "يبقى تسجيل المولود وسجل الأسرة لدى الأحوال المدنية.") },
      { title: f("Add the child to the family record", "إضافة المولود إلى سجل الأسرة"), owner: f("Civil Affairs", "الأحوال المدنية"), role: "info" },
      { title: f("First vaccination appointment", "موعد التطعيم الأول"), owner: f("Primary health care (simulated connector)", "الرعاية الصحية الأولية (موصل محاكاة)"), role: "book", act: () => book("primary_care"), actLabel: f("Find a slot", "ابحث عن موعد") },
      { title: f("Child's passport, if travelling", "جواز المولود عند السفر"), owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), role: "info" },
    ];
  } else {
    title = f("Hiring a domestic worker", "استقدام عامل منزلي");
    steps = [
      { title: f("Check eligibility and recruitment contract", "التحقق من الأهلية وعقد الاستقدام"), owner: f("The domestic-labour platform", "منصة العمالة المنزلية"), role: "info", note: f("Eligibility is decided by the platform that owns recruitment, not by the agent.", "تقرر الجهة المالكة للاستقدام الأهلية، لا الوكيل.") },
      { title: f("Work visa issuance", "إصدار التأشيرة"), owner: f("The visa-issuing authority", "جهة إصدار التأشيرات"), role: "agency" },
      { title: f("Medical exam after arrival", "الفحص الطبي بعد الوصول"), owner: f("Approved medical centres (simulated connector)", "المراكز الطبية المعتمدة (موصل محاكاة)"), role: "book", act: () => book("primary_care"), actLabel: f("Find a slot", "ابحث عن موعد") },
      { title: f("Iqama issuance", "إصدار الإقامة"), owner: f("General Directorate of Passports", "المديرية العامة للجوازات"), role: "agency" },
      { title: f("Iqama renewal reminders", "تذكيرات تجديد الإقامة"), owner: f("This platform", "هذه المنصة"), role: "prepare", note: f("Once issued, the iqama renewal is one of the seven services here.", "بعد الإصدار يصبح تجديد الإقامة إحدى الخدمات السبع هنا.") },
    ];
  }

  return (
    <Card>
      <CardHead icon={<MapTrifoldIcon size={18} aria-hidden="true" />} title={t(title)} pill={<StatusPill tone="neutral">{ar ? "رحلة عبر الجهات" : "Cross-agency journey"}</StatusPill>} />
      <ol className="mt-3 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-semibold text-green">{i + 1}</span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap items-center gap-2 font-medium text-teal">
                {t(s.title)}
                {s.status === "warn" && <WarningIcon size={15} className="text-warn" aria-label={ar ? "يحتاج انتباهًا" : "Needs attention"} />}
                {s.status === "ok" && <CheckCircleIcon size={15} className="text-green" aria-label={ar ? "لا عائق" : "No blocker"} />}
              </p>
              <p className="text-muted">{t(s.owner)}</p>
              {s.note && <p className="mt-0.5 text-ink">{t(s.note)}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusPill tone={ROLE[s.role].tone}>{t(ROLE[s.role].l)}</StatusPill>
                {s.act && <button type="button" onClick={s.act} className="min-h-9 rounded-full border border-line px-3 text-sm text-teal hover:bg-mint">{t(s.actLabel!)}</button>}
              </div>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">{ar ? "لا تشمل موافقة واحدة خدمات غير مرتبطة. لكل خطوة مؤثرة جهتها وموافقتها ونتيجتها." : "One approval never covers unrelated services. Each consequential step has its own agency, approval and outcome."}</p>
    </Card>
  );
}

// ───────────────────────────────────────────── Business compliance review (employer queue)

export function BusinessCard({ personaId }: { personaId: string }) {
  const { t, ar, lang } = useT();
  const persona = getPersona(personaId)!;
  const ests = persona.establishments ?? [];
  if (!persona.roles.includes("establishment_rep"))
    return (
      <Card accent="warn">
        <CardHead icon={<BriefcaseIcon size={18} aria-hidden="true" />} title={ar ? "مراجعة امتثال المنشأة" : "Establishment compliance review"} />
        <p className="mt-3 text-sm text-ink">{ar ? "تحتاج هذه المراجعة صفة ممثل منشأة، وملفك الموثّق لا يتضمنها. تسجيل الدخول وحده لا يمنح هذه الصفة." : "This review needs an establishment-representative role, and your verified profile has none. Signing in alone does not grant it."}</p>
      </Card>
    );
  const SVC: ServiceId = "work_permit";
  return (
    <Card>
      <CardHead icon={<BriefcaseIcon size={18} aria-hidden="true" />} title={ar ? "مراجعة امتثال المنشأة" : "Establishment compliance review"} pill={<StatusPill tone="neutral">{ar ? "قراءة وتجهيز" : "Read and prepare"}</StatusPill>} />
      {ests.map((e) => {
        const red = e.nitaqatZone === "red";
        const rows = [...e.workers].sort((a, b) => a.permitExpiry.localeCompare(b.permitExpiry));
        return (
          <div key={e.id} className="mt-4">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-teal">{t(e.name)} <StatusPill tone={red ? "error" : "ok"}>{ar ? "النطاق" : "Nitaqat"}: {e.nitaqatZone}</StatusPill></p>
            {red && <p className="mt-1 text-sm text-ink">{ar ? "المنشأة في النطاق الأحمر، فلا يمكن تجديد رخص العمل حتى يتغير النطاق." : "The establishment is in the red zone, so work permits cannot be renewed until the zone changes."}</p>}
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {rows.map((w) => {
                const d = daysUntil(w.permitExpiry);
                const due = d <= 180;
                return (
                  <li key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2.5 text-sm">
                    <ServiceIcon id={SVC} size={16} className="text-green" />
                    <span className="min-w-0 flex-1"><span className="text-teal">{t(w.name)}</span> <span className="text-muted">· {t(w.occupation)} · {ar ? "تنتهي" : "expires"} <span className="num-ltr">{fmtDate(w.permitExpiry, lang)}</span> ({fmtDaysLeft(d, lang)})</span>{!w.iqamaValid && <span className="block text-err">{ar ? "الإقامة غير سارية" : "Iqama not valid"}</span>}</span>
                    {due && !red ? (
                      <button type="button" onClick={() => agent.proposePlan(personaId, SVC, w.id)} className="min-h-9 rounded-full border border-line px-3 text-teal hover:bg-mint">{ar ? "جهّز التجديد" : "Prepare renewal"}</button>
                    ) : (
                      <StatusPill tone={red ? "error" : "ok"}>{red ? (ar ? "متوقف" : "Blocked") : (ar ? "غير مستحق" : "Not due")}</StatusPill>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <p className="mt-3 text-xs text-muted">{ar ? "القراءة مجمّعة، لكن كل تجديد طلب مستقل بتفويضه وموافقته ورسومه. لا موافقة جماعية على الإرسال أو الدفع." : "Reads are grouped, but every renewal is its own request with its own authority, approval and fee. No bulk approval of submissions or payments."}</p>
    </Card>
  );
}
