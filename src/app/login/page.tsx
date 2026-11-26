"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CircleNotchIcon, KeyIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import Grainient from "@/components/bits/Grainient";
import BlurText from "@/components/bits/BlurText";
import CodeSlots from "@/components/bits/CodeSlots";
import { AppNav } from "@/components/AppNav";
import { LangToggle } from "@/components/LangToggle";
import { Disclaimer } from "@/components/Disclaimer";
import { useT } from "@/components/useT";
import { PERSONAS } from "@/lib/personas";
import { useStore } from "@/lib/store";
import { engine } from "@/lib/client";
import type { Persona } from "@/lib/types";

const DEMO_CODE = "246810";

export default function Login() {
  const { t, ar } = useT();
  const router = useRouter();
  const setPersona = useStore((s) => s.setPersona);
  const [picked, setPicked] = useState<Persona | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<"short" | "wrong" | null>(null);
  // the server cannot know the preference, so the first client render matches it and the still text swaps in after
  const prefersReduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = mounted && prefersReduce;
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => setTimedOut(new URLSearchParams(location.search).has("timeout")), []);
  const Arrow = ar ? ArrowLeftIcon : ArrowRightIcon;
  const Back = ar ? ArrowRightIcon : ArrowLeftIcon;

  async function verify() {
    if (!picked) return;
    if (code.length !== 6 || code !== DEMO_CODE) {
      setErr(code.length !== 6 ? "short" : "wrong");
      return;
    }
    setBusy(true);
    setPersona(picked.id);
    await engine({ action: "login", personaId: picked.id, code }).catch(() => null);
    router.push("/workspace");
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <AppNav>
        <LangToggle />
      </AppNav>

      {/* refero.design login pattern: a narrow form column beside a product panel; the account chooser, then the code */}
      <div className="wrap grid flex-1 gap-10 py-10 lg:grid-cols-2 lg:items-center">
        <div className="mx-auto w-full min-w-0 max-w-md">
          {timedOut && (
            <p role="status" className="mb-6 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
              {ar ? "سجّلنا خروجك بعد 10 دقائق دون نشاط. لم يُرسل أي شيء. سجّل الدخول للمتابعة." : "We signed you out after 10 minutes without activity. Nothing was submitted. Sign in to continue."}
            </p>
          )}
          {!picked ? (
            <>
              <h1 className="text-3xl font-semibold text-teal">{ar ? "تسجيل الدخول إلى المنصة" : "Sign in to the platform"}</h1>
              <p className="mt-2 text-ink">{ar ? "اختر شخصية تجريبية. كل الشخصيات افتراضية بالكامل." : "Choose a demo persona. Every persona is fully synthetic."}</p>
              <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-white">
                {PERSONAS.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setPicked(p)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-mint/60">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal text-sm font-semibold text-mint">{p.initials}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-teal">{t(p.name)}</span>
                        <span className="block text-sm text-muted">{t(p.nationalityLabel)} · {t(p.scenarioHints[0])}</span>
                      </span>
                      <Arrow size={18} className="ms-auto shrink-0 text-muted transition group-hover:text-green" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <form className="rise" onSubmit={(e) => { e.preventDefault(); verify(); }}>
              <button type="button" onClick={() => { setPicked(null); setCode(""); setErr(null); }} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-green hover:underline">
                <Back size={14} aria-hidden="true" /> {ar ? "تغيير الشخصية" : "Change persona"}
              </button>
              <h1 className="mt-2 text-3xl font-semibold text-teal">{ar ? "أدخل رمز التحقق" : "Enter your code"}</h1>
              <p className="mt-2 text-ink">
                {ar ? "أرسلنا رمزًا لمرة واحدة إلى " : "We sent a one-time code to "}
                <span className="font-semibold text-teal">{t(picked.name)}</span> · <span className="num-ltr">{picked.idNumber}</span>
              </p>
              <p className="mt-6 text-sm font-medium text-teal">{ar ? "رمز التحقق" : "One-time code"}</p>
              {/* React Bits CodeSlots: six digit slots; digits read left to right in Arabic too */}
              <div dir="ltr" className="mt-1.5 flex justify-center [&_[data-status]>span]:shadow-[inset_0_0_0_1px_#7C8B85]">
                <CodeSlots
                  value={code}
                  onChange={(c) => { setCode(c.replace(/\D/g, "")); if (c) setErr(null); }} /* the slots empty themselves after a wrong code; keep the message until the next digit */
                  status={err === "wrong" ? "error" : "idle"}
                  ariaLabel={ar ? "رمز التحقق" : "One-time code"}
                  slotColor="#E4F1EB"
                  accentColor="#123B3A"
                  inkColor="#123B3A"
                  digitColor="#FFFFFF"
                  dangerColor="#B4463D"
                  slotSize={48}
                  gap={8}
                />
              </div>
              {err && (
                <p className="mt-2 text-sm text-err" role="alert">
                  {err === "short"
                    ? ar ? "أدخل الأرقام الستة كلها." : "Enter all 6 digits."
                    : ar ? "الرمز غير صحيح. أدخل الأرقام الستة مرة أخرى أو استخدم رمز العرض." : "That code is not correct. Enter the 6 digits again or use the demo code."}
                </p>
              )}
              <button
                type="submit"
                disabled={busy}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-2 disabled:opacity-50"
              >
                {busy && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
                {ar ? "تحقق وادخل" : "Verify & continue"}
              </button>
              <div className="my-5 flex items-center gap-3 text-sm text-muted">
                <span className="h-px flex-1 bg-line" /> {ar ? "أو" : "or"} <span className="h-px flex-1 bg-line" />
              </div>
              <button
                type="button"
                onClick={() => { setCode(DEMO_CODE); setErr(null); }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-teal transition hover:border-green"
              >
                <KeyIcon size={16} aria-hidden="true" /> {ar ? "استخدم رمز العرض" : "Use demo code"} <span className="num-ltr font-mono">{DEMO_CODE}</span>
              </button>
            </form>
          )}
          <p className="mt-6 text-sm text-muted">
            {ar
              ? "في النظام الحقيقي يتم التحقق عبر منصة الهوية الوطنية المعتمدة. هنا نحاكي ذلك، ولا يتم الاتصال بأي نظام حكومي."
              : "A real deployment would sign you in through the approved national identity platform. This is simulated; no government system is contacted."}
          </p>
          <div className="mt-4 lg:hidden"><Disclaimer /></div>
        </div>

        <aside className="relative isolate hidden h-full min-h-[560px] flex-col justify-between overflow-hidden rounded-[24px] bg-teal p-10 text-white lg:flex">
          {/* React Bits Grainient, kept dark in the brand teals so the white text stays at 7:1 */}
          <Grainient className="!absolute inset-0 -z-10" colors={["#0E2F2E", "#123B3A", "#1A5446"]} interactive={false} grainAmount={0.06} />
          <ShieldCheckIcon size={40} className="text-mint" aria-hidden="true" />
          <div>
            {reduce ? (
              <p className="text-2xl font-semibold leading-snug">{ar ? "الوكيل يجهّز التجديد، وأنت توافق مرتين: على التفاصيل ثم على الدفع." : "The agent prepares the renewal. You approve twice: the details, then the payment."}</p>
            ) : (
              <BlurText
                key={ar ? "ar" : "en"}
                className="text-2xl font-semibold leading-snug"
                text={ar ? "الوكيل يجهّز التجديد، وأنت توافق مرتين: على التفاصيل ثم على الدفع." : "The agent prepares the renewal. You approve twice: the details, then the payment."}
                delay={50}
              />
            )}
            <ul className="mt-6 space-y-3 text-mint">
              {(ar
                ? ["سبع خدمات تجديد افتراضية", "دفعة واحدة، دون إعادة محاولة", "كل خطوة في سجل تدقيق موقّع"]
                : ["Seven synthetic renewal services", "One payment, never retried", "Every step in a signed audit log"]
              ).map((x) => (
                <li key={x} className="flex items-center gap-2"><CheckCircleIcon size={18} aria-hidden="true" /> {x}</li>
              ))}
            </ul>
          </div>
          <div className="[&_p]:!text-mint"><Disclaimer compact /></div>
        </aside>
      </div>
    </main>
  );
}
