"use client";
import { Languages } from "lucide-react";
import { useStore } from "@/lib/store";

export function LangToggle({ onDark = false }: { onDark?: boolean }) {
  const lang = useStore((s) => s.lang);
  const setLang = useStore((s) => s.setLang);
  return (
    <button
      onClick={() => setLang(lang === "ar" ? "en" : "ar")}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
        onDark ? "border-white/25 text-white hover:bg-white/10" : "border-line bg-white text-teal hover:bg-mint"
      }`}
      aria-label={lang === "ar" ? "Switch to English" : "التبديل إلى العربية"}
    >
      <Languages size={15} aria-hidden="true" />
      {lang === "ar" ? "English" : "العربية"}
    </button>
  );
}
