"use client";
import { engine, interpret, sleep } from "@/lib/client";
import { getPersona } from "@/lib/personas";
import { SERVICES, SERVICE_MAP, daysUntil } from "@/lib/services";
import { uid, useStore } from "@/lib/store";
import type { Action, Intent, ServiceId, Transaction } from "@/lib/types";
import { T } from "@/lib/i18n";

// Client-side conversation orchestrator. It only sequences UI steps; every consequential
// decision (policy, state transitions, connector calls, audit) happens in the backend engine.

const now = () => new Date().toISOString();
const S = () => useStore.getState();

export function mandateFor(tx: Transaction) {
  return S().mandates.find((m) => m.id === tx.mandateId) ?? null;
}

export async function handleUserText(personaId: string, text: string) {
  const add = (m: Parameters<ReturnType<typeof S>["addMessage"]>[1]) => S().addMessage(personaId, m);
  add({ id: uid(), role: "user", text, at: now() });
  const r = await interpret(text, personaId);
  if (r.injectionSuspected) add({ id: uid(), role: "agent", kind: "notice", tone: "warn", textL: T.injectionNotice, at: now() });
  add({ id: uid(), role: "agent", text: r.reply, engine: r.engine, at: now() });

  switch (r.scope) {
    case "single":
    case "multi":
      if (r.intents.length) add({ id: uid(), role: "agent", kind: "plan", intents: r.intents, at: now() });
      else add({ id: uid(), role: "agent", kind: "suggest", at: now() });
      break;
    case "expiring_all":
      add({ id: uid(), role: "agent", kind: "expiring", intents: expiringIntents(personaId), at: now() });
      break;
    case "out_of_scope":
      add({ id: uid(), role: "agent", kind: "outOfScope", topic: r.outOfScopeTopic ?? "other", at: now() });
      break;
    case "unclear":
      add({ id: uid(), role: "agent", kind: "suggest", at: now() });
      break;
    default:
      break;
  }
}

export function expiringIntents(personaId: string, withinDays = 90): Intent[] {
  const p = getPersona(personaId)!;
  return SERVICES.flatMap((s) =>
    s.authority(p).ok ? s.targets(p).filter((t) => daysUntil(t.expiry) <= withinDays).map((t) => ({ serviceId: s.id, targetId: t.id })) : [],
  );
}

export function proposePlan(personaId: string, serviceId: ServiceId, targetId: string) {
  S().addMessage(personaId, { id: uid(), role: "agent", kind: "plan", intents: [{ serviceId, targetId }], at: now() });
}

export function openAuthority(personaId: string, serviceId: ServiceId, targetId: string) {
  S().addMessage(personaId, { id: uid(), role: "agent", kind: "authority", serviceId, targetId, at: now() });
}

export async function grantAndStart(args: {
  personaId: string;
  messageId: string;
  serviceId: ServiceId;
  targetId: string;
  actions: Action[];
  hours: number;
}) {
  const g = await engine({ action: "grant", personaId: args.personaId, serviceId: args.serviceId, targetId: args.targetId, grant: { actions: args.actions, hours: args.hours } });
  if (!g.mandate) return;
  S().patchMessage(args.personaId, args.messageId, { mandateId: g.mandate.id } as never);
  await sleep(350);
  const st = await engine({ action: "start", personaId: args.personaId, serviceId: args.serviceId, targetId: args.targetId, mandate: g.mandate });
  if (st.tx) S().addMessage(args.personaId, { id: uid(), role: "agent", kind: "tx", txId: st.tx.id, at: now() });
}

export async function approveDetails(tx: Transaction, durationIndex: number) {
  return engine({ action: "confirm", tx, mandate: mandateFor(tx), durationIndex });
}

async function submitAndTrack(tx: Transaction) {
  await sleep(700);
  const sub = await engine({ action: "submit", tx, mandate: mandateFor(tx) });
  if (sub.tx?.state !== "SUBMITTED") return;
  await sleep(1400);
  await engine({ action: "track", tx: sub.tx });
}

export async function approvePayment(tx: Transaction) {
  const r = await engine({ action: "pay", tx, mandate: mandateFor(tx) });
  if (r.tx?.state === "PAYMENT_CONFIRMED") await submitAndTrack(r.tx);
  return r;
}

export async function reconcile(tx: Transaction) {
  const r = await engine({ action: "reconcile", tx });
  if (r.tx?.state === "PAYMENT_CONFIRMED") await submitAndTrack(r.tx);
  return r;
}

export async function resume(tx: Transaction) {
  if (tx.state === "PAYMENT_CONFIRMED") return submitAndTrack(tx);
  if (tx.state === "SUBMITTED") return engine({ action: "track", tx });
}

export const cancelTx = (tx: Transaction) => engine({ action: "cancel", tx });
export const escalate = (tx: Transaction) => engine({ action: "escalate", tx });

export async function revokeMandate(personaId: string, mandateId: string) {
  const m = S().mandates.find((x) => x.id === mandateId);
  if (!m || m.revokedAt) return;
  await engine({ action: "revoke", personaId, mandate: m });
  const affected = S().txs.filter((t) => t.mandateId === mandateId);
  const svc = SERVICE_MAP[m.serviceId];
  S().addMessage(personaId, {
    id: uid(),
    role: "agent",
    kind: "notice",
    tone: "info",
    textL: {
      en: `You revoked authority ${m.id} for ${svc.name.en}. I have stopped all further actions under it.${
        affected.length ? ` Current status: ${affected.map((t) => `${t.id} — ${t.state}`).join("; ")}.` : ""
      }`,
      ar: `ألغيت الصلاحية ${m.id} لخدمة ${svc.name.ar}. أوقفت جميع الإجراءات اللاحقة تحتها.${
        affected.length ? ` الحالة الحالية: ${affected.map((t) => `${t.id} — ${t.state}`).join("؛ ")}.` : ""
      }`,
    },
    at: now(),
  });
}
