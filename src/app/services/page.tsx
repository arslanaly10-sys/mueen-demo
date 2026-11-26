"use client";
import Link from "next/link";
import { useId, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  AirplaneTiltIcon, ArrowRightIcon, BabyIcon, BellIcon, BuildingsIcon, CalendarCheckIcon, CaretDownIcon,
  CreditCardIcon, EyeIcon, MagnifyingGlassIcon, NotePencilIcon, PaperPlaneTiltIcon, UserPlusIcon,
} from "@phosphor-icons/react";
import { AppNav, GROUPS } from "@/components/AppNav";
import { Disclaimer } from "@/components/Disclaimer";
import { LangToggle } from "@/components/LangToggle";
import { ServiceIcon } from "@/components/ServiceIcon";
import { useT } from "@/components/useT";
import { fmtNum, fmtSAR } from "@/lib/i18n";
import { PERSONAS } from "@/lib/personas";
import { REGISTRY_MAP } from "@/lib/registry";
import { ROLE_LABEL, SERVICE_MAP } from "@/lib/services";
import type { L, ServiceId } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;
const enter = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "0px 0px -40px 0px" },
  transition: { duration: 0.4, ease: EASE, delay: Math.min(i, 8) * 0.05 },
});

const STEPS: { icon: typeof EyeIcon; tier: number; name: L; line: L }[] = [
  { icon: EyeIcon, tier: 1, name: { en: "Read the record", ar: "قراءة السجل" }, line: { en: "Read-only checks against the agency’s record.", ar: "تحقق للقراءة فقط من سجل الجهة." } },
  { icon: NotePencilIcon, tier: 2, name: { en: "Prepare", ar: "التجهيز" }, line: { en: "A draft you can read in full. Nothing is sent.", ar: "مسودة تقرؤها كاملة، ولا يُرسل شيء." } },
  { icon: PaperPlaneTiltIcon, tier: 3, name: { en: "Submit after your approval", ar: "الإرسال بعد موافقتك" }, line: { en: "Sent once, with a key that blocks duplicates.", ar: "يُرسل مرة واحدة بمفتاح يمنع التكرار." } },
  { icon: CreditCardIcon, tier: 4, name: { en: "Pay after a separate approval", ar: "الدفع بعد موافقة مستقلة" }, line: { en: "Exact amount and payee. Never retried blindly.", ar: "المبلغ والجهة بدقة، ولا إعادة دفع عشوائية." } },
];

// Journeys beyond a single renewal. `ask` matches the workspace's suggested prompts, so the scripted agent understands it.
const JOURNEYS: { icon: typeof BellIcon; name: L; line: L; ask: L; persona: string }[] = [
  { icon: BellIcon, name: { en: "Deadline reminders", ar: "تذكير بالمواعيد النهائية" }, line: { en: "Finds documents near expiry and saves a reminder.", ar: "يجد الوثائق القريبة من الانتهاء ويحفظ تذكيرًا." }, ask: { en: "What's expiring soon?", ar: "وش الوثائق اللي قربت تنتهي؟" }, persona: "faisal" },
  { icon: CalendarCheckIcon, name: { en: "Book an appointment", ar: "حجز موعد" }, line: { en: "Offers open slots; a booking needs your approval.", ar: "يعرض المواعيد المتاحة، والحجز بموافقتك." }, ask: { en: "Book a medical exam for my licence", ar: "احجز موعد فحص طبي للرخصة" }, persona: "faisal" },
  { icon: MagnifyingGlassIcon, name: { en: "Check a request’s status", ar: "متابعة حالة طلب" }, line: { en: "Reads the state the workflow engine recorded.", ar: "يقرأ الحالة كما سجّلها محرك سير العمل." }, ask: { en: "Where is my request?", ar: "وين وصل طلبي؟" }, persona: "faisal" },
  { icon: AirplaneTiltIcon, name: { en: "Family travel", ar: "سفر العائلة" }, line: { en: "Checks every family passport before the trip.", ar: "يتحقق من جوازات العائلة قبل السفر." }, ask: { en: "We're travelling as a family", ar: "بنسافر كعائلة" }, persona: "faisal" },
  { icon: UserPlusIcon, name: { en: "Hiring a domestic worker", ar: "استقدام عاملة منزلية" }, line: { en: "One plan across several agencies, step by step.", ar: "خطة واحدة عبر عدة جهات، خطوة بخطوة." }, ask: { en: "I'm hiring a domestic worker", ar: "أبي أستقدم عاملة منزلية" }, persona: "noura" },
  { icon: BabyIcon, name: { en: "A new baby", ar: "مولود جديد" }, line: { en: "Lists the registrations a newborn needs.", ar: "يعرض التسجيلات التي يحتاجها المولود." }, ask: { en: "We had a new baby", ar: "رزقنا بمولود" }, persona: "noura" },
  { icon: BuildingsIcon, name: { en: "Workforce compliance", ar: "امتثال العمالة" }, line: { en: "A renewal queue per worker, ranked by deadline.", ar: "قائمة تجديد لكل عامل، مرتبة حسب الموعد." }, ask: { en: "Review my workers' compliance", ar: "راجع امتثال عمالي" }, persona: "khalid" },
];

const FILTERS = [{ id: "all", title: { en: "All", ar: "الكل" } as L }, ...GROUPS.map((g, i) => ({ id: String(i), title: g.title }))];

function facts(id: ServiceId) {
  const svc = SERVICE_MAP[id];
  const who = PERSONAS.filter((p) => svc.targets(p).length > 0 && svc.authority(p).ok);
  const sample = who[0];
  const checks = sample ? svc.checks(sample, svc.targets(sample)[0].id).map((c) => c.label) : [];
  const fees = svc.durations.map((d) => svc.feeFor(d));
  return { svc, who, checks, min: Math.min(...fees), max: Math.max(...fees), conn: REGISTRY_MAP[id] };
}

function terms(id: ServiceId, lang: "en" | "ar") {
  const ds = SERVICE_MAP[id].durations;
  const list = new Intl.ListFormat(lang, { type: "disjunction" }).format(ds.map((d) => fmtNum(d.value, lang)));
  const years = ds[0].unit === "year";
  if (ds.length === 1 && ds[0].value === 1) return lang === "ar" ? (years ? "سنة واحدة" : "شهر واحد") : years ? "1 year" : "1 month";
  return lang === "ar" ? `${list} ${years ? "سنوات" : "أشهر"}` : `${list} ${years ? "years" : "months"}`;
}

function ServiceCard({ id, name, ask, i }: { id: ServiceId; name: L; ask: L; i: number }) {
  const { t, ar, lang } = useT();
  const [open, setOpen] = useState(false);
  const panel = useId();
  const { svc, who, checks, min, max, conn } = facts(id);
  return (
    <motion.li layout {...enter(i)} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      id={id} className="flex scroll-mt-24 flex-col rounded-2xl border border-line bg-white p-5 transition-[border-color,box-shadow] duration-200 hover:border-green/40 hover:shadow-[0_10px_30px_-18px_rgb(18_59_58/0.35)]">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-green"><ServiceIcon id={id} size={22} /></span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-teal">{t(name)}</h3>
          <p className="text-sm text-muted">{t(svc.agency)}</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-muted">{ar ? "من يطلبها" : "Who can request"}</dt><dd className="text-ink first-letter:uppercase">{t(ROLE_LABEL[svc.requiredRole])}{svc.citizensOnly ? (ar ? "، للمواطنين فقط" : ", citizens only") : ""}</dd></div>
        <div><dt className="text-muted">{ar ? "المدة" : "Term"}</dt><dd className="text-ink">{terms(id, lang)}</dd></div>
        <div><dt className="text-muted">{ar ? "الرسوم (توضيحية)" : "Fee (illustrative)"}</dt><dd className="text-ink tabular-nums">{fmtSAR(min, lang)}{max !== min ? ` – ${fmtSAR(max, lang)}` : ""}</dd></div>
        <div><dt className="text-muted">{ar ? "جرّبها بصفة" : "Try it as"}</dt><dd className="text-ink">{who.map((p) => t(p.name)).join(ar ? "، " : ", ") || "—"}</dd></div>
      </dl>
      <button type="button" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}
        className="mt-4 flex min-h-11 items-center justify-between gap-2 border-t border-line pt-3 text-start text-sm font-medium text-teal hover:text-green">
        {ar ? "ما يتحقق منه الوكيل، والموصل" : "What the agent checks, and the connector"}
        <CaretDownIcon size={14} weight="bold" aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={panel} key="d" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
            <div className="grid gap-4 pb-1 pt-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted">{ar ? "التحقق قبل أي طلب" : "Checked before any request"}</p>
                <ul className="mt-1.5 space-y-1">{checks.map((c) => <li key={c.en} className="flex gap-2 text-ink"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-green" />{t(c)}</li>)}</ul>
              </div>
              <div>
                <p className="text-muted">{ar ? "البيانات الوحيدة التي يقرؤها الموصل" : "The only data its connector reads"}</p>
                <ul className="mt-1.5 space-y-1">{conn.dataScope.map((d) => <li key={d.en} className="flex gap-2 text-ink"><span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-sand" />{t(d)}</li>)}</ul>
                <p className="mt-2 text-xs text-muted"><bdi className="break-all font-mono">{conn.connectorId}</bdi> · {ar ? "محاكاة" : "simulated"} · <span className="num-ltr">{fmtNum(conn.rateLimitPerSec, lang)}/{ar ? "ث" : "s"}</span></p>
              </div>
              <p className="text-xs text-muted sm:col-span-2">{ar ? "المصدر:" : "Source:"} {t(svc.ruleSource)}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <a href={`/workspace?ask=${encodeURIComponent(t(ask))}`}
        className="group mt-5 inline-flex min-h-11 items-center gap-1.5 self-start rounded-full bg-teal px-4 text-sm font-semibold text-white transition-colors hover:bg-teal-2">
        {ar ? "ابدأ مع الوكيل" : "Start with the agent"}
        <ArrowRightIcon size={14} weight="bold" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
      </a>
    </motion.li>
  );
}

export default function Services() {
  const { t, ar, lang } = useT();
  const [filter, setFilter] = useState("all");
  const items = GROUPS.flatMap((g, gi) => g.items.map((s) => ({ ...s, group: String(gi) }))).filter((s) => filter === "all" || s.group === filter);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh">
        <AppNav menu>
          <LangToggle />
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-full bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2">{ar ? "جرّب العرض" : "Try the demo"}</Link>
        </AppNav>
        <main className="wrap py-10">
          <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
            <h1 className="text-3xl font-semibold text-teal sm:text-4xl">{ar ? "الخدمات" : "Services"}</h1>
            <p className="mt-3 max-w-[64ch] text-lg text-ink">
              {ar ? "سبع خدمات تجديد وسبع رحلات يومية، كلها على بيانات افتراضية. كل جهة تبقى صاحبة خدمتها وقواعدها، والوكيل لا يتجاوز موافقتك."
                : "Seven renewals and seven everyday journeys, all on synthetic data. Each agency keeps its service and its rules, and the agent never acts past your approval."}
            </p>
          </motion.header>

          <section aria-labelledby="steps-h" className="mt-10">
            <h2 id="steps-h" className="text-xl font-semibold text-teal">{ar ? "كل تجديد يمر بالخطوات الأربع نفسها" : "Every renewal follows the same four steps"}</h2>
            <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <motion.li key={s.tier} {...enter(i)} className="relative rounded-2xl border border-line bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-full bg-mint text-green"><s.icon size={18} aria-hidden="true" /></span>
                    <span className="text-xs text-muted">{ar ? `المستوى ${fmtNum(s.tier, lang)}` : `Tier ${s.tier}`}</span>
                  </div>
                  <p className="mt-3 font-medium text-teal">{t(s.name)}</p>
                  <p className="mt-1 text-sm text-ink">{t(s.line)}</p>
                </motion.li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="renew-h" className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="renew-h" className="text-xl font-semibold text-teal">{ar ? "خدمات التجديد" : "Renewals"}</h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label={ar ? "تصفية حسب الجهة" : "Filter by agency"}>
                {FILTERS.map((f) => (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                    className={`relative inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors ${filter === f.id ? "border-teal text-white" : "border-line bg-white text-teal hover:bg-mint"}`}>
                    {filter === f.id && <motion.span layoutId="svc-filter" className="absolute inset-0 rounded-full bg-teal" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} aria-hidden="true" />}
                    <span className="relative">{t(f.title)}</span>
                  </button>
                ))}
              </div>
            </div>
            <p role="status" className="sr-only">{ar ? `${fmtNum(items.length, lang)} خدمات معروضة` : `Showing ${items.length} services`}</p>
            <motion.ul layout className="mt-5 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {items.map((s, i) => <ServiceCard key={s.id} id={s.id} name={s.name} ask={s.ask} i={i} />)}
              </AnimatePresence>
            </motion.ul>
          </section>

          <section aria-labelledby="journeys-h" className="mt-14">
            <h2 id="journeys-h" className="text-xl font-semibold text-teal">{ar ? "رحلات يومية تتجاوز التجديد" : "Everyday journeys beyond renewals"}</h2>
            <p className="mt-1 max-w-[64ch] text-sm text-muted">{ar ? "يخطط الوكيل عبر الجهات ويقرأ الحالات، وكل خطوة تكتب في نظام جهة تحتاج موافقتك." : "The agent plans across agencies and reads status. Any step that writes to an agency still needs your approval."}</p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {JOURNEYS.map((j, i) => {
                const p = PERSONAS.find((x) => x.id === j.persona)!;
                return (
                  <motion.li key={j.name.en} {...enter(i)}>
                    <a href={`/workspace?ask=${encodeURIComponent(t(j.ask))}`}
                      className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-green/40 hover:shadow-[0_10px_30px_-18px_rgb(18_59_58/0.35)] motion-reduce:hover:translate-y-0">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-mint text-green"><j.icon size={20} aria-hidden="true" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2 font-medium text-teal group-hover:text-green">
                          {t(j.name)}
                          <ArrowRightIcon size={14} weight="bold" aria-hidden="true" className="shrink-0 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" />
                        </span>
                        <span className="mt-1 block text-sm text-ink">{t(j.line)}</span>
                        <span className="mt-2 block text-xs text-muted">{ar ? "جرّبها بصفة" : "Try it as"} {t(p.name)}</span>
                      </span>
                    </a>
                  </motion.li>
                );
              })}
            </ul>
          </section>

          <div className="mt-14"><Disclaimer /></div>
        </main>
      </div>
    </MotionConfig>
  );
}
