"use client";
import { tabKeys } from "@/components/tabKeys";
import StatusMark from "@/components/bits/StatusMark";
import { useState } from "react";
import { BellIcon, CircleNotchIcon, FolderOpenIcon, ListChecksIcon, ScrollIcon, ShieldCheckIcon, ShieldSlashIcon } from "@phosphor-icons/react";
import { useStore } from "@/lib/store";
import { useShallow } from "zustand/react/shallow";
import { getPersona } from "@/lib/personas";
import { SERVICES, SERVICE_MAP, daysUntil } from "@/lib/services";
import { HAPPY_PATH, STATE_LABEL } from "@/lib/engine/states";
import { ACTION_LABEL } from "@/lib/engine/policy";
import { T, fmtDate, fmtDaysLeft, fmtHijri, fmtTime } from "@/lib/i18n";
import type { TxState } from "@/lib/types";
import { ServiceIcon } from "../ServiceIcon";
import { StatusPill } from "../StatusPill";
import { useT } from "../useT";
import * as agent from "./agent";

type Tab = "timeline" | "records" | "authorities" | "activity";

export function SidePanel({ personaId }: { personaId: string }) {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("timeline");
  const tabs: { id: Tab; label: string; Icon: typeof ListChecksIcon }[] = [
    { id: "timeline", label: t(T.timeline), Icon: ListChecksIcon },
    { id: "records", label: t(T.records), Icon: FolderOpenIcon },
    { id: "authorities", label: t(T.authorities), Icon: ShieldCheckIcon },
    { id: "activity", label: t(T.activity), Icon: ScrollIcon },
  ];
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" className="grid grid-cols-4 border-b border-line p-1" onKeyDown={(e) => tabKeys(e, tabs.map((x) => x.id), tab, setTab)}>
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="side-panel"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-medium transition ${
              tab === id ? "bg-mint text-green" : "text-muted hover:bg-warm"
            }`}
          >
            <Icon size={16} aria-hidden="true" />
            <span className="text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
      <div id="side-panel" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
        {tab === "timeline" && <Timeline personaId={personaId} />}
        {tab === "records" && <Records personaId={personaId} />}
        {tab === "authorities" && <Authorities personaId={personaId} />}
        {tab === "activity" && <Activity personaId={personaId} />}
      </div>
    </section>
  );
}

const BRANCH: TxState[] = ["BLOCKED", "HUMAN_REVIEW", "RECONCILIATION_REQUIRED", "CANCELLED"];

function Timeline({ personaId }: { personaId: string }) {
  const { t, lang } = useT();
  const txs = useStore(useShallow((s) => s.txs.filter((x) => x.personaId === personaId)));
  const selectedId = useStore((s) => s.selectedTxId);
  const selectTx = useStore((s) => s.selectTx);
  const tx = txs.find((x) => x.id === selectedId) ?? txs[txs.length - 1];
  if (!tx) return <p className="text-sm text-muted">{t(T.noActiveRequest)}</p>;
  const svc = SERVICE_MAP[tx.serviceId];
  const reached = new Set(tx.history.map((h) => h.state));
  const branchEntries = tx.history.filter((h) => BRANCH.includes(h.state));

  return (
    <div>
      {txs.length > 1 && (
        <select
          value={tx.id}
          onChange={(e) => selectTx(e.target.value)}
          className="mb-4 w-full rounded-lg border border-line bg-warm px-3 py-2 text-sm text-teal"
          aria-label={lang === "ar" ? "اختر الطلب" : "Choose request"}
        >
          {txs.map((x) => (
            <option key={x.id} value={x.id}>
              {x.id} · {t(SERVICE_MAP[x.serviceId].name)}
            </option>
          ))}
        </select>
      )}
      <div className="flex items-center gap-2">
        <ServiceIcon id={svc.id} className="text-green" />
        <p className="font-semibold text-teal">{t(svc.name)}</p>
      </div>
      <p className="mt-0.5 font-mono text-xs text-muted"><span className="num-ltr">{tx.id}</span> · {lang === "ar" ? "السياسة" : "policy"} <span className="num-ltr">{useStore.getState().config.policyVersion}</span></p>
      <ol className="relative mt-4 space-y-0">
        {HAPPY_PATH.map((st, i) => {
          const entry = tx.history.find((h) => h.state === st);
          const isCurrent = tx.state === st;
          const done = reached.has(st);
          return (
            <li key={st} className="relative flex gap-3 pb-4 last:pb-0">
              {i < HAPPY_PATH.length - 1 && <span className={`absolute top-6 h-[calc(100%-1rem)] w-px ${done ? "bg-green/50" : "bg-line"} start-[9px]`} aria-hidden="true" />}
              {/* React Bits StatusMark; hidden from screen readers, the step's own text says the same in both languages */}
              <span className="relative z-10 mt-0.5 rounded-full bg-white" aria-hidden="true">
                <StatusMark
                  status={isCurrent && st !== "RECEIPT_ISSUED" ? "running" : done ? "done" : "pending"}
                  size={19}
                  color="#187A62"
                  doneColor="#187A62"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${done ? "text-teal" : "text-muted"}`}>
                  {t(STATE_LABEL[st])}
                  <span className="ms-2 font-mono text-xs font-normal text-muted">{st}</span>
                </p>
                {entry && (
                  <p className="text-xs text-muted">
                    <span className="num-ltr">{fmtTime(entry.at, lang)}</span> · {t(entry.note)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {branchEntries.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {branchEntries.map((h, i) => (
            <div key={i} className="rounded-lg border border-warn/30 bg-warn-bg p-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={h.state === "CANCELLED" ? "neutral" : "warn"}>{t(STATE_LABEL[h.state])}</StatusPill>
                <span className="font-mono text-xs text-muted">{h.state}</span>
              </div>
              <p className="mt-1.5 text-xs text-[#6b430c]">
                <span className="num-ltr">{fmtTime(h.at, lang)}</span> · {t(h.note)}
              </p>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-xs leading-relaxed text-muted">
        {lang === "ar"
          ? "لا تظهر رسالة نجاح إلا بعد تأكيد رسمي من الجهة. الاستجابات المجهولة تنتقل إلى المطابقة ولا تُعاد تلقائيًا."
          : "No success is shown without an authoritative agency confirmation. Unknown responses go to reconciliation and are never retried blindly."}
      </p>
    </div>
  );
}

function Records({ personaId }: { personaId: string }) {
  const { t, lang } = useT();
  const persona = getPersona(personaId)!;
  const reminders = useStore(useShallow((s) => s.reminders.filter((r) => r.personaId === personaId)));
  const rows = SERVICES.flatMap((s) => (s.authority(persona).ok ? s.targets(persona).map((tg) => ({ s, tg, d: daysUntil(tg.expiry) })) : [])).sort((a, b) => a.d - b.d);
  return (
    <div>
      <p className="text-xs text-muted">{lang === "ar" ? "سجلات افتراضية يمكن للوكيل قراءتها بعد منحك الصلاحية." : "Synthetic records the agent may read only after you grant authority."}</p>
      <ul className="mt-3 space-y-2">
        {rows.map(({ s, tg, d }) => {
          const reminded = reminders.some((r) => r.serviceId === s.id && r.targetId === tg.id);
          return (
            <li key={s.id + tg.id} className="rounded-xl border border-line p-3">
              <div className="flex items-start gap-2.5">
                <ServiceIcon id={s.id} className="mt-0.5 text-green" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-teal">{t(tg.label)}</p>
                  <p className="text-xs text-muted">{t(s.name)}</p>
                  <p className="mt-1 text-xs">
                    <span className={d < 0 ? "text-err" : d <= 30 ? "text-warn" : "text-muted"}>{fmtDaysLeft(d, lang)}</span>
                    <span className="text-muted"> · {fmtDate(tg.expiry, lang)} · {fmtHijri(tg.expiry, lang)}</span>
                  </p>
                  {reminded && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-green">
                      <BellIcon size={12} aria-hidden="true" /> {t(T.reminderSet)}
                    </p>
                  )}
                </div>
                <button onClick={() => agent.proposePlan(personaId, s.id, tg.id)} className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-teal hover:border-green hover:bg-mint">
                  {t(T.renew)}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Authorities({ personaId }: { personaId: string }) {
  const { t, lang } = useT();
  const mandates = useStore(useShallow((s) => s.mandates.filter((m) => m.personaId === personaId)));
  const [busy, setBusy] = useState<string | null>(null);
  if (!mandates.length) return <p className="text-sm text-muted">{t(T.noAuthorities)}</p>;
  return (
    <ul className="space-y-2">
      {[...mandates].reverse().map((m) => {
        const svc = SERVICE_MAP[m.serviceId];
        const target = svc.targets(getPersona(personaId)!).find((x) => x.id === m.targetId);
        const expired = new Date(m.expiresAt).getTime() < Date.now();
        const state = m.revokedAt ? "revoked" : expired ? "expired" : "active";
        return (
          <li key={m.id} className="rounded-xl border border-line p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted">{m.id}</span>
              <StatusPill tone={state === "active" ? "ok" : state === "revoked" ? "error" : "neutral"}>
                {state === "active" ? t(T.active) : state === "revoked" ? t(T.revoked) : t(T.expired)}
              </StatusPill>
            </div>
            <p className="mt-1.5 text-sm font-medium text-teal">
              {t(svc.name)} · {t(target?.label)}
            </p>
            <ul className="mt-1 text-xs text-muted">
              {m.actions.map((a) => (
                <li key={a}>• {t(ACTION_LABEL[a])}</li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-muted">
              {t(T.until)} {fmtDate(m.expiresAt, lang)}
            </p>
            {state === "active" && (
              <button
                onClick={async () => {
                  setBusy(m.id);
                  await agent.revokeMandate(personaId, m.id);
                  setBusy(null);
                }}
                disabled={busy === m.id}
                className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-err/30 px-3 py-1 text-xs font-semibold text-err hover:bg-err-bg"
              >
                {busy === m.id ? <CircleNotchIcon size={13} className="animate-spin" aria-hidden="true" /> : <ShieldSlashIcon size={13} aria-hidden="true" />} {t(T.revoke)}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const ACTOR_TONE: Record<string, string> = {
  user: "bg-sky/40 text-teal",
  agent: "bg-mint text-green",
  policy: "bg-sand/20 text-[#6b5526]",
  connector: "bg-warm text-teal",
  agency: "bg-green text-white",
  admin: "bg-err-bg text-err",
  system: "bg-warm text-muted",
};

function Activity({ personaId }: { personaId: string }) {
  const { t, lang } = useT();
  const events = useStore(useShallow((s) => s.audit.filter((e) => e.personaId === personaId)));
  if (!events.length) return <p className="text-sm text-muted">—</p>;
  return (
    <ol className="space-y-2">
      {[...events].reverse().map((e) => (
        <li key={e.seq} className="rounded-lg border border-line p-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded px-1.5 py-0.5 font-medium capitalize ${ACTOR_TONE[e.actor]}`}>{e.actor}</span>
            <span className="font-mono text-muted">#{e.seq}</span>
            <span className="font-mono text-muted">{e.type}</span>
            <span className="num-ltr ms-auto text-muted">{fmtTime(e.at, lang)}</span>
          </div>
          <p className="mt-1 text-xs text-ink">{t(e.summary)}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-muted" title={e.hash}>
            {e.hash.slice(0, 24)}…
          </p>
        </li>
      ))}
    </ol>
  );
}
