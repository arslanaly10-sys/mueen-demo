/** Abstract mark: a doorway formed by connected steps — no seals, emblems or flags. */
export function LogoMark({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill={onDark ? "#E4F1EB" : "#123B3A"} />
      <path d="M9 25V15a7 7 0 0 1 14 0v10" fill="none" stroke={onDark ? "#123B3A" : "#E4F1EB"} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="9" cy="25" r="2.4" fill="#C6A96B" />
      <circle cx="16" cy="8" r="2.4" fill={onDark ? "#123B3A" : "#E4F1EB"} />
      <circle cx="23" cy="25" r="2.4" fill="#187A62" stroke={onDark ? "#123B3A" : "#E4F1EB"} strokeWidth="1.2" />
    </svg>
  );
}

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark onDark={onDark} />
      <span className={`flex items-baseline gap-2 font-semibold tracking-tight ${onDark ? "text-white" : "text-teal"}`}>
        <span className="text-lg" style={{ fontFamily: "var(--font-arabic)" }}>مُعين</span>
        <span className={`text-sm tracking-[0.18em] ${onDark ? "text-mint/80" : "text-green"}`}>MUEEN</span>
      </span>
    </span>
  );
}
