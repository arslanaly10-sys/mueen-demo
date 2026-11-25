"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { AdminConfig, AppointmentPurpose, AuditEvent, Intent, L, Lang, LifeEvent, Mandate, ServiceId, Transaction } from "./types";
import type { Booking } from "./engine/engine";

// Demo persistence is per-browser (localStorage) so the stateless serverless backend works
// anywhere. A production deployment would use a government-hosted database instead.

export type ChatMessage =
  | { id: string; role: "user"; text: string; at: string }
  | { id: string; role: "agent"; text: string; engine?: "claude" | "scripted"; at: string }
  | { id: string; role: "agent"; kind: "notice"; tone: "warn" | "info"; textL: L; at: string }
  | { id: string; role: "agent"; kind: "plan"; intents: Intent[]; at: string }
  | { id: string; role: "agent"; kind: "expiring"; intents: Intent[]; at: string }
  | { id: string; role: "agent"; kind: "suggest"; at: string }
  | { id: string; role: "agent"; kind: "outOfScope"; topic: string; at: string }
  | { id: string; role: "agent"; kind: "authority"; serviceId: ServiceId; targetId: string; mandateId?: string; at: string }
  | { id: string; role: "agent"; kind: "tx"; txId: string; at: string }
  | { id: string; role: "agent"; kind: "status"; at: string }
  | { id: string; role: "agent"; kind: "appointment"; purpose: AppointmentPurpose; at: string }
  | { id: string; role: "agent"; kind: "lifeEvent"; event: LifeEvent; at: string }
  | { id: string; role: "agent"; kind: "business"; at: string };

export interface Reminder {
  id: string;
  personaId: string;
  serviceId: ServiceId;
  targetId: string;
  createdAt: string;
}

export const DEFAULT_CONFIG: AdminConfig = {
  killSwitch: false,
  disabledServices: [],
  connectorHealth: {},
  policyVersion: "2026.11-demo.3",
};

interface State {
  lang: Lang;
  personaId: string | null;
  /** signed session token from the server (demo: kept in this browser) */
  session: string | null;
  audit: AuditEvent[];
  mandates: Mandate[];
  txs: Transaction[];
  chats: Record<string, ChatMessage[]>;
  reminders: Reminder[];
  appointments: Booking[];
  /** personaId → when they accepted the privacy notice */
  consents: Record<string, string>;
  config: AdminConfig;
  selectedTxId: string | null;
  setLang: (l: Lang) => void;
  setPersona: (id: string | null) => void;
  setSession: (token: string | null) => void;
  appendAudit: (e: AuditEvent[]) => void;
  upsertTx: (tx: Transaction) => void;
  upsertMandate: (m: Mandate) => void;
  addMessage: (personaId: string, m: ChatMessage) => void;
  patchMessage: (personaId: string, id: string, patch: Partial<ChatMessage>) => void;
  addReminder: (r: Reminder) => void;
  upsertBooking: (b: Booking) => void;
  setConfig: (c: Partial<AdminConfig>) => void;
  setConsent: (personaId: string, at: string | null) => void;
  /** Deletes one persona's requests, authorities, conversation, reminders and consent; the signed audit log stays. */
  forgetPersona: (personaId: string) => void;
  selectTx: (id: string | null) => void;
  tamperAudit: () => void;
  reset: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      lang: "ar",
      personaId: null,
      session: null,
      audit: [],
      mandates: [],
      txs: [],
      chats: {},
      reminders: [],
      appointments: [],
      consents: {},
      config: DEFAULT_CONFIG,
      selectedTxId: null,
      setLang: (lang) => set({ lang }),
      setPersona: (personaId) => set((s) => ({ personaId, selectedTxId: null, session: personaId ? s.session : null })),
      setSession: (session) => set({ session }),
      appendAudit: (e) => set((s) => ({ audit: [...s.audit, ...e] })),
      upsertTx: (tx) =>
        set((s) => ({ txs: s.txs.some((t) => t.id === tx.id) ? s.txs.map((t) => (t.id === tx.id ? tx : t)) : [...s.txs, tx], selectedTxId: tx.id })),
      upsertMandate: (m) => set((s) => ({ mandates: s.mandates.some((x) => x.id === m.id) ? s.mandates.map((x) => (x.id === m.id ? m : x)) : [...s.mandates, m] })),
      addMessage: (pid, m) => set((s) => ({ chats: { ...s.chats, [pid]: [...(s.chats[pid] ?? []), m] } })),
      patchMessage: (pid, id, patch) =>
        set((s) => ({ chats: { ...s.chats, [pid]: (s.chats[pid] ?? []).map((m) => (m.id === id ? ({ ...m, ...patch } as ChatMessage) : m)) } })),
      addReminder: (r) => set((s) => ({ reminders: [...s.reminders, r] })),
      upsertBooking: (b) => set((s) => ({ appointments: s.appointments.some((x) => x.ref === b.ref) ? s.appointments.map((x) => (x.ref === b.ref ? b : x)) : [...s.appointments, b] })),
      setConfig: (c) => set((s) => ({ config: { ...s.config, ...c } })),
      setConsent: (pid, at) =>
        set((s) => {
          const consents = { ...s.consents };
          if (at) consents[pid] = at;
          else delete consents[pid];
          return { consents };
        }),
      forgetPersona: (pid) =>
        set((s) => {
          const chats = { ...s.chats };
          delete chats[pid];
          const consents = { ...s.consents };
          delete consents[pid];
          return {
            txs: s.txs.filter((t) => t.personaId !== pid),
            mandates: s.mandates.filter((m) => m.personaId !== pid),
            reminders: s.reminders.filter((r) => r.personaId !== pid),
            appointments: s.appointments.filter((b) => b.personaId !== pid),
            chats,
            consents,
            selectedTxId: null,
          };
        }),
      selectTx: (selectedTxId) => set({ selectedTxId }),
      tamperAudit: () =>
        set((s) => {
          if (s.audit.length < 2) return s;
          const i = Math.floor(s.audit.length / 2);
          const audit = s.audit.map((e, idx) => (idx === i ? { ...e, summary: { en: e.summary.en + " [edited]", ar: e.summary.ar + " [مُعدّل]" } } : e));
          return { audit };
        }),
      reset: () => set({ audit: [], mandates: [], txs: [], chats: {}, reminders: [], appointments: [], consents: {}, config: DEFAULT_CONFIG, selectedTxId: null }),
    }),
    { name: "mueen-demo-v1", storage: createJSONStorage(() => localStorage) },
  ),
);

/** True once persisted state has loaded in the browser — avoids hydration mismatches. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => setH(true));
    if (useStore.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
