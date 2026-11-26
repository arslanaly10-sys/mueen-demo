"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { Wordmark } from "./Logo";
import { ConceptBadge } from "./Disclaimer";
import { ServiceIcon } from "./ServiceIcon";
import { useT } from "./useT";
import type { ServiceId } from "@/lib/types";

type L = { en: string; ar: string };
// The landing page's mega menu, same groups and grey lines; `ask` is what a click says to the agent.
export const GROUPS: { title: L; items: { id: ServiceId; name: L; line: L; ask: L }[] }[] = [
  { title: { en: "Traffic", ar: "الإدارة العامة للمرور" }, items: [
    { id: "driving_license", name: { en: "Driving licence", ar: "رخصة القيادة" }, line: { en: "Medical exam and fines checked", ar: "يتحقق من الفحص الطبي والمخالفات" }, ask: { en: "Renew my driving license", ar: "جدد رخصة القيادة" } },
    { id: "vehicle_registration", name: { en: "Istimara", ar: "الاستمارة" }, line: { en: "Checks insurance, inspection", ar: "يتحقق من التأمين والفحص الدوري" }, ask: { en: "Renew my vehicle registration", ar: "جدد استمارة مركبتي" } },
  ] },
  { title: { en: "Passports", ar: "المديرية العامة للجوازات" }, items: [
    { id: "passport", name: { en: "Saudi passport", ar: "الجواز السعودي" }, line: { en: "Citizens, 5 or 10 years", ar: "للمواطنين، 5 أو 10 سنوات" }, ask: { en: "Renew my Saudi passport", ar: "جدد جواز سفري السعودي" } },
    { id: "iqama_domestic", name: { en: "Domestic-worker iqama", ar: "إقامة العمالة المنزلية" }, line: { en: "For registered sponsors", ar: "لأصحاب العمل المسجّلين" }, ask: { en: "Renew my domestic worker's iqama", ar: "جدد إقامة العاملة المنزلية" } },
  ] },
  { title: { en: "Work and business", ar: "العمل والأعمال" }, items: [
    { id: "work_permit", name: { en: "Work permit", ar: "رخصة العمل" }, line: { en: "Nitaqat zone checked first", ar: "يتحقق من نطاق المنشأة أولًا" }, ask: { en: "Renew a work permit", ar: "جدد رخصة عمل" } },
    { id: "health_certificate", name: { en: "Health certificate", ar: "الشهادة الصحية" }, line: { en: "For food-handling staff", ar: "للعاملين في الأغذية" }, ask: { en: "Renew a health certificate", ar: "جدد شهادة صحية" } },
    { id: "consulting_license", name: { en: "Consulting licence", ar: "الترخيص الاستشاري" }, line: { en: "Three-year professional term", ar: "ترخيص مهني لثلاث سنوات" }, ask: { en: "Renew my consulting license", ar: "جدد ترخيصي الاستشاري" } },
  ] },
];

function ServicesMenu() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // focus inside the closing panel would be left on a hidden link
      if (ref.current?.contains(document.activeElement)) ref.current.querySelector("button")?.focus();
      setOpen(false);
    };
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("keydown", esc);
    addEventListener("pointerdown", out);
    return () => { removeEventListener("keydown", esc); removeEventListener("pointerdown", out); };
  }, [open]);

  return (
    <nav aria-label={t({ en: "Services", ar: "الخدمات" })} ref={ref} className="sm:ms-2" onMouseLeave={() => setOpen(false)} onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="services-menu"
        onClick={() => setOpen(!open)}
        onMouseEnter={() => setOpen(true)}
        className="flex h-11 items-center gap-1 rounded-full px-2 text-sm sm:px-3 font-medium text-teal hover:bg-mint"
      >
        {t({ en: "Services", ar: "الخدمات" })}
        <CaretDownIcon size={12} weight="bold" className={`transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {/* full width under the bar; the hover gap is bridged by the panel's own top padding */}
      <div id="services-menu" hidden={!open} className="absolute inset-x-0 top-full max-h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain border-y border-line bg-warm py-6 shadow-[0_12px_24px_-16px_rgb(18_59_58/0.25)] sm:py-8">
        <div className="wrap grid gap-8 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title.en}>
              <p className="mb-3 text-sm text-muted">{t(g.title)}</p>
              <ul className="space-y-1">
                {g.items.map((s) => (
                  <li key={s.id}>
                    {/* a full load, so the chat picks the request up on mount wherever you are */}
                    <a href={`/workspace?ask=${encodeURIComponent(t(s.ask))}`} className="group block rounded-xl py-2">
                      <span className="flex items-center gap-2 font-medium text-teal group-hover:text-green">
                        <ServiceIcon id={s.id} size={20} className="text-green" /> {t(s.name)}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{t(s.line)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="wrap mt-6 border-t border-line pt-4">
          <a href="/services" className="inline-flex min-h-11 items-center gap-1.5 font-medium text-green underline-offset-4 hover:underline">
            {t({ en: "All services, checks and fees", ar: "كل الخدمات وشروطها ورسومها" })} <ArrowRightIcon size={14} weight="bold" className="rtl:-scale-x-100" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}

/** The landing page's bar (taste-skill system.md, Nav): opaque, a 1px hairline, the logo on the left line. */
export function AppNav({ children, menu = false }: { children: React.ReactNode; menu?: boolean }) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-warm">
      <div className="wrap flex h-14 items-center gap-2 sm:h-[72px] sm:gap-3">
        <a href="/" aria-label="Saudi Government AI Services Platform, home"><Wordmark /></a>
        <span className="hidden sm:inline"><ConceptBadge /></span>
        {menu && <ServicesMenu />}
        <div className="ms-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
