"use client";
import { useRef, useState } from "react";
import { ShieldCheckIcon } from "@phosphor-icons/react";
import { engine } from "@/lib/client";
import { useStore } from "@/lib/store";
import { useT } from "../useT";

const DEMO_CODE = "246810";

/** A step-up token still valid for at least 30 seconds (its expiry is the middle part of the token). */
const hasStepUp = () => {
  const tok = useStore.getState().stepUp;
  return !!tok && Number(tok.split(".")[1]) - Date.now() > 30_000;
};

/** Simulated re-verification before a Tier 3 or Tier 4 approval. `ensure()` resolves once the person has confirmed. */
export function useStepUp(personaId: string) {
  const { ar } = useT();
  const dlg = useRef<HTMLDialogElement>(null);
  const done = useRef<((ok: boolean) => void) | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ensure = () =>
    hasStepUp()
      ? Promise.resolve(true)
      : new Promise<boolean>((resolve) => {
          done.current = resolve;
          setCode("");
          setErr(null);
          dlg.current?.showModal();
        });

  const close = (ok: boolean) => {
    dlg.current?.close();
    done.current?.(ok);
    done.current = null;
  };

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await engine({ action: "stepup", personaId, code }).catch(() => null);
    setBusy(false);
    if (!r || r.error) setErr(ar ? "الرمز غير صحيح. أدخل الأرقام الستة مرة أخرى أو استخدم رمز العرض." : "That code is not correct. Enter the 6 digits again or use the demo code.");
    else close(true);
  }

  const dialog = (
    <dialog ref={dlg} onCancel={(e) => { e.preventDefault(); close(false); }} aria-labelledby={`su-${personaId}`}
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-[20px] border border-line bg-white p-6 text-ink backdrop:bg-ink/40">
      <form onSubmit={verify}>
        <h2 id={`su-${personaId}`} className="flex items-center gap-2 text-lg font-semibold text-teal"><ShieldCheckIcon size={20} className="text-green" aria-hidden="true" />{ar ? "أكّد أنك أنت" : "Confirm it's you"}</h2>
        <p className="mt-2 text-sm">{ar ? "الإرسال والدفع من المستويين 3 و4، فيحتاجان تحققًا جديدًا (محاكاة). يبقى صالحًا 5 دقائق." : "Submitting and paying are Tier 3 and Tier 4 actions, so they need a fresh check (simulated). It stays valid for 5 minutes."}</p>
        <label htmlFor={`su-code-${personaId}`} className="mt-4 block text-sm font-medium text-teal">{ar ? "رمز التحقق" : "One-time code"}</label>
        <input id={`su-code-${personaId}`} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(null); }}
          aria-invalid={!!err} aria-describedby={err ? `su-err-${personaId}` : undefined}
          className="num-ltr mt-1 w-full rounded-xl border border-line bg-warm px-4 py-2.5 text-center text-xl tracking-[0.4em] text-teal" />
        {err && <p id={`su-err-${personaId}`} role="alert" className="mt-2 text-sm text-err">{err}</p>}
        <button type="button" onClick={() => setCode(DEMO_CODE)} className="mt-2 text-sm text-green underline underline-offset-2">{ar ? "استخدم رمز العرض" : "Use demo code"} <span className="num-ltr font-mono">{DEMO_CODE}</span></button>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-2 disabled:opacity-50">{ar ? "تحقق وتابع" : "Verify and continue"}</button>
          <button type="button" onClick={() => close(false)} className="rounded-full border border-line px-5 py-2.5 text-sm text-teal hover:bg-mint">{ar ? "تراجع" : "Back"}</button>
        </div>
      </form>
    </dialog>
  );
  return { ensure, dialog };
}
