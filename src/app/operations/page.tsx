"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleNotchIcon, FlaskIcon, GaugeIcon, PlayIcon, ShieldWarningIcon, StopIcon } from "@phosphor-icons/react";
import { AppNav } from "@/components/AppNav";
import { Disclaimer } from "@/components/Disclaimer";
import { LangToggle } from "@/components/LangToggle";
import { LineChart } from "@/components/LineChart";
import { useT } from "@/components/useT";
import { fmtNum } from "@/lib/i18n";
import { REGISTRY } from "@/lib/registry";
import { SERVICE_MAP } from "@/lib/services";
import { useHydrated, useStore } from "@/lib/store";
import { BUCKETS, bucketOf, latencySec } from "@/lib/tracker";
import { BENCHMARK_1M_60S, KINDS, RATE_TABLE, type SimParams, type SimReport } from "@/lib/sim/model";

type L = { en: string; ar: string };

const PRESETS: { id: string; label: L; params: SimParams }[] = [
  { id: "bench", label: { en: "Benchmark scenario: 1,000,000 envelopes in 60 s (stretch)", ar: "سيناريو قياسي: مليون مغلّف في 60 ثانية (هدف طموح)" }, params: BENCHMARK_1M_60S },
  { id: "hour", label: { en: "1,000,000 per hour, first 10 minutes", ar: "مليون في الساعة، أول 10 دقائق" }, params: { ...BENCHMARK_1M_60S, totalEnvelopes: 166_667, admissionWindowSec: 600 } },
  { id: "throttled", label: { en: "Agency outage: one connector at 10% quota", ar: "انقطاع جهة: موصل واحد بـ10% من حصته" }, params: { ...BENCHMARK_1M_60S, totalEnvelopes: 200_000, agencies: BENCHMARK_1M_60S.agencies.map((a, i) => (i === 0 ? { ...a, quotaPerSec: 80 } : a)), drainSec: 900 } },
  { id: "small", label: { en: "Front door under-sized (back-pressure)", ar: "بوابة استقبال أصغر من الحاجة (ضغط عكسي)" }, params: { ...BENCHMARK_1M_60S, totalEnvelopes: 100_000, frontDoorPerSec: 800, drainSec: 900 } },
];

const AGENCY_LABEL: Record<string, L> = {
  traffic: { en: "Traffic", ar: "المرور" },
  passports: { en: "Passports", ar: "الجوازات" },
  hr: { en: "Human resources", ar: "الموارد البشرية" },
  municipal: { en: "Municipalities", ar: "البلديات" },
  commerce: { en: "Commerce", ar: "التجارة" },
};

function Tile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums text-teal">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}

function NumField({ id, label, value, onChange, step = 1, min = 0, max, suffix }: { id: string; label: string; value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="text-ink">{label}</span>
      <span className="mt-1 flex items-center gap-2">
        <input id={id} type="number" inputMode="decimal" min={min} max={max} step="any" data-step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
          className="num-ltr w-full min-w-0 rounded-xl border border-line bg-white px-3 py-2 text-base tabular-nums text-ink sm:text-sm" />
        {suffix && <span className="shrink-0 text-muted">{suffix}</span>}
      </span>
    </label>
  );
}

export default function Operations() {
  const { t, ar, lang } = useT();
  const hydrated = useHydrated();
  const txs = useStore((s) => s.txs);
  const config = useStore((s) => s.config);
  const n = (v: number) => fmtNum(Math.round(v), lang);

  // ---------- live demo traffic (this browser's synthetic transactions)
  const live = useMemo(() => {
    const by = Object.fromEntries(BUCKETS.map((b) => [b.id, 0])) as Record<string, number>;
    txs.forEach((x) => by[bucketOf(x)]++);
    const lat = txs.map(latencySec).filter((v): v is number => v !== null).sort((a, b) => a - b);
    const hourAgo = Date.now() - 3_600_000;
    return {
      by,
      accepted: txs.length,
      queue: by.queued + by.in_progress + by.awaiting_approval + by.outcome_unknown + by.human_review,
      completedHour: txs.filter((x) => x.receipt && new Date(x.receipt.issuedAt).getTime() > hourAgo).length,
      medianLatency: lat.length ? lat[Math.floor(lat.length / 2)] : null,
      failures: by.blocked,
      retries: txs.reduce((s, x) => s + Math.max(0, (x.payment?.attempts ?? 0) - 1), 0) + txs.filter((x) => x.history.some((h) => h.state === "RECONCILIATION_REQUIRED")).length,
    };
  }, [txs]);

  // ---------- simulator
  const [preset, setPreset] = useState("bench");
  const [p, setP] = useState<SimParams>(BENCHMARK_1M_60S);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ report: SimReport; computeMs: number; at: string } | null>(null);
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);

  function run() {
    worker.current?.terminate();
    const w = new Worker(new URL("../../lib/sim/sim.worker.ts", import.meta.url));
    worker.current = w;
    setRunning(true);
    setProgress(0);
    w.onmessage = (e) => {
      if (e.data.type === "progress") setProgress(e.data.share);
      else { setResult({ report: e.data.report, computeMs: e.data.computeMs, at: new Date().toISOString() }); setRunning(false); w.terminate(); }
    };
    w.onerror = () => { setRunning(false); w.terminate(); };
    w.postMessage(p);
  }
  function stop() { worker.current?.terminate(); setRunning(false); }

  const r = result?.report;
  const completedTotal = r ? KINDS.reduce((s, k) => s + r.completed[k], 0) : 0;
  const KIND_L: Record<string, L> = { read: { en: "read", ar: "قراءة" }, prepare: { en: "prepare", ar: "تجهيز" }, submit: { en: "submit", ar: "إرسال" }, pay: { en: "pay", ar: "دفع" } };

  return (
    <div className="min-h-dvh">
      <AppNav menu>
        <Link href="/admin" className="hidden rounded-full px-3 py-1.5 text-sm text-teal hover:bg-mint sm:inline-flex">{ar ? "لوحة الحوكمة" : "Governance console"}</Link>
        <LangToggle />
      </AppNav>
      <main className="wrap space-y-10 py-8">
        <header>
          <h1 className="text-2xl font-semibold text-teal sm:text-3xl">{ar ? "التشغيل والسعة" : "Operations and capacity"}</h1>
          <p className="mt-2 max-w-[70ch] text-ink">
            {ar
              ? "قبول المهمة شيء وإنجاز المعاملة الحكومية شيء آخر. المنصة تستطيع قبول دفعات كبيرة وتخزينها في طوابير، لكن سرعة الإنجاز تحددها واجهات الجهات وموافقات المستفيدين وقنوات الدفع وحدود الخدمة المتفق عليها."
              : "Accepting a task is not completing a government transaction. The platform can accept large bursts into durable queues, but completion speed is set by agency APIs, beneficiaries' approvals, payment rails and the agreed service limits."}
          </p>
        </header>

        {/* ---------- live */}
        <section aria-labelledby="live-h">
          <h2 id="live-h" className="flex items-center gap-2 text-xl font-semibold text-teal"><GaugeIcon size={20} aria-hidden="true" />{ar ? "حركة العرض الحية" : "Live demo traffic"}</h2>
          <p className="mt-1 text-sm text-muted">{ar ? "من المعاملات الافتراضية في هذا المتصفح فقط." : "From the synthetic transactions in this browser only."}</p>
          {!hydrated ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-muted"><CircleNotchIcon size={16} className="animate-spin" aria-hidden="true" />{ar ? "جارٍ التحميل…" : "Loading…"}</p>
          ) : live.accepted === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-line bg-white p-6">
              <p className="font-medium text-teal">{ar ? "لا توجد مهام بعد" : "No tasks yet"}</p>
              <p className="mt-1 text-sm text-ink">{ar ? "ابدأ تجديدًا في مساحة المستفيد، وستظهر أرقامه هنا." : "Start a renewal in the beneficiary workspace and its figures appear here."}</p>
              <Link href="/login" className="mt-3 inline-flex rounded-full bg-teal px-4 py-2 text-sm font-semibold text-white">{ar ? "ابدأ تجديدًا تجريبيًا" : "Start a demo renewal"}</Link>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Tile label={ar ? "مهام مقبولة" : "Accepted tasks"} value={n(live.accepted)} />
                <Tile label={ar ? "عمق الطابور" : "Queue depth"} value={n(live.queue)} note={ar ? "لم تكتمل ولم تُلغَ" : "Not completed or cancelled"} />
                <Tile label={ar ? "مكتملة آخر ساعة" : "Completed, last hour"} value={n(live.completedHour)} />
                <Tile label={ar ? "الزمن الوسيط حتى الإيصال" : "Median time to receipt"} value={live.medianLatency === null ? "—" : `${n(live.medianLatency)} ${ar ? "ث" : "s"}`} note={ar ? "يشمل وقت موافقتك" : "Includes your approval time"} />
                <Tile label={ar ? "متوقفة" : "Blocked"} value={n(live.failures)} />
                <Tile label={ar ? "إعادات ومطابقات" : "Retries and reconciliations"} value={n(live.retries)} />
              </div>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {BUCKETS.map((b) => <li key={b.id} className="rounded-full border border-line bg-white px-3 py-1"><span className="text-muted">{t(b.label)}</span> <span className="font-medium tabular-nums text-teal">{n(live.by[b.id])}</span></li>)}
              </ul>
            </>
          )}
          <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white" tabIndex={0} role="region" aria-label={ar ? "جدول الحد لكل خدمة" : "Per-service throttling table"}>
            <table className="w-full min-w-[640px] text-sm">
              <caption className="px-4 pt-3 text-start font-medium text-teal">{ar ? "الحد لكل خدمة (موصلات محاكاة)" : "Per-service throttling (simulated connectors)"}</caption>
              <thead><tr className="text-xs text-muted"><th className="px-4 py-2 text-start font-medium">{ar ? "الخدمة" : "Service"}</th><th className="px-2 py-2 text-start font-medium">{ar ? "الموصل" : "Connector"}</th><th className="px-2 py-2 text-end font-medium">{ar ? "الحد المتفق عليه" : "Agreed limit"}</th><th className="px-2 py-2 text-end font-medium">{ar ? "الحد الفعلي الآن" : "Effective now"}</th><th className="px-4 py-2 text-start font-medium">{ar ? "الحالة" : "State"}</th></tr></thead>
              <tbody>
                {REGISTRY.map((c) => {
                  const h = config.connectorHealth[c.serviceId] ?? "up";
                  const off = config.killSwitch || config.disabledServices.includes(c.serviceId) || h === "down";
                  const eff = off ? 0 : h === "degraded" ? Math.round(c.rateLimitPerSec / 4) : c.rateLimitPerSec;
                  const state = config.killSwitch ? (ar ? "إيقاف طارئ" : "Emergency stop") : config.disabledServices.includes(c.serviceId) ? (ar ? "معطّلة" : "Disabled") : h === "down" ? (ar ? "متوقفة" : "Paused: connector down") : h === "degraded" ? (ar ? "مقيّدة إلى 25%" : "Throttled to 25%") : (ar ? "طبيعية" : "Normal");
                  return (
                    <tr key={c.serviceId} className="border-t border-line">
                      <td className="px-4 py-2.5 text-teal">{t(SERVICE_MAP[c.serviceId].name)}</td>
                      <td className="px-2 py-2.5 font-mono text-xs text-muted"><bdi>{c.connectorId}</bdi></td>
                      <td className="px-2 py-2.5 text-end tabular-nums">{n(c.rateLimitPerSec)}/{ar ? "ث" : "s"}</td>
                      <td className="px-2 py-2.5 text-end tabular-nums">{n(eff)}/{ar ? "ث" : "s"}</td>
                      <td className={`px-4 py-2.5 ${off ? "text-err" : h === "degraded" ? "text-warn" : "text-green"}`}>{state}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ---------- arithmetic */}
        <section aria-labelledby="math-h">
          <h2 id="math-h" className="text-xl font-semibold text-teal">{ar ? "ماذا تعني «مليون مهمة»" : "What one million tasks means"}</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white" tabIndex={0} role="region" aria-label={ar ? "جدول الحساب" : "Arithmetic table"}>
            <table className="w-full min-w-[480px] text-sm">
              <thead><tr className="text-xs text-muted"><th className="px-4 py-2 text-start font-medium">{ar ? "الحجم" : "Volume"}</th><th className="px-2 py-2 text-end font-medium">{ar ? "الحساب" : "Arithmetic"}</th><th className="px-4 py-2 text-end font-medium">{ar ? "مهام في الثانية" : "Tasks per second"}</th></tr></thead>
              <tbody>
                {RATE_TABLE.map((row) => (
                  <tr key={row.seconds} className="border-t border-line">
                    <td className="px-4 py-2.5 text-teal">{t(row.label)}</td>
                    <td className="num-ltr px-2 py-2.5 text-end font-mono text-xs text-muted">1,000,000 ÷ {row.seconds.toLocaleString("en-US")} s</td>
                    <td className="px-4 py-2.5 text-end font-semibold tabular-nums text-teal">{row.seconds === 10 ? "=" : "≈"} {n(1_000_000 / row.seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 max-w-[70ch] text-sm text-muted">
            {ar
              ? "هذه معدلات وصول، لا معدلات إنجاز. مهمة تستدعي أربع عمليات لدى الجهات تعني أربعة أضعاف الاستدعاءات قبل الاستعلام عن الحالة والإعادات والدفع."
              : "These are arrival rates, not completion rates. A task that calls four agency operations means four times the calls, before status polling, retries and payments."}
          </p>
        </section>

        {/* ---------- simulator */}
        <section aria-labelledby="sim-h" className="space-y-4">
          <div>
            <h2 id="sim-h" className="flex items-center gap-2 text-xl font-semibold text-teal"><FlaskIcon size={20} aria-hidden="true" />{ar ? "محاكي السعة" : "Scale simulator"}</h2>
            <p className="mt-1 max-w-[70ch] text-sm text-ink">
              {ar
                ? "يولّد مغلّفات مهام افتراضية على دفعات داخل متصفحك، ويحاكي بوابة الاستقبال والعمال وحدود كل جهة والإعادات والنتائج المجهولة، بزمن محاكاة لا بزمن حقيقي. لا يرسل أي استدعاء لنموذج أو جهة أو للشبكة."
                : "Generates synthetic task envelopes in batches inside your browser and models the front door, workers, per-agency limits, retries and unknown outcomes, on simulated time rather than real time. It sends no model call, agency call or network request."}
            </p>
          </div>

          <form className="rounded-2xl border border-line bg-white p-5" onSubmit={(e) => { e.preventDefault(); if (!running) run(); }}>
            <label htmlFor="preset" className="block text-sm font-medium text-teal">{ar ? "السيناريو" : "Scenario"}</label>
            <select id="preset" value={preset} onChange={(e) => { setPreset(e.target.value); setP(PRESETS.find((x) => x.id === e.target.value)!.params); }}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base text-ink sm:text-sm">
              {PRESETS.map((x) => <option key={x.id} value={x.id}>{t(x.label)}</option>)}
            </select>
            <fieldset className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <legend className="sr-only">{ar ? "المعاملات" : "Parameters"}</legend>
              <NumField id="total" label={ar ? "عدد المغلّفات" : "Envelopes"} value={p.totalEnvelopes} max={2_000_000} step={10_000} onChange={(v) => setP({ ...p, totalEnvelopes: Math.min(2_000_000, Math.max(1, v)) })} />
              <NumField id="win" label={ar ? "نافذة الإرسال" : "Arrival window"} suffix={ar ? "ث" : "s"} value={p.admissionWindowSec} min={1} onChange={(v) => setP({ ...p, admissionWindowSec: Math.max(1, v) })} />
              <NumField id="fd" label={ar ? "سعة بوابة الاستقبال" : "Front-door capacity"} suffix={ar ? "/ث" : "/s"} value={p.frontDoorPerSec} min={1} step={100} onChange={(v) => setP({ ...p, frontDoorPerSec: Math.max(1, v) })} />
              <NumField id="wk" label={ar ? "العمال" : "Workers"} value={p.workers} min={1} step={50} onChange={(v) => setP({ ...p, workers: Math.max(1, v) })} />
              <NumField id="dup" label={ar ? "إعادة إرسال من العميل" : "Client resends"} suffix="%" value={+(p.clientDuplicateRate * 100).toFixed(2)} max={50} step={0.5} onChange={(v) => setP({ ...p, clientDuplicateRate: v / 100 })} />
              <NumField id="to" label={ar ? "مهلات لدى الجهات" : "Agency timeouts"} suffix="%" value={+(p.timeoutRate * 100).toFixed(2)} max={50} step={0.5} onChange={(v) => setP({ ...p, timeoutRate: v / 100 })} />
              <NumField id="fl" label={ar ? "إخفاقات لدى الجهات" : "Agency failures"} suffix="%" value={+(p.failureRate * 100).toFixed(2)} max={50} step={0.5} onChange={(v) => setP({ ...p, failureRate: v / 100 })} />
              <NumField id="ap" label={ar ? "الموافقات خلال التشغيل" : "Approvals during run"} suffix="%" value={Math.round(p.approvalShare * 100)} max={100} step={5} onChange={(v) => setP({ ...p, approvalShare: Math.min(1, Math.max(0, v / 100)) })} />
            </fieldset>
            <fieldset className="mt-4">
              <legend className="text-sm font-medium text-teal">{ar ? "حدود الجهات المتفق عليها" : "Agreed agency limits"}</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {p.agencies.map((a, i) => (
                  <NumField key={a.id} id={`q-${a.id}`} label={t(AGENCY_LABEL[a.id])} suffix={ar ? "/ث" : "/s"} value={a.quotaPerSec} min={1} step={50}
                    onChange={(v) => setP({ ...p, agencies: p.agencies.map((x, j) => (j === i ? { ...x, quotaPerSec: Math.max(1, v) } : x)) })} />
                ))}
                <NumField id="q-pay" label={ar ? "بوابة الدفع" : "Payment rail"} suffix={ar ? "/ث" : "/s"} value={p.paymentQuotaPerSec} min={1} step={50} onChange={(v) => setP({ ...p, paymentQuotaPerSec: Math.max(1, v) })} />
              </div>
            </fieldset>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {!running ? (
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-teal px-5 py-2.5 font-semibold text-white hover:bg-teal-2"><PlayIcon size={16} aria-hidden="true" />{ar ? "شغّل المحاكاة" : "Run simulation"}</button>
              ) : (
                <button type="button" onClick={stop} className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-teal hover:bg-mint"><StopIcon size={16} aria-hidden="true" />{ar ? "أوقف" : "Stop"}</button>
              )}
              <p role="status" className="text-sm text-muted">
                {running ? `${ar ? "جارٍ الحساب" : "Computing"} ${n(progress * 100)}%` : result ? (ar ? "اكتملت المحاكاة." : "Simulation finished.") : ""}
              </p>
            </div>
          </form>

          {r && result && (
            <div className="space-y-4">
              <p className="flex items-start gap-2 rounded-xl bg-warn-bg p-3 text-sm text-warn-ink">
                <ShieldWarningIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  {ar
                    ? `نتيجة مولّدة بنموذج المحاكاة المحلي في العرض، وليست قياسًا ولا ضمانًا للإنتاج. حُسبت في ${n(result.computeMs)} ملّي ثانية على هذا الجهاز، لـ${n(r.simulatedSeconds)} ثانية محاكاة.`
                    : `Generated by the local demo simulation model. Not a measurement and not a production guarantee. Computed in ${n(result.computeMs)} ms on this device for ${n(r.simulatedSeconds)} simulated seconds.`}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                <Tile label={ar ? "مقبولة في بوابة الاستقبال" : "Accepted at the front door"} value={n(r.admitted)} note={ar ? `آخرها عند ${n(r.admissionSeconds)} ث` : `Last at ${r.admissionSeconds} s`} />
                <Tile label={ar ? "مكتملة" : "Completed"} value={n(completedTotal)} note={KINDS.map((k) => `${t(KIND_L[k])} ${n(r.completed[k])}`).join(" · ")} />
                <Tile label={ar ? "بانتظار موافقة المستفيد" : "Awaiting the beneficiary's approval"} value={n(r.awaitingApproval)} note={ar ? "إرسال ودفع لا يتمان دون موافقة" : "Submissions and payments never run unapproved"} />
                <Tile label={ar ? "مراجعة بشرية" : "Human review"} value={n(r.humanReview)} note={ar ? "بعد استنفاد المحاولات" : "After the last retry"} />
                <Tile label={ar ? "تكرارات مرفوضة" : "Duplicates rejected"} value={n(r.duplicatesRejected)} note={ar ? `من ${n(r.duplicatesSent)} إعادة إرسال، بمفتاح منع التكرار` : `Of ${n(r.duplicatesSent)} client resends, by idempotency key`} />
                <Tile label={ar ? "مهلات تمت مطابقتها" : "Timeouts reconciled"} value={n(r.reconciledFoundDone + r.resubmittedAfterReconcile)} note={ar ? `${n(r.reconciledFoundDone)} وُجدت منجزة دون إعادة إرسال` : `${n(r.reconciledFoundDone)} found done, not resent`} />
                <Tile label={ar ? "إعادات وإخفاقات" : "Retries and failures"} value={`${n(r.retries)} / ${n(r.failures)}`} />
                <Tile label={ar ? "أقصى عمق للطابور" : "Peak queue depth"} value={n(r.peakQueueDepth)} note={ar ? `أقصى تأخر عند الاستقبال ${n(r.peakLagSec)} ث` : `Peak front-door lag ${r.peakLagSec.toFixed(1)} s`} />
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="min-w-0 rounded-2xl border border-line bg-white p-4">
                  <h3 className="font-semibold text-teal">{ar ? "القبول مقابل الإنجاز في الثانية" : "Accepted vs completed per second"}</h3>
                  <LineChart
                    label={ar ? "مخطط المقبول والمكتمل في كل ثانية محاكاة" : "Chart of tasks accepted and completed in each simulated second"}
                    x={r.series.t} xLabel={ar ? "ث" : "s"} format={(v) => n(v)}
                    series={[{ name: ar ? "مقبولة" : "Accepted", values: r.series.admitted, slot: 1 }, { name: ar ? "مكتملة" : "Completed", values: r.series.completed, slot: 2 }]}
                  />
                </div>
                <div className="min-w-0 rounded-2xl border border-line bg-white p-4">
                  <h3 className="font-semibold text-teal">{ar ? "عمق الطابور" : "Queue depth"}</h3>
                  <LineChart label={ar ? "مخطط عمق الطابور عبر الزمن" : "Chart of queue depth over time"} x={r.series.t} xLabel={ar ? "ث" : "s"} format={(v) => n(v)}
                    series={[{ name: ar ? "في الطابور" : "Queued", values: r.series.queueDepth, slot: 1, area: true }]} />
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-line bg-white" tabIndex={0} role="region" aria-label={ar ? "جدول الجهات" : "Per-agency table"}>
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="px-4 pt-3 text-start font-medium text-teal">{ar ? "لكل جهة (محاكاة)" : "Per agency (simulated)"}</caption>
                  <thead><tr className="text-xs text-muted">{[ar ? "الجهة" : "Agency", ar ? "الحد" : "Limit", ar ? "الاستدعاءات" : "Calls", ar ? "مكتملة" : "Completed", ar ? "أقصى تراكم بسبب الحد" : "Peak throttled backlog", ar ? "إخفاقات" : "Failures", ar ? "مهلات" : "Timeouts", ar ? "متبقٍ" : "Left at end"].map((h, i) => <th key={h} className={`px-3 py-2 font-medium ${i ? "text-end" : "text-start"}`}>{h}</th>)}</tr></thead>
                  <tbody>
                    {r.agencies.map((a, i) => (
                      <tr key={a.id} className="border-t border-line tabular-nums">
                        <td className="px-3 py-2.5 text-teal">{t(AGENCY_LABEL[a.id])}</td>
                        <td className="px-3 py-2.5 text-end">{n(r.params.agencies[i].quotaPerSec)}/{ar ? "ث" : "s"}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.calls)}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.completed)}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.throttledPeak)}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.failures)}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.timeouts)}</td>
                        <td className="px-3 py-2.5 text-end">{n(a.backlogAtEnd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <details className="rounded-2xl border border-line bg-white p-4">
                <summary className="cursor-pointer font-medium text-teal">{ar ? "عينة من المغلّفات الافتراضية" : "Sample synthetic envelopes"}</summary>
                <pre className="num-ltr mt-3 overflow-x-auto text-xs text-ink" dir="ltr" tabIndex={0} aria-label={ar ? "عينة المغلّفات" : "Sample envelopes"}>{JSON.stringify(r.sampleEnvelopes, null, 2)}</pre>
              </details>
            </div>
          )}
        </section>
        <Disclaimer />
      </main>
    </div>
  );
}
