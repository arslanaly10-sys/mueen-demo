import { AlertTriangle, CheckCircle2, CircleDot, Info, MinusCircle } from "lucide-react";

const TONES = {
  ok: { cls: "bg-mint text-green border-green/30", Icon: CheckCircle2 },
  info: { cls: "bg-sky/40 text-teal border-sky", Icon: CircleDot },
  warn: { cls: "bg-warn-bg text-warn border-warn/30", Icon: AlertTriangle },
  error: { cls: "bg-err-bg text-err border-err/30", Icon: AlertTriangle },
  neutral: { cls: "bg-white text-muted border-line", Icon: MinusCircle },
  plain: { cls: "bg-white text-teal border-line", Icon: Info },
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
