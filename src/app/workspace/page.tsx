"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogOut, MessageSquare, PanelsTopLeft, ShieldAlert } from "lucide-react";
import { AppNav } from "@/components/AppNav";
import { LangToggle } from "@/components/LangToggle";
import { Disclaimer } from "@/components/Disclaimer";
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
      <AppNav>
        <EngineBadge />
        <Link href="/admin" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-teal hover:bg-mint sm:inline-flex">
          <LayoutDashboard size={15} aria-hidden="true" /> {t(T.openAdmin)}
        </Link>
        <LangToggle />
        <div className="flex items-center gap-2 border-s border-line ps-3">
          <span className="grid size-8 place-items-center rounded-full bg-teal text-xs font-medium text-mint" aria-hidden="true">{persona.initials}</span>
          <span className="hidden text-sm leading-tight lg:block">
            <span className="block font-medium text-teal">{t(persona.name)}</span>
            <span className="block text-xs text-muted">{t(persona.nationalityLabel)}</span>
          </span>
          <button
            onClick={() => { setPersona(null); router.push("/login"); }}
            className="grid size-11 place-items-center rounded-full text-muted hover:bg-mint hover:text-teal"
            aria-label={t(T.signOut)}
            title={t(T.signOut)}
          >
            <LogOut size={16} className="rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>
      </AppNav>

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

      {/* taste-skill app-frame: one window, the open item beside its details, panes parted by a hairline */}
      <main className="wrap grid min-h-0 flex-1 overflow-hidden border-line bg-white sm:my-4 sm:rounded-[20px] sm:border lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className={`min-h-0 flex-col ${mobileTab === "chat" ? "flex" : "hidden"} lg:flex`}>
          <Chat personaId={persona.id} />
        </div>
        <div className={`min-h-0 flex-col border-line lg:border-s ${mobileTab === "panel" ? "flex" : "hidden"} lg:flex`}>
          <SidePanel personaId={persona.id} />
        </div>
      </main>
      <footer className="hidden shrink-0 border-t border-line bg-white px-6 py-2 lg:block">
        <div className="wrap"><Disclaimer compact /></div>
      </footer>
    </div>
  );
}
