"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChatTextIcon, LayoutIcon, ShieldWarningIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { AccountMenu } from "@/components/AccountMenu";
import { ConsentGate } from "@/components/ConsentGate";
import { SessionGuard } from "@/components/SessionGuard";
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
import { tabKeys } from "@/components/tabKeys";

export default function Workspace() {
  const { t, lang } = useT();
  const hydrated = useHydrated();
  const router = useRouter();
  const personaId = useStore((s) => s.personaId);
  const killSwitch = useStore((s) => s.config.killSwitch);
  const consentAt = useStore((s) => (s.personaId ? s.consents[s.personaId] : undefined));
  const [mobileTab, setMobileTab] = useState<"chat" | "panel">("chat");
  const persona = personaId ? getPersona(personaId) : undefined;

  useEffect(() => {
    if (hydrated && !persona) router.replace("/login");
  }, [hydrated, persona, router]);

  if (!hydrated || !persona) return <div className="min-h-dvh bg-warm" />;

  return (
    <div className="flex h-dvh flex-col">
      <AppNav menu>
        <EngineBadge />
        <Link href="/admin" className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-teal hover:bg-mint sm:inline-flex">
          <SquaresFourIcon size={15} aria-hidden="true" /> {t(T.openAdmin)}
        </Link>
        <LangToggle />
        <AccountMenu persona={persona} />
      </AppNav>

      <SessionGuard personaId={persona.id} />
      {!consentAt ? <ConsentGate personaId={persona.id} /> : (<>
      {killSwitch && (
        <div className="shrink-0 bg-err px-4 py-2 text-center text-sm font-medium text-white" role="status">
          <ShieldWarningIcon size={15} className="me-1.5 inline" aria-hidden="true" />
          {lang === "ar" ? "الإيقاف الطارئ مفعّل: جميع إجراءات الوكيل متوقفة من قبل مشغل المنصة." : "Emergency stop is on: all agent actions are paused by the platform operator."}
        </div>
      )}

      <div className="flex shrink-0 gap-1 border-b border-line bg-white p-1.5 lg:hidden" role="tablist" onKeyDown={(e) => tabKeys(e, ["chat", "panel"] as const, mobileTab, setMobileTab)}>
        {([
          ["chat", ChatTextIcon, lang === "ar" ? "المحادثة" : "Conversation"],
          ["panel", LayoutIcon, lang === "ar" ? "المسار والسجلات" : "Timeline & records"],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            role="tab"
            id={`mtab-${id}`}
            aria-selected={mobileTab === id}
            aria-controls={`mpanel-${id}`}
            tabIndex={mobileTab === id ? 0 : -1}
            onClick={() => setMobileTab(id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors ${mobileTab === id ? "text-green" : "text-muted"}`}
          >
            {mobileTab === id && <motion.span layoutId="mobile-tab" aria-hidden="true" className="absolute inset-0 rounded-lg bg-mint" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
            <Icon size={16} aria-hidden="true" className="relative" /> <span className="relative">{label}</span>
          </button>
        ))}
      </div>

      {/* taste-skill app-frame: one window, the open item beside its details, panes parted by a hairline */}
      <main className="wrap grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] overflow-hidden border-line bg-white sm:my-4 sm:rounded-[20px] sm:border lg:grid-cols-[minmax(0,1fr)_380px]">
        <div id="mpanel-chat" role="tabpanel" aria-labelledby="mtab-chat" className={`min-h-0 flex-col ${mobileTab === "chat" ? "flex" : "hidden"} lg:flex`}>
          <Chat personaId={persona.id} />
        </div>
        <div id="mpanel-panel" role="tabpanel" aria-labelledby="mtab-panel" className={`min-h-0 flex-col border-line lg:border-s ${mobileTab === "panel" ? "flex" : "hidden"} lg:flex`}>
          <SidePanel personaId={persona.id} />
        </div>
      </main>
      </>)}
      <footer className="hidden shrink-0 border-t border-line bg-white px-6 py-2 lg:block">
        <div className="wrap"><Disclaimer compact /></div>
      </footer>
    </div>
  );
}
