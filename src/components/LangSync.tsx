"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Keeps <html lang/dir> in sync with the chosen language (Arabic is RTL from the start). */
export function LangSync() {
  const lang = useStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  return null;
}
