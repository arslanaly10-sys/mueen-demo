"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { engine } from "@/lib/client";
import { useStore } from "@/lib/store";
import type { SessionEvent } from "@/lib/engine/engine";
import { useT } from "./useT";

export const IDLE_MS = 10 * 60_000; // signed out after 10 minutes without activity
export const WARN_MS = 60_000; // warned for the last minute

/** Records the sign-out in the audit log, then clears the session. */
export async function endSession(personaId: string, ev: Extract<SessionEvent, "SIGNED_OUT" | "SESSION_TIMEOUT">) {
  await engine({ action: "session", personaId, sessionEvent: ev }).catch(() => null);
  useStore.getState().setPersona(null);
}

/** Idle timeout with a warning dialog. Any pointer, key or scroll activity resets it. */
export function SessionGuard({ personaId }: { personaId: string }) {
  const { ar } = useT();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const last = useRef(Date.now());
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const bump = () => {
      if (!dialog.current?.open) last.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => addEventListener(e, bump, { passive: true, capture: true }));
    const tick = setInterval(async () => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) {
        clearInterval(tick);
        await endSession(personaId, "SESSION_TIMEOUT");
        router.replace("/login?timeout=1");
      } else if (idle >= IDLE_MS - WARN_MS) {
        setLeft(Math.ceil((IDLE_MS - idle) / 1000));
        if (!dialog.current?.open) dialog.current?.showModal();
      }
    }, 1000);
    return () => {
      clearInterval(tick);
      events.forEach((e) => removeEventListener(e, bump, { capture: true }));
    };
  }, [personaId, router]);

  function stay() {
    last.current = Date.now();
    dialog.current?.close();
    setLeft(null);
  }

  return (
    <dialog
      ref={dialog}
      onCancel={(e) => { e.preventDefault(); stay(); }}
      aria-labelledby="idle-title"
      aria-describedby="idle-body"
      className="m-auto w-[min(26rem,calc(100%-2rem))] rounded-[20px] border border-line bg-white p-6 text-ink backdrop:bg-ink/40"
    >
      <h2 id="idle-title" className="text-lg font-semibold text-teal">{ar ? "هل ما زلت هنا؟" : "Are you still there?"}</h2>
      <p id="idle-body" className="mt-2 text-sm leading-relaxed">
        {ar ? "لحماية حسابك سنسجّل خروجك بعد " : "To protect your account, we will sign you out in "}
        <span className="font-semibold tabular-nums">{left ?? 60}</span>
        {ar ? " ثانية. لن يُرسل أي شيء أثناء ذلك." : " seconds. Nothing will be submitted in the meantime."}
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button onClick={stay} className="rounded-full bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-2" autoFocus>
          {ar ? "ابقَ متصلًا" : "Stay signed in"}
        </button>
        <button
          onClick={async () => { dialog.current?.close(); await endSession(personaId, "SIGNED_OUT"); router.push("/login"); }}
          className="rounded-full border border-line px-5 py-2.5 text-sm text-teal hover:bg-mint"
        >
          {ar ? "سجّل الخروج الآن" : "Sign out now"}
        </button>
      </div>
    </dialog>
  );
}
