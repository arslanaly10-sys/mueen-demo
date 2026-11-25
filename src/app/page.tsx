"use client";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileCheck2, Hand, LifeBuoy, ListChecks, MessageSquareText, Scale, ShieldCheck, Stamp } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { LangToggle } from "@/components/LangToggle";
import { ConceptBadge, Disclaimer } from "@/components/Disclaimer";
import { ServiceIcon } from "@/components/ServiceIcon";
import { StatusPill } from "@/components/StatusPill";
import { useT } from "@/components/useT";
import { T } from "@/lib/i18n";
import { SERVICES } from "@/lib/services";

const HOW = [
  { icon: MessageSquareText, title: { en: "Tell us what you need", ar: "أخبرنا بما تحتاجه" }, body: { en: "Type or speak in Arabic or English — “renew my license”.", ar: "اكتب أو تحدّث بالعربية أو الإنجليزية — «جدد رخصتي»." } },
  { icon: ListChecks, title: { en: "See the approved steps", ar: "اطّلع على الخطوات المعتمدة" }, body: { en: "A clear plan, the responsible agency, and read-only checks.", ar: "خطة واضحة والجهة المسؤولة وفحص للقراءة فقط." } },
  { icon: Hand, title: { en: "Approve each action", ar: "وافق على كل إجراء" }, body: { en: "Scoped authority you can revoke; details and payment approved separately.", ar: "صلاحية محددة قابلة للإلغاء؛ وموافقة مستقلة على التفاصيل والدفع." } },
  { icon: Stamp, title: { en: "Get a verified outcome", ar: "احصل على نتيجة موثقة" }, body: { en: "Success is shown only after the agency confirms, with a receipt.", ar: "لا يظهر النجاح إلا بعد تأكيد الجهة، مع إيصال." } },
];

const PRINCIPLES = [
  { icon: Scale, title: { en: "AI proposes. Rules decide.", ar: "الذكاء الاصطناعي يقترح، والقواعد تقرر." }, body: { en: "Deterministic policy code and the agency decide identity, eligibility, payment and completion — never the model.", ar: "شيفرة السياسات الحتمية والجهة المختصة تقرران الهوية والأهلية والدفع والإنجاز — وليس النموذج." } },
  { icon: ShieldCheck, title: { en: "Consent for every action", ar: "موافقة لكل إجراء" }, body: { en: "Authority is per service, per beneficiary, time-bound and revocable instantly.", ar: "الصلاحية لكل خدمة ولكل مستفيد، محددة بوقت وقابلة للإلغاء فورًا." } },
  { icon: FileCheck2, title: { en: "Evidence you can verify", ar: "أدلة يمكن التحقق منها" }, body: { en: "Every decision is written to a tamper-evident, hash-chained audit log.", ar: "يُسجَّل كل قرار في سجل تدقيق متسلسل ومقاوم للتلاعب." } },
  { icon: LifeBuoy, title: { en: "A human when it matters", ar: "موظف مختص عند الحاجة" }, body: { en: "Ambiguity, absence reports or payment doubts stop safely and route to a person.", ar: "الغموض أو بلاغات التغيب أو الشك في الدفع تتوقف بأمان وتُحوّل إلى موظف." } },
];

export default function Home() {
  const { t, lang, ar } = useT();
  const Arrow = ar ? ArrowLeft : ArrowRight;
  return (
    <main>
      <section className="relative overflow-hidden bg-teal text-white">
        <div className="path-grid absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <nav className="flex flex-wrap items-center justify-between gap-3 py-5">
            <div className="flex items-center gap-3">
              <Wordmark onDark />
              <ConceptBadge onDark />
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="hidden rounded-full px-3 py-1.5 text-sm text-mint/90 hover:bg-white/10 sm:inline-block">
                {t(T.openAdmin)}
              </Link>
              <LangToggle onDark />
            </div>
          </nav>

          <div className="grid items-center gap-10 pb-16 pt-8 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-14">
            <div className="rise">
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">{t(T.tagline)}</h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-mint/90">{t(T.message)}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-mint px-6 py-3 font-semibold text-teal shadow-sm transition hover:bg-white">
                  {t(T.startDemo)} <Arrow size={18} aria-hidden="true" />
                </Link>
                <Link href="/admin" className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 font-medium text-white transition hover:bg-white/10">
                  {t(T.openAdmin)}
                </Link>
              </div>
              <p className="mt-6 text-sm text-mint/70">{t(T.promise)}</p>
            </div>

            {/* Sample journey — shows the brand's status language, not a robot. */}
            <div className="rise rounded-3xl border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm" style={{ animationDelay: "120ms" }} aria-label={ar ? "مثال على رحلة" : "Example journey"}>
              <div className="rounded-2xl bg-white p-4 text-ink shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-green">
                    <ServiceIcon id="driving_license" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted">{ar ? "طلبك" : "Your request"}</p>
                    <p className="font-medium">{ar ? "«جدد رخصتي لمدة سنتين»" : "“Renew my license for two years”"}</p>
                  </div>
                </div>
                <ol className="mt-4 space-y-2.5">
                  {[
                    { tone: "ok", l: { en: "Information checked", ar: "تم التحقق من المعلومات" }, d: { en: "Medical exam, fines, renewal window", ar: "الفحص الطبي، المخالفات، فترة التجديد" } },
                    { tone: "ok", l: { en: "Approved by you", ar: "وافقت عليه" }, d: { en: "Details, then payment — separately", ar: "التفاصيل ثم الدفع — كلٌ على حدة" } },
                    { tone: "info", l: { en: "Submitted to Traffic", ar: "أُرسل إلى المرور" }, d: { en: "Once, with an idempotency key", ar: "مرة واحدة بمفتاح منع التكرار" } },
                    { tone: "ok", l: { en: "Confirmed by Traffic", ar: "أكده المرور" }, d: { en: "Official receipt attached", ar: "مع إيصال رسمي" } },
                  ].map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2">
                      <span className="text-sm text-muted">{t(s.d)}</span>
                      <StatusPill tone={s.tone as "ok" | "info"}>{t(s.l)}</StatusPill>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-3 text-center text-xs text-mint/70">{ar ? "مثال توضيحي ببيانات افتراضية" : "Illustrative example with synthetic data"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-teal">{ar ? "كيف يعمل" : "How it works"}</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW.map((h, i) => (
            <li key={i} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-mint text-green">
                  <h.icon size={20} aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-sand">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-4 font-semibold text-teal">{t(h.title)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(h.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-teal">{ar ? "سبع خدمات تجديد في العرض" : "Seven renewal services in this demo"}</h2>
              <p className="mt-2 max-w-2xl text-muted">
                {ar
                  ? "كل خدمة تعمل عبر موصل تجريبي ببيانات افتراضية. الربط الفعلي يتطلب موافقة كل جهة مالكة للخدمة."
                  : "Each runs through a mock connector with synthetic data. Live integration would need each owning agency’s approval."}
              </p>
            </div>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <li key={s.id} className="flex gap-3 rounded-2xl border border-line p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal text-mint">
                  <ServiceIcon id={s.id} />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-teal">{s.name[lang]}</p>
                  <p className="mt-0.5 text-sm text-muted">{s.agency[lang]}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold text-teal">{ar ? "مبادئ الثقة" : "Built for trust"}</h2>
        <p className="mt-2 max-w-2xl text-muted">
          {ar ? "تبقى الجهات الحكومية مسؤولة عن خدماتها وقواعدها وقرارات الأهلية والنتائج الرسمية." : "Government entities remain responsible for their services, rules, eligibility decisions and official outcomes."}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <div key={i} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-green">
                <p.icon size={22} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-semibold text-teal">{t(p.title)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t(p.body)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-teal px-6 py-3 font-semibold text-white transition hover:bg-teal-2">
            <CheckCircle2 size={18} aria-hidden="true" /> {t(T.startDemo)}
          </Link>
        </div>
      </section>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
          <Disclaimer />
          <p className="text-xs text-muted">
            {t(T.brand)} — {t(T.placeholderName)}
          </p>
        </div>
      </footer>
    </main>
  );
}
