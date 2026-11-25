"use client";
import { ShieldAlert } from "lucide-react";
import { useT } from "./useT";
import { T } from "@/lib/i18n";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  return (
    <p className={`flex items-start gap-2 text-muted ${compact ? "text-xs leading-snug" : "text-xs leading-relaxed"}`}>
      <ShieldAlert size={compact ? 13 : 15} className="mt-0.5 shrink-0 text-sand" aria-hidden="true" />
      <span>{t(T.disclaimer)}</span>
    </p>
  );
}

export function ConceptBadge() {
  const { t } = useT();
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-medium border-sand/70 bg-sand/10 text-[#7a6230]`}
    >
      {t(T.concept)}
    </span>
  );
}
