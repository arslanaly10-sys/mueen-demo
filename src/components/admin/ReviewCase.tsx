"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { EASE } from "../IconWeight";
import { ArrowUUpLeftIcon, CheckIcon, CircleNotchIcon, WarningOctagonIcon, XIcon } from "@phosphor-icons/react";
import { engine } from "@/lib/client";
import { fmtDate, fmtTime } from "@/lib/i18n";
import { getPersona } from "@/lib/personas";
import { SERVICE_MAP } from "@/lib/services";
import { useStore } from "@/lib/store";
import type { Transaction } from "@/lib/types";
import { useT } from "../useT";

/** One case in the human review queue: details, why it escalated, the evidence, and the officer's decision. */
export function ReviewCase({ tx }: { tx: Transaction }) {
  const { t, ar, lang } = useT();
  const mandate = useStore((s) => s.mandates.find((m) => m.id === tx.mandateId) ?? null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const svc = SERVICE_MAP[tx.serviceId];
  const persona = getPersona(tx.personaId);
  const target = persona ? svc.targets(persona).find((x) => x.id === tx.targetId) : undefined;
  const caseId = tx.review?.caseId ?? tx.id;
  const noteId = `note-${tx.id}`;

  async function decide(decision: "approve" | "return" | "reject") {
    if (decision !== "approve" && !note.trim()) { setErr(ar ? "اكتب ملاحظة للمستفيد قبل الإعادة أو الرفض." : "Write a note for the beneficiary before you return or reject."); return; }
    setErr(null);
    setBusy(decision);
    const res = await engine({ action: "review", tx, mandate, review: { decision, note, officer: "officer.demo.01" } }).catch(() => null);
    setBusy(null);
    if (!res || res.error) setErr(res?.error ? t(res.error.message) : ar ? "تعذر حفظ القرار. حاول مرة أخرى." : "The decision could not be saved. Try again.");
  }

  return (
    <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }} transition={{ duration: 0.3, ease: EASE }} className="rounded-xl border border-warn/30 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-warn/20 bg-warn-bg px-4 py-2.5">
        <WarningOctagonIcon size={16} className="text-warn" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-teal">{t(svc.name)}</h3>
        <span className="font-mono text-xs text-warn-ink"><bdi>{caseId}</bdi></span>
      </div>
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">{ar ? "مقدم الطلب" : "Requester"}</dt><dd className="text-ink">{t(persona?.name)} · <span className="num-ltr">{persona?.idNumber}</span></dd>
          <dt className="text-muted">{ar ? "صاحب السجل" : "Record"}</dt><dd className="text-ink">{target ? t(target.label) : tx.targetId}{target?.sublabel ? ` · ${t(target.sublabel)}` : ""}</dd>
          <dt className="text-muted">{ar ? "الجهة" : "Agency"}</dt><dd className="text-ink">{t(svc.agency)}</dd>
          <dt className="text-muted">{ar ? "التفويض" : "Mandate"}</dt><dd className="text-ink">{mandate ? `${mandate.actions.join(", ")} · ${ar ? "ينتهي" : "expires"} ${fmtDate(mandate.expiresAt, lang)} ${fmtTime(mandate.expiresAt, lang)}${mandate.revokedAt ? (ar ? " · ملغى" : " · revoked") : ""}` : ar ? "غير موجود" : "None"}</dd>
          <dt className="text-muted">{ar ? "سبب التصعيد" : "Escalation reason"}</dt><dd className="font-medium text-warn-ink">{t(tx.review?.reason ?? tx.history[tx.history.length - 1].note)}</dd>
        </dl>
        <div>
          <p className="text-sm font-medium text-teal">{ar ? "الأدلة" : "Evidence"}</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {tx.checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 rounded px-1.5 text-xs font-medium ${c.status === "pass" ? "bg-mint text-green" : c.status === "fail" ? "bg-err-bg text-err" : "bg-warn-bg text-warn-ink"}`}>{c.status === "pass" ? (ar ? "مستوفى" : "Pass") : c.status === "fail" ? (ar ? "غير مستوفى" : "Fail") : (ar ? "غير موثّق" : "Unverified")}</span>
                <span className="text-ink">{t(c.label)} <span className="text-muted">· {c.source === "authoritative" ? (ar ? "سجل الجهة (محاكاة)" : "agency record (simulated)") : ar ? "مقدّم من المستخدم" : "user-provided"}</span></span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm font-medium text-teal">{ar ? "آخر الأحداث" : "Recent history"}</p>
          <ol className="mt-1 space-y-0.5 text-xs text-muted">
            {tx.history.slice(-3).map((h, i) => <li key={i}><span className="num-ltr">{fmtTime(h.at, lang)}</span> · {t(h.note)}</li>)}
          </ol>
        </div>
      </div>
      <div className="border-t border-line p-4">
        <label htmlFor={noteId} className="text-sm font-medium text-teal">{ar ? "ملاحظة للمستفيد (مطلوبة للإعادة أو الرفض)" : "Note for the beneficiary (required to return or reject)"}</label>
        <textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} rows={2} aria-invalid={!!err} aria-describedby={err ? `${noteId}-err` : undefined}
          className="mt-1 w-full rounded-xl border border-line bg-warm px-3 py-2 text-base text-ink sm:text-sm" />
        {err && <p id={`${noteId}-err`} role="alert" className="mt-1 text-sm text-err">{err}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => decide("approve")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-2 disabled:opacity-50">
            {busy === "approve" ? <CircleNotchIcon size={14} className="animate-spin" aria-hidden="true" /> : <CheckIcon size={14} aria-hidden="true" />}
            {ar ? "اعتمد وأعد إلى المستفيد للموافقة" : "Approve: back to the beneficiary to approve"}
          </button>
          <button onClick={() => decide("return")} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-teal hover:bg-mint disabled:opacity-50">
            <ArrowUUpLeftIcon size={14} aria-hidden="true" /> {ar ? "أعد مع ملاحظة" : "Return with note"}
          </button>
          {!confirmReject ? (
            <button onClick={() => setConfirmReject(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full border border-err/40 px-4 py-2 text-sm font-semibold text-err hover:bg-err-bg disabled:opacity-50">
              <XIcon size={14} aria-hidden="true" /> {ar ? "ارفض…" : "Reject…"}
            </button>
          ) : (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-sm text-err">{ar ? "رفض الطلب نهائيًا؟" : "Reject this request for good?"}</span>
              <button onClick={() => decide("reject")} disabled={!!busy} className="rounded-full bg-err px-4 py-2 text-sm font-semibold text-white">{ar ? "ارفض الطلب" : "Reject request"}</button>
              <button onClick={() => setConfirmReject(false)} className="rounded-full border border-line px-4 py-2 text-sm text-teal">{ar ? "تراجع" : "Back"}</button>
            </span>
          )}
        </div>
      </div>
    </motion.li>
  );
}
