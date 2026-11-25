"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CaretDownIcon, DatabaseIcon, IdentificationBadgeIcon, ListChecksIcon, SignOutIcon } from "@phosphor-icons/react";
import type { Persona } from "@/lib/types";
import { endSession } from "./SessionGuard";
import { useT } from "./useT";
import { T } from "@/lib/i18n";

/** The signed-in person's menu: their tasks, identity and authority, data, and sign-out. */
export function AccountMenu({ persona }: { persona: Persona }) {
  const { t, ar } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    addEventListener("keydown", esc);
    addEventListener("pointerdown", out);
    return () => { removeEventListener("keydown", esc); removeEventListener("pointerdown", out); };
  }, [open]);

  const items = [
    { href: "/tasks", Icon: ListChecksIcon, label: ar ? "مهامي" : "My tasks" },
    { href: "/identity", Icon: IdentificationBadgeIcon, label: ar ? "الهوية والصلاحيات" : "Identity and authority" },
    { href: "/my-data", Icon: DatabaseIcon, label: ar ? "بياناتي" : "My data" },
  ];

  return (
    <div ref={ref} className="relative" onBlur={(e) => !ref.current?.contains(e.relatedTarget) && setOpen(false)}>
      <button ref={btn} type="button" aria-expanded={open} aria-controls="account-menu" onClick={() => setOpen(!open)}
        aria-label={ar ? `حساب ${t(persona.name)}` : `${t(persona.name)}'s account`}
        className="flex min-h-11 items-center gap-2 rounded-full px-1.5 hover:bg-mint sm:px-2">
        <span className="grid size-8 place-items-center rounded-full bg-teal text-xs font-medium text-mint" aria-hidden="true">{persona.initials}</span>
        <span className="hidden text-start text-sm leading-tight lg:block" aria-hidden="true">
          <span className="block font-medium text-teal">{t(persona.name)}</span>
          <span className="block text-xs text-muted">{t(persona.nationalityLabel)}</span>
        </span>
        <CaretDownIcon size={12} weight="bold" className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      <ul id="account-menu" hidden={!open} className="absolute end-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-[0_12px_24px_-16px_rgb(18_59_58/0.35)]">
        {items.map(({ href, Icon, label }) => (
          <li key={href}>
            <Link href={href} onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 px-4 text-sm text-teal hover:bg-mint">
              <Icon size={17} aria-hidden="true" /> {label}
            </Link>
          </li>
        ))}
        <li className="border-t border-line">
          <button type="button" onClick={async () => { setOpen(false); await endSession(persona.id, "SIGNED_OUT"); router.push("/login"); }}
            className="flex min-h-11 w-full items-center gap-2.5 px-4 text-sm text-teal hover:bg-mint">
            <SignOutIcon size={17} className="rtl:-scale-x-100" aria-hidden="true" /> {t(T.signOut)}
          </button>
        </li>
      </ul>
    </div>
  );
}
