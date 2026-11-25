"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, MessageSquare, PanelsTopLeft, ShieldAlert } from "lucide-react";
import { Wordmark } from "@/components/Logo";
import { LangToggle } from "@/components/LangToggle";
import { ConceptBadge, Disclaimer } from "@/components/Disclaimer";
import { EngineBadge } from "@/components/EngineBadge";
import { Chat } from "@/components/workspace/Chat";
import { SidePanel } from "@/components/workspace/SidePanel";
import { useT } from "@/components/useT";
import { useHydrated, useStore } from "@/lib/store";
import { getPersona } from "@/lib/personas";
import { T } from "@/lib/i18n";

export default function Workspace() {
  const { t, lang } = useT();
  const hydrated = useHydrated();
  const router = useRouter();
  const personaId = useStore((s) => s.personaId);
  const killSwitch = useStore((s) => s.config.killSwitch);
  const setPersona = useStore((s) => s.setPersona);
  const [mobileTab, setMobileTab] = useState<"chat" | "panel">("chat");
  const persona = personaId ? getPersona(personaId) : undefined;

  useEffect(() => {
    if (hydrated && !persona) router.replace("/login");
  }, [hydrated, persona, router]);

  if (!hydrated || !persona) return <div className="min-h-dvh bg-warm" />;

  return (
    <div className="flex h-dvh flex-col">
      <header className="shrink-0 bg-teal text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Home"><Wordmark onDark /></Link>
          <span className="hidden sm:inline"><ConceptBadge onDark /></span>
          <div className="ms-auto flex items-center gap-2">
            <EngineBadge onDark />
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-mint/90 hover:bg-white/10 sm:inline-flex">
              <LayoutDashboard size={15} aria-hidden="true" /> {t(T.openAdmin)}
            </Link>
            <LangToggle onDark />
            <div className="flex items-center gap-2 border-s border-white/15 ps-3">
              <span className="grid size-8 place-items-center rounded-full bg-mint text-xs font-semibold text-teal" aria-hidden="true">{persona.initials}</span>
              <span className="hidden text-sm leading-tight lg:block">
                <span className="block font-medium">{t(persona.name)}</span>
                <span className="block text-xs text-mint/70">{t(persona.nationalityLabel)}</span>
              </span>
              <button
                onClick={() => { setPersona(null); router.push("/login"); }}
                className="grid size-8 place-items-center rounded-full text-mint/80 hover:bg-white/10"
                aria-label={t(T.signOut)}
                title={t(T.signOut)}
              >
                <LogOut size={16} className="rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {killSwitch && (
        <div className="shrink-0 bg-err px-4 py-2 text-center text-sm font-medium text-white" role="status">
          <ShieldAlert size={15} className="me-1.5 inline" aria-hidden="true" />
          {lang === "ar" ? "الإيقاف الطارئ مفعّل: جميع إجراءات الوكيل متوقفة من قبل مشغل المنصة." : "Emergency stop is on: all agent actions are paused by the platform operator."}
        </div>
      )}

      <div className="flex shrink-0 gap-1 border-b border-line bg-white p-1.5 lg:hidden" role="tablist">
        {([
          ["chat", MessageSquare, lang === "ar" ? "المحادثة" : "Conversation"],
          ["panel", PanelsTopLeft, lang === "ar" ? "المسار والسجلات" : "Timeline & records"],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={mobileTab === id}
            onClick={() => setMobileTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium ${mobileTab === id ? "bg-mint text-green" : "text-muted"}`}
          >
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>

      <main className="mx-auto grid min-h-0 w-full max-w-7xl flex-1 gap-4 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`min-h-0 flex-col ${mobileTab === "chat" ? "flex" : "hidden"} lg:flex`}>
          <Chat personaId={persona.id} />
        </div>
        <div className={`min-h-0 flex-col ${mobileTab === "panel" ? "flex" : "hidden"} lg:flex`}>
          <SidePanel personaId={persona.id} />
        </div>
      </main>
      <footer className="hidden shrink-0 border-t border-line bg-white px-6 py-2 lg:block">
        <div className="mx-auto max-w-7xl"><Disclaimer compact /></div>
      </footer>
    </div>
  );
}
