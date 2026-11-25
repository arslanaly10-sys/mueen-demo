"use client";
import { useStore } from "@/lib/store";

/** Abstract mark: a doorway formed by connected steps — no seals, emblems or flags. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#123B3A" />
      <path d="M9 25V15a7 7 0 0 1 14 0v10" fill="none" stroke="#E4F1EB" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="9" cy="25" r="2.4" fill="#C6A96B" />
      <circle cx="16" cy="8" r="2.4" fill="#E4F1EB" />
      <circle cx="23" cy="25" r="2.4" fill="#187A62" stroke="#E4F1EB" strokeWidth="1.2" />
    </svg>
  );
}

export function Wordmark() {
  const lang = useStore((s) => s.lang);
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={28} />
      <span className="hidden text-xl font-medium text-ink sm:inline">{lang === "ar" ? "مُعين" : "MUEEN"}</span>
    </span>
  );
}
