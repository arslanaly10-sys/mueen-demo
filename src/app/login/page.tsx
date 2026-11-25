"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
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
  const Arrow = ar ? ArrowLeft : ArrowRight;

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
    <main className="min-h-dvh">
      <AppNav>
        <LangToggle />
      </AppNav>

      <div className="wrap py-10">
        {!picked ? (
          <>
            <h1 className="text-2xl font-semibold text-teal">{ar ? "اختر شخصية تجريبية" : "Choose a demo persona"}</h1>
            <p className="mt-2 max-w-2xl text-muted">
              {ar
                ? "كل شخصية افتراضية بالكامل ومعدّة لإظهار سيناريوهات مختلفة من ورقة المفهوم. لا يتم الاتصال بأي نظام حكومي حقيقي."
                : "Each persona is fully synthetic and set up to show different scenarios from the concept paper. No real government system is contacted."}
            </p>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {PERSONAS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => setPicked(p)}
                    className="group flex h-full w-full flex-col rounded-2xl border border-line bg-white p-5 text-start transition hover:-translate-y-0.5 hover:border-green"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-teal font-semibold text-mint">{p.initials}</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-teal">{t(p.name)}</p>
                        <p className="text-sm text-muted">{t(p.nationalityLabel)}</p>
                      </div>
                      <Arrow size={18} className="ms-auto text-muted transition group-hover:text-green" aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-ink">{t(p.summary)}</p>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {p.scenarioHints.map((h, i) => (
                        <li key={i} className="rounded-full bg-mint px-2.5 py-1 text-xs text-teal">
                          {t(h)}
                        </li>
                      ))}
                    </ul>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mx-auto max-w-md rise">
            <button onClick={() => { setPicked(null); setCode(""); setErr(false); }} className="text-sm text-green hover:underline">
              {ar ? "← تغيير الشخصية" : "← Change persona"}
            </button>
            <div className="mt-4 rounded-[20px] border border-line bg-white p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-xl bg-mint text-green">
                  <ShieldCheck size={22} aria-hidden="true" />
                </span>
                <div>
                  <h1 className="font-semibold text-teal">{ar ? "تسجيل الدخول الموحد (محاكاة)" : "Single sign-on (simulated)"}</h1>
                  <p className="text-sm text-muted">{t(picked.name)} · <span className="num-ltr">{picked.idNumber}</span></p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-relaxed text-ink">
                {ar
                  ? "في النظام الحقيقي يتم التحقق عبر منصة الهوية الوطنية المعتمدة. هنا نحاكي إرسال رمز تحقق لمرة واحدة."
                  : "A real deployment would use the government-approved national identity platform. Here we simulate a one-time code."}
              </p>
              <label className="mt-5 block text-sm font-medium text-teal" htmlFor="otp">
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
                className="num-ltr mt-1.5 w-full rounded-xl border border-line bg-warm px-4 py-3 text-center text-2xl tracking-[0.5em] text-teal outline-none focus:border-green"
                placeholder="••••••"
              />
              {err && <p className="mt-2 text-sm text-err" role="alert">{ar ? "الرمز غير صحيح." : "That code is not correct."}</p>}
              <button
                onClick={() => setCode(DEMO_CODE)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sand/15 px-3 py-1.5 text-sm text-[#7a6230] hover:bg-sand/25"
              >
                <KeyRound size={14} aria-hidden="true" /> {ar ? "استخدم رمز العرض" : "Use demo code"} <span className="num-ltr font-mono">{DEMO_CODE}</span>
              </button>
              <button
                onClick={verify}
                disabled={code.length !== 6 || busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white transition hover:bg-teal-2 disabled:opacity-50"
              >
                {busy && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {ar ? "تحقق وادخل" : "Verify & continue"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-12">
          <Disclaimer />
        </div>
      </div>
    </main>
  );
}
