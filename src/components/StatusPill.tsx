import { CheckCircleIcon, InfoIcon, MinusCircleIcon, RadioButtonIcon, WarningIcon } from "@phosphor-icons/react";

const TONES = {
  ok: { cls: "bg-mint text-green border-green/30", Icon: CheckCircleIcon },
  info: { cls: "bg-sky/40 text-teal border-sky", Icon: RadioButtonIcon },
  warn: { cls: "bg-warn-bg text-warn-ink border-warn/30", Icon: WarningIcon },
  error: { cls: "bg-err-bg text-err border-err/30", Icon: WarningIcon },
  neutral: { cls: "bg-white text-muted border-line", Icon: MinusCircleIcon },
  plain: { cls: "bg-white text-teal border-line", Icon: InfoIcon },
} as const;

/** Status labels always pair colour with an icon and words. */
export function StatusPill({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const { cls, Icon } = TONES[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      <Icon size={13} aria-hidden="true" />
      {children}
    </span>
  );
}
