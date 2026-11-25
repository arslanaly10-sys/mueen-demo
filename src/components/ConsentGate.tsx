"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CircleNotchIcon, ShieldCheckIcon } from "@phosphor-icons/react";
import { engine } from "@/lib/client";
import { useStore } from "@/lib/store";
import { endSession } from "./SessionGuard";
import { useT } from "./useT";

const POINTS = {
  en: [
    ["What the agent reads", "Your verified identity and the records each agency holds for the services you ask about: licences, residency, vehicles, permits."],
    ["Why", "Only to check eligibility, prepare the renewal you asked for and show you its status. Nothing is used for profiling or advertising."],
    ["Who receives it", "Only the agency that owns the service, and the government payment gateway when you approve a payment."],
    ["Your control", "Nothing is submitted or paid without your approval. You can revoke an authority, export or delete your data, or withdraw this consent at any time."],
  ],
  ar: [
    ["ما الذي يطّلع عليه الوكيل", "هويتك الموثّقة والسجلات التي تحتفظ بها كل جهة للخدمات التي تطلبها: الرخص والإقامة والمركبات والتصاريح."],
    ["لماذا", "فقط للتحقق من الأهلية وتجهيز التجديد الذي طلبته وإطلاعك على حالته. لا يُستخدم شيء للتنميط أو الإعلان."],
    ["من يتسلّمها", "الجهة المالكة للخدمة فقط، وبوابة الدفع الحكومية عند موافقتك على الدفع."],
    ["تحكّمك", "لا يُرسل شيء ولا يُدفع دون موافقتك. يمكنك إلغاء أي صلاحية أو تصدير بياناتك أو حذفها أو سحب هذه الموافقة متى شئت."],
  ],
};

/** PDPL-style consent before the agent may act for this person. */
export function ConsentGate({ personaId }: { personaId: string }) {
  const { ar, lang } = useT();
  const router = useRouter();
  const setConsent = useStore((s) => s.setConsent);
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    await engine({ action: "session", personaId, sessionEvent: "CONSENT_GIVEN" }).catch(() => null);
    setConsent(personaId, new Date().toISOString());
  }

  return (
    <main className="wrap flex-1 overflow-y-auto py-8">
      <section aria-labelledby="consent-title" className="mx-auto max-w-2xl rounded-[20px] border border-line bg-white p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-mint text-green"><ShieldCheckIcon size={22} aria-hidden="true" /></span>
        <h1 id="consent-title" className="mt-4 text-2xl font-semibold text-teal">{ar ? "قبل أن يعمل الوكيل نيابةً عنك" : "Before the agent acts for you"}</h1>
        <p className="mt-2 text-ink">{ar ? "اقرأ كيف نستخدم بياناتك. نحتاج موافقتك مرة واحدة على هذا الجهاز." : "Read how your data is used. We ask once on this device."}</p>
        <dl className="mt-6 space-y-4">
          {POINTS[lang].map(([dt, dd]) => (
            <div key={dt}>
              <dt className="font-semibold text-teal">{dt}</dt>
              <dd className="mt-0.5 text-sm leading-relaxed text-ink">{dd}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm text-muted">
          {ar ? "التفاصيل الكاملة في " : "Full details are in the "}
          <Link href="/privacy" className="text-green underline underline-offset-2">{ar ? "إشعار الخصوصية" : "privacy notice"}</Link>
          {ar ? " (الإصدار 2026-11)." : " (version 2026-11)."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={agree} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-3 font-semibold text-white hover:bg-teal-2 disabled:opacity-50">
            {busy && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
            {ar ? "أوافق وأتابع" : "I agree, continue"}
          </button>
          <button
            onClick={async () => { await endSession(personaId, "SIGNED_OUT"); router.push("/login"); }}
            className="rounded-full border border-line px-5 py-3 text-teal hover:bg-mint"
          >
            {ar ? "لا أوافق، سجّل الخروج" : "I don't agree, sign out"}
          </button>
        </div>
      </section>
    </main>
  );
}
