import { Wordmark } from "./Logo";
import { ConceptBadge } from "./Disclaimer";

/** The landing page's bar (taste-skill system.md, Nav): opaque, a 1px hairline, the logo on the left line. */
export function AppNav({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-line bg-warm">
      <div className="wrap flex h-14 items-center gap-3 sm:h-[72px]">
        <a href="/" aria-label="MUEEN"><Wordmark /></a>
        <span className="hidden sm:inline"><ConceptBadge /></span>
        <div className="ms-auto flex items-center gap-2">{children}</div>
      </div>
    </header>
  );
}
