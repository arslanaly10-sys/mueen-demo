"use client";
import { useStore } from "@/lib/store";
import { tr } from "@/lib/i18n";
import type { L } from "@/lib/types";

export function useT() {
  const lang = useStore((s) => s.lang);
  return { lang, t: (l: L | undefined) => tr(l, lang), ar: lang === "ar" };
}
