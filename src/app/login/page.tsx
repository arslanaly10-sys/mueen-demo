"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, CircleNotchIcon, KeyIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import Grainient from "@/components/bits/Grainient";
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
  const [err, setErr] = useState(false);
  const Arrow = ar ? ArrowLeftIcon : ArrowRightIcon;
  const Back = ar ? ArrowRightIcon : ArrowLeftIcon;

  async function verify() {
    if (!picked) return;
    if (code !== DEMO_CODE) {
      setErr(true);
      return;
    }
    setBusy(true);
    setPersona(picked.id);
    await engine({ action: "login", personaId: picked.id }).catch(() => null);
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
          {!picked ? (
            <>
              <h1 className="text-3xl font-semibold text-teal">{ar ? "تسجيل الدخول إلى مُعين" : "Sign in to MUEEN"}</h1>
              <p className="mt-2 text-ink">{ar ? "اختر شخصية تجريبية. كل الشخصيات افتراضية بالكامل." : "Choose a demo persona. Every persona is fully synthetic."}</p>
              <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-white">
                {PERSONAS.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setPicked(p)} className="group flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-mint/60">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-teal text-sm font-semibold text-mint">{p.initials}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-teal">{t(p.name)}</span>
                        <span className="block truncate text-sm text-muted">{t(p.nationalityLabel)} · {t(p.scenarioHints[0])}</span>
                      </span>
                      <Arrow size={18} className="ms-auto shrink-0 text-muted transition group-hover:text-green" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="rise">
              <button onClick={() => { setPicked(null); setCode(""); setErr(false); }} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-green hover:underline">
                <Back size={14} aria-hidden="true" /> {ar ? "تغيير الشخصية" : "Change persona"}
              </button>
              <h1 className="mt-2 text-3xl font-semibold text-teal">{ar ? "أدخل رمز التحقق" : "Enter your code"}</h1>
              <p className="mt-2 text-ink">
                {ar ? "أرسلنا رمزًا لمرة واحدة إلى " : "We sent a one-time code to "}
                <span className="font-semibold text-teal">{t(picked.name)}</span> · <span className="num-ltr">{picked.idNumber}</span>
              </p>
              <label className="mt-6 block text-sm font-medium text-teal" htmlFor="otp">
                {ar ? "رمز التحقق" : "One-time code"}
              </label>
              <input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, "")); setErr(false); }}
                onKeyDown={(e) => e.key === "Enter" && verify()}
                aria-invalid={err}
                className="num-ltr mt-1.5 w-full rounded-xl border border-line bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-teal outline-none focus:border-green"
                placeholder="••••••"
              />
              {err && <p className="mt-2 text-sm text-err" role="alert">{ar ? "الرمز غير صحيح." : "That code is not correct."}</p>}
              <button
                onClick={verify}
                disabled={code.length !== 6 || busy}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-2 disabled:opacity-50"
              >
                {busy && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
                {ar ? "تحقق وادخل" : "Verify & continue"}
              </button>
              <div className="my-5 flex items-center gap-3 text-sm text-muted">
                <span className="h-px flex-1 bg-line" /> {ar ? "أو" : "or"} <span className="h-px flex-1 bg-line" />
              </div>
              <button
                onClick={() => setCode(DEMO_CODE)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white px-5 py-3 text-teal transition hover:border-green"
              >
                <KeyIcon size={16} aria-hidden="true" /> {ar ? "استخدم رمز العرض" : "Use demo code"} <span className="num-ltr font-mono">{DEMO_CODE}</span>
              </button>
            </div>
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
            <p className="text-2xl font-semibold leading-snug">
              {ar ? "مُعين يجهّز التجديد، وأنت توافق مرتين: على التفاصيل ثم على الدفع." : "MUEEN prepares the renewal. You approve twice: the details, then the payment."}
            </p>
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
