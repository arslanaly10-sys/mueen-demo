"use client";
import { useStore } from "@/lib/store";

export function LangToggle() {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      lang={lang === "ar" ? "en" : "ar"}
      className="min-h-11 rounded-full px-2 text-[15px] font-medium text-ink hover:bg-mint sm:px-3"
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
