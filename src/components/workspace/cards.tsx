"use client";
import { useState } from "react";
import { ArrowsClockwiseIcon, BellIcon, CheckCircleIcon, CircleNotchIcon, ClockIcon, CreditCardIcon, FileMagnifyingGlassIcon, InfoIcon, LockIcon, ProhibitIcon, QuestionIcon, SealCheckIcon, ShieldCheckIcon, UserIcon, WarningIcon, XCircleIcon } from "@phosphor-icons/react";
import { useStore, uid } from "@/lib/store";
import { getPersona } from "@/lib/personas";
import { SERVICES, SERVICE_MAP, daysUntil } from "@/lib/services";
import { T, fmtDate, fmtDaysLeft, fmtDuration, fmtSAR, fmtHijri, fmtTime } from "@/lib/i18n";
import { ACTION_LABEL } from "@/lib/engine/policy";
import { brandStatus } from "@/lib/engine/states";
import type { Action, Intent, L, ServiceId, Transaction } from "@/lib/types";
import { ServiceIcon } from "../ServiceIcon";
import { StatusPill } from "../StatusPill";
import { useT } from "../useT";
import * as agent from "./agent";
import { useStepUp } from "./StepUp";

export function Card({ children, accent = "line" }: { children: React.ReactNode; accent?: "line" | "green" | "warn" | "err" }) {
  const border = { line: "border-line", green: "border-green/40", warn: "border-warn/40", err: "border-err/40" }[accent];
  return <div className={`w-full rounded-2xl border ${border} bg-white p-4 sm:p-5`}>{children}</div>;
}

export function CardHead({ icon, title, pill }: { icon: React.ReactNode; title: string; pill?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-mint text-green">{icon}</span>
      <h3 className="min-w-0 flex-1 font-semibold text-teal">{title}</h3>
      {pill}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  busy,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost" | "danger";
  busy?: boolean;
  disabled?: boolean;
}) {
  const cls = {
    primary: "bg-teal text-white hover:bg-teal-2",
    ghost: "border border-line bg-white text-teal hover:bg-mint",
    danger: "border border-err/30 bg-white text-err hover:bg-err-bg",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}
    >
      {busy && <CircleNotchIcon size={15} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

// ───────────────────────────────────────────── Notice

export function NoticeCard({ textL, tone }: { textL: L; tone: "warn" | "info" }) {
  const { t } = useT();
  return (
    <div className={`rise flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${tone === "warn" ? "border-warn/30 bg-warn-bg text-[#6b430c]" : "border-sky bg-sky/25 text-teal"}`}>
      {tone === "warn" ? <ShieldCheckIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> : <InfoIcon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />}
      <p>{t(textL)}</p>
    </div>
  );
}

// ───────────────────────────────────────────── Plan

function PlanRow({ personaId, intent }: { personaId: string; intent: Intent }) {
  const { t, lang } = useT();
  const persona = getPersona(personaId)!;
  const svc = SERVICE_MAP[intent.serviceId];
  const targets = svc.targets(persona);
  const [targetId, setTargetId] = useState<string | null>(intent.targetId ?? (targets.length === 1 ? targets[0].id : null));
  const [opened, setOpened] = useState(false);
  const auth = svc.authority(persona, targetId ?? undefined);
  const target = targets.find((x) => x.id === targetId);

  return (
    <li className="rounded-xl border border-line p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal text-mint">
          <ServiceIcon id={svc.id} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-teal">{t(svc.name)}</p>
          <p className="text-xs text-muted">
            {t(T.agency)}: {t(svc.agency)}
          </p>
        </div>
      </div>

      {!auth.ok ? (
        <div className="mt-3 flex gap-2 rounded-lg bg-err-bg p-3 text-sm text-err">
          <ProhibitIcon size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">{t(T.notAuthorizedTitle)}</p>
            <p className="mt-0.5 text-[#7d2f29]">{t(auth.reason)}</p>
            <p className="mt-1.5 text-xs text-muted">{t(T.verifiedByEngine)}</p>
          </div>
        </div>
      ) : (
        <>
          {targets.length > 1 && (
            <fieldset className="mt-3">
              <legend className="text-sm font-medium text-teal">{t(T.chooseWhich)}</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {targets.map((tg) => {
                  const d = daysUntil(tg.expiry);
                  return (
                    <label key={tg.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition ${targetId === tg.id ? "border-green bg-mint" : "border-line hover:bg-warm"}`}>
                      <input type="radio" name={`t-${svc.id}-${intent.targetId}`} className="mt-1 accent-[#187A62]" checked={targetId === tg.id} onChange={() => setTargetId(tg.id)} disabled={opened} />
                      <span className="min-w-0">
                        <span className="block font-medium text-teal">{t(tg.label)}</span>
                        <span className="block text-xs text-muted">{t(tg.sublabel)}</span>
                        <span className={`block text-xs ${d < 30 ? "text-warn" : "text-muted"}`}>{fmtDaysLeft(d, lang)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          {target && targets.length === 1 && (
            <p className="mt-3 text-sm text-ink">
              {t(target.label)} · <span className="text-muted">{t(target.sublabel)}</span> ·{" "}
              <span className={daysUntil(target.expiry) < 30 ? "text-warn" : "text-muted"}>{fmtDaysLeft(daysUntil(target.expiry), lang)}</span>
            </p>
          )}
          <ol className="mt-3 grid gap-1.5 text-sm text-muted">
            {T.steps[lang].map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-warm text-xs font-semibold text-teal">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Btn
              disabled={!targetId || opened}
              onClick={() => {
                setOpened(true);
                agent.openAuthority(personaId, svc.id, targetId!);
              }}
            >
              <ShieldCheckIcon size={16} aria-hidden="true" /> {t(T.setupAuthority)}
            </Btn>
          </div>
        </>
      )}
    </li>
  );
}

export function PlanCard({ personaId, intents, title }: { personaId: string; intents: Intent[]; title?: string }) {
  const { t } = useT();
  return (
    <Card>
      <CardHead icon={<FileMagnifyingGlassIcon size={18} aria-hidden="true" />} title={title ?? t(T.planTitle)} />
      <p className="mt-1.5 text-sm text-muted">{t(T.planNote)}</p>
      <ul className="mt-3 space-y-3">
        {intents.map((i, idx) => (
          <PlanRow key={idx + i.serviceId + (i.targetId ?? "")} personaId={personaId} intent={i} />
        ))}
      </ul>
    </Card>
  );
}

export function ExpiringCard({ personaId, intents }: { personaId: string; intents: Intent[] }) {
  const { t } = useT();
  if (!intents.length) return <NoticeCard tone="info" textL={T.nothingExpiring} />;
  return <PlanCard personaId={personaId} intents={intents} title={t(T.expiringIntro)} />;
}

// ───────────────────────────────────────────── Suggest / out of scope

export function SuggestCard({ personaId }: { personaId: string }) {
  const { t } = useT();
  const persona = getPersona(personaId)!;
  const avail = SERVICES.filter((s) => s.authority(persona).ok && s.targets(persona).length);
  return (
    <Card>
      <CardHead icon={<QuestionIcon size={18} aria-hidden="true" />} title={t({ en: "Services available to you", ar: "الخدمات المتاحة لك" })} />
      <div className="mt-3 flex flex-wrap gap-2">
        {avail.map((s) => (
          <button
            key={s.id}
            onClick={() => useStore.getState().addMessage(personaId, { id: uid(), role: "agent", kind: "plan", intents: [{ serviceId: s.id, targetId: null }], at: new Date().toISOString() })}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-teal hover:border-green hover:bg-mint"
          >
            <ServiceIcon id={s.id} size={15} /> {t(s.name)}
          </button>
        ))}
      </div>
    </Card>
  );
}

export function OutOfScopeCard({ topic }: { topic: string }) {
  const { t, lang } = useT();
  return (
    <Card>
      <CardHead icon={<InfoIcon size={18} aria-hidden="true" />} title={t(T.outOfScopeTitle)} pill={<StatusPill tone="neutral">{lang === "ar" ? "المستوى 0 · معلومات عامة" : "Tier 0 · public information"}</StatusPill>} />
      {topic === "hiring_domestic_worker" ? (
        <ol className="mt-3 space-y-2">
          {T.hiringSteps[lang].map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-xs font-semibold text-green">{i + 1}</span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-ink">{t({ en: "This need is outside the services connected in this demo.", ar: "هذا الطلب خارج الخدمات المرتبطة في هذا العرض." })}</p>
      )}
      <p className="mt-3 text-xs text-muted">
        {t({
          en: "Each step is owned by its responsible agency. I would ask for your consent separately before any consequential step, and I don't make eligibility decisions.",
          ar: "كل خطوة من اختصاص جهتها المسؤولة. سأطلب موافقتك بشكل مستقل قبل أي خطوة مؤثرة، ولا أتخذ قرارات الأهلية.",
        })}
      </p>
    </Card>
  );
}

// ───────────────────────────────────────────── Authority setup

const HOURS = [
  { h: 24, l: T.h24 },
  { h: 24 * 7, l: T.d7 },
  { h: 24 * 30, l: T.d30 },
];

export function AuthorityCard({ personaId, messageId, serviceId, targetId, mandateId }: { personaId: string; messageId: string; serviceId: ServiceId; targetId: string; mandateId?: string }) {
  const { t, lang } = useT();
  const persona = getPersona(personaId)!;
  const svc = SERVICE_MAP[serviceId];
  const target = svc.targets(persona).find((x) => x.id === targetId);
  const mandate = useStore((s) => s.mandates.find((m) => m.id === mandateId));
  const [submit, setSubmit] = useState(true);
  const [pay, setPay] = useState(true);
  const [hours, setHours] = useState(24);
  // spending limit for this mandate: defaults to the highest fee this service can charge
  const maxFee = Math.max(...svc.durations.map((d) => svc.feeFor(d)));
  const limits = [...new Set([Math.min(...svc.durations.map((d) => svc.feeFor(d))), maxFee])].filter((x) => x > 0);
  const [limit, setLimit] = useState(maxFee);
  const { busy, run } = useBusy();

  const actions: { a: Action; locked: boolean; on: boolean; set?: (v: boolean) => void }[] = [
    { a: "read", locked: true, on: true },
    { a: "prepare", locked: true, on: true },
    { a: "submit", locked: false, on: submit, set: setSubmit },
    { a: "pay", locked: false, on: pay, set: setPay },
  ];

  if (mandate) {
    const revoked = !!mandate.revokedAt;
    return (
      <Card accent={revoked ? "err" : "green"}>
        <CardHead
          icon={<ShieldCheckIcon size={18} aria-hidden="true" />}
          title={t(T.granted)}
          pill={<StatusPill tone={revoked ? "error" : "ok"}>{revoked ? t(T.revoked) : t(T.active)}</StatusPill>}
        />
        <p className="mt-2 text-sm text-ink">
          <span className="font-mono text-xs text-muted">{mandate.id}</span> · {t(svc.name)} · {t(target?.label)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {mandate.actions.map((a) => t(ACTION_LABEL[a]).split(" — ")[0]).join(" · ")} · {t(T.until)} {fmtDate(mandate.expiresAt, lang)}
        </p>
      </Card>
    );
  }

  return (
    <Card accent="green">
      <CardHead icon={<LockIcon size={18} aria-hidden="true" />} title={t(T.authorityTitle)} />
      <p className="mt-1.5 text-sm text-muted">{t(T.authorityIntro)}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-warm p-3">
          <dt className="text-xs text-muted">{t(T.service)}</dt>
          <dd className="mt-0.5 font-medium text-teal">{t(svc.name)}</dd>
          <dd className="text-xs text-muted">{t(svc.agency)}</dd>
        </div>
        <div className="rounded-xl bg-warm p-3">
          <dt className="text-xs text-muted">{t(T.beneficiary)}</dt>
          <dd className="mt-0.5 font-medium text-teal">{t(target?.label)}</dd>
          <dd className="text-xs text-muted">{t(target?.sublabel)}</dd>
        </div>
      </dl>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-teal">{t(T.permittedActions)}</legend>
        <div className="mt-2 grid gap-2">
          {actions.map(({ a, locked, on, set }) => (
            <label key={a} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${on ? "border-green/30 bg-mint/50" : "border-line"} ${locked ? "" : "cursor-pointer"}`}>
              <input type="checkbox" className="size-4 accent-[#187A62]" checked={on} disabled={locked} onChange={(e) => set?.(e.target.checked)} />
              <span className="flex-1">{t(ACTION_LABEL[a])}</span>
              {locked && <span className="text-xs text-muted">{t(T.required)}</span>}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-teal">{t(T.validFor)}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {HOURS.map((o) => (
            <button
              key={o.h}
              onClick={() => setHours(o.h)}
              aria-pressed={hours === o.h}
              className={`rounded-full border px-3 py-1.5 text-sm ${hours === o.h ? "border-green bg-mint font-semibold text-green" : "border-line text-teal hover:bg-warm"}`}
            >
              {t(o.l)}
            </button>
          ))}
        </div>
      </fieldset>
      {pay && limits.length > 0 && (
        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-teal">{lang === "ar" ? "الحد الأقصى للدفع" : "Spending limit"}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {limits.map((v) => (
              <button key={v} type="button" onClick={() => setLimit(v)} aria-pressed={limit === v}
                className={`rounded-full border px-3 py-1.5 text-sm ${limit === v ? "border-green bg-mint font-semibold text-green" : "border-line text-teal hover:bg-warm"}`}>
                {lang === "ar" ? "حتى " : "Up to "}{fmtSAR(v, lang)}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">{lang === "ar" ? "يمنع محرك السياسات أي دفع أعلى من هذا الحد." : "The policy engine blocks any payment above this limit."}</p>
        </fieldset>
      )}
      <ul className="mt-4 space-y-1 text-xs text-muted">
        <li className="flex gap-1.5"><CheckCircleIcon size={13} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />{t(T.stillAsks)}</li>
        <li className="flex gap-1.5"><CheckCircleIcon size={13} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />{t(T.noPasswords)}</li>
      </ul>
      <div className="mt-4">
        <Btn
          busy={busy}
          onClick={() =>
            run(() =>
              agent.grantAndStart({
                personaId,
                messageId,
                serviceId,
                targetId,
                actions: actions.filter((x) => x.on).map((x) => x.a),
                hours,
                spendLimit: pay ? limit : undefined,
              }),
            )
          }
        >
          <ShieldCheckIcon size={16} aria-hidden="true" /> {t(T.grantAndCheck)}
        </Btn>
      </div>
    </Card>
  );
}

// ───────────────────────────────────────────── Transaction card

function Checklist({ tx }: { tx: Transaction }) {
  const { t, lang } = useT();
  const svc = SERVICE_MAP[tx.serviceId];
  return (
    <div className="mt-3">
      <ul className="space-y-2">
        {tx.checks.map((c, i) => (
          <li key={c.id} className="rise flex gap-2.5 rounded-lg border border-line p-2.5" style={{ animationDelay: `${i * 140}ms` }}>
            {c.status === "pass" ? (
              <CheckCircleIcon size={18} className="mt-0.5 shrink-0 text-green" aria-label={lang === "ar" ? "مستوفى" : "Met"} />
            ) : c.status === "fail" ? (
              <XCircleIcon size={18} className="mt-0.5 shrink-0 text-err" aria-label={lang === "ar" ? "غير مستوفى" : "Not met"} />
            ) : (
              <QuestionIcon size={18} className="mt-0.5 shrink-0 text-warn" aria-label={lang === "ar" ? "غير موثق" : "Unverified"} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2">
                <span className="text-sm font-medium text-teal">{t(c.label)}</span>
                <span className="text-xs text-muted">· {c.source === "authoritative" ? t(T.authoritative) : t(T.userProvided)}</span>
              </div>
              <p className="text-sm text-ink">{t(c.detail)}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">
        {t(T.source)}: {t(svc.ruleSource)} · {t(T.checkedAt)} {fmtDate(tx.createdAt, lang)}
      </p>
    </div>
  );
}

function KV({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-0">
      <dt className="text-sm text-muted">{k}</dt>
      <dd className={`text-end text-sm font-medium text-teal ${mono ? "num-ltr font-mono text-xs" : ""}`}>{v}</dd>
    </div>
  );
}

export function TxCard({ personaId, txId }: { personaId: string; txId: string }) {
  const { t, lang } = useT();
  const tx = useStore((s) => s.txs.find((x) => x.id === txId));
  const reminded = useStore((s) => s.reminders.some((r) => tx && r.serviceId === tx.serviceId && r.targetId === tx.targetId && r.personaId === personaId));
  const selectTx = useStore((s) => s.selectTx);
  const notified = useStore((s) => s.audit.find((e) => e.txId === txId && e.type === "RECORD_HOLDER_NOTIFIED"));
  const [durationIndex, setDurationIndex] = useState(0);
  const { busy, run } = useBusy();
  const stepUp = useStepUp(personaId);
  if (!tx) return null;
  const windowNote = (tier: 3 | 4) =>
    lang === "ar"
      ? `موافقة من المستوى ${tier}: تتحقق من هويتك أولًا${tx.approvalExpiresAt ? `، وتُغلق النافذة ${fmtTime(tx.approvalExpiresAt, lang)}` : ""}.`
      : `Tier ${tier} approval: you confirm it's you first${tx.approvalExpiresAt ? `; the window closes at ${fmtTime(tx.approvalExpiresAt, lang)}` : ""}.`;
  const persona = getPersona(personaId)!;
  const svc = SERVICE_MAP[tx.serviceId];
  const target = svc.targets(persona).find((x) => x.id === tx.targetId);
  const status = brandStatus(tx.state, svc.agencyShort);
  const accent = status.tone === "warn" ? "warn" : status.tone === "ok" ? "green" : "line";
  const previewDuration = svc.durations[durationIndex];

  return (
    <Card accent={accent}>
      {stepUp.dialog}
      <button className="w-full text-start" onClick={() => selectTx(tx.id)} aria-label={lang === "ar" ? "عرض المسار" : "Show timeline"}>
        <CardHead
          icon={<ServiceIcon id={svc.id} />}
          title={`${t(svc.name)} · ${t(target?.label)}`}
          pill={<StatusPill tone={status.tone}>{t(status.label)}</StatusPill>}
        />
        <p className="mt-1 font-mono text-xs text-muted">{tx.id}</p>
      </button>

      {tx.checks.length > 0 && <Checklist tx={tx} />}

      {tx.state === "PREPARED" && tx.preview && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-teal">
            <SealCheckIcon size={18} aria-hidden="true" /> {t(T.reviewTitle)}
          </p>
          <p className="mt-1 text-sm text-muted">{t(T.reviewIntro)}</p>
          <dl className="mt-3">
            {tx.preview.fields.map((f, i) => (
              <KV key={i} k={t(f.label)} v={t(f.value)} />
            ))}
            <KV k={t(T.fee)} v={fmtSAR(svc.feeFor(previewDuration), lang)} />
            <KV k={t(T.payee)} v={t(svc.payee)} />
          </dl>
          {svc.durations.length > 1 && (
            <fieldset className="mt-3">
              <legend className="text-sm font-medium text-teal">{t(T.duration)}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {svc.durations.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => setDurationIndex(i)}
                    aria-pressed={durationIndex === i}
                    className={`rounded-full border px-3 py-1.5 text-sm ${durationIndex === i ? "border-green bg-white font-semibold text-green" : "border-line bg-white/60 text-teal hover:bg-white"}`}
                  >
                    {fmtDuration(d, lang)} · {fmtSAR(svc.feeFor(d), lang)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <p className="mt-3 text-xs text-muted">{windowNote(3)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn busy={busy} onClick={() => run(async () => { if (await stepUp.ensure()) await agent.approveDetails(tx, durationIndex); })}>
              <CheckCircleIcon size={16} aria-hidden="true" /> {t(T.approveDetails)}
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => run(() => agent.cancelTx(tx))}>
              {t(T.cancel)}
            </Btn>
          </div>
        </div>
      )}

      {tx.state === "USER_CONFIRMED" && tx.preview && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-teal">
            <CreditCardIcon size={18} aria-hidden="true" /> {t(T.paymentTitle)}
          </p>
          <p className="mt-1 text-sm text-muted">{t(T.paymentIntro)}</p>
          <dl className="mt-3">
            <KV k={t(T.amount)} v={fmtSAR(tx.preview.fee, lang)} />
            <KV k={t(T.payee)} v={t(tx.preview.payee)} />
            <KV k={t(T.duration)} v={fmtDuration(tx.preview.duration, lang)} />
          </dl>
          <p className="mt-2 text-xs text-muted">{t(T.simulatedPayment)}</p>
          <p className="mt-3 text-xs text-muted">{windowNote(4)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn busy={busy} onClick={() => run(async () => { if (await stepUp.ensure()) await agent.approvePayment(tx); })}>
              <CreditCardIcon size={16} aria-hidden="true" /> {t(T.approvePay)} {fmtSAR(tx.preview.fee, lang)}
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => run(() => agent.cancelTx(tx))}>
              {t(T.cancel)}
            </Btn>
          </div>
        </div>
      )}

      {tx.state === "RECONCILIATION_REQUIRED" && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <WarningIcon size={18} aria-hidden="true" /> {t(T.reconTitle)}
          </p>
          <p className="mt-1 text-sm text-[#6b430c]">{t(T.reconBody)}</p>
          {tx.payment && (
            <dl className="mt-3">
              <KV k={t(T.paymentRef)} v={tx.payment.reference} mono />
              <KV k={t(T.amount)} v={fmtSAR(tx.payment.amount, lang)} />
            </dl>
          )}
          <div className="mt-4">
            <Btn busy={busy} onClick={() => run(() => agent.reconcile(tx))}>
              <ArrowsClockwiseIcon size={16} aria-hidden="true" /> {t(T.reconcile)}
            </Btn>
          </div>
        </div>
      )}

      {(tx.state === "PAYMENT_CONFIRMED" || tx.state === "SUBMITTED") && (
        <div className="mt-4 flex items-center gap-3 border-t border-line pt-4 text-sm text-teal">
          <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />
          <span className="flex-1">{tx.state === "PAYMENT_CONFIRMED" ? t(T.submitting) : t(T.awaitingAgency)}</span>
          <button onClick={() => run(async () => { await agent.resume(tx); })} className="text-xs text-green underline">
            {lang === "ar" ? "متابعة" : "Continue"}
          </button>
        </div>
      )}

      {tx.state === "RECEIPT_ISSUED" && tx.receipt && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-green">
            <SealCheckIcon size={20} aria-hidden="true" /> {t(T.receiptTitle)} {t(svc.agencyShort)}
          </p>
          <p className="mt-1 text-sm text-teal">{t(T.receiptBody)}</p>
          <dl className="mt-3">
            <KV k={t(T.receiptNo)} v={tx.receipt.number} mono />
            <KV k={t(T.newExpiry)} v={`${fmtDate(tx.receipt.newExpiry, lang)} · ${fmtHijri(tx.receipt.newExpiry, lang)}`} />
            {tx.submission && <KV k={t(T.agencyRef)} v={tx.submission.reference} mono />}
            {tx.payment && <KV k={t(T.paymentRef)} v={tx.payment.reference} mono />}
            {tx.preview && <KV k={t(T.amount)} v={fmtSAR(tx.preview.fee, lang)} />}
            <KV k={t(T.agency)} v={t(tx.receipt.agency)} />
          </dl>
          {notified && <p className="mt-3 flex items-start gap-2 text-sm text-ink"><BellIcon size={16} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />{t(notified.summary)}</p>}
        </div>
      )}

      {tx.state === "BLOCKED" && tx.blocker && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <WarningIcon size={18} aria-hidden="true" /> {t(T.blockedTitle)}
          </p>
          <p className="mt-1 text-sm text-[#6b430c]">{t(tx.blocker.reason)}</p>
          {tx.blocker.nextStep && (
            <div className="mt-3 text-sm">
              <p className="text-[13px] font-medium text-muted">{t(T.nextStep)}</p>
              <p className="mt-1 text-ink">{t(tx.blocker.nextStep)}</p>
            </div>
          )}
          <p className="mt-2 text-xs text-muted">{lang === "ar" ? "لم يُرسل أي شيء إلى الجهة." : "Nothing was sent to the agency."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Btn
              variant="ghost"
              disabled={reminded}
              onClick={() => useStore.getState().addReminder({ id: uid(), personaId, serviceId: tx.serviceId, targetId: tx.targetId, createdAt: new Date().toISOString() })}
            >
              <BellIcon size={15} aria-hidden="true" /> {reminded ? t(T.reminderSet) : t(T.remindMe)}
            </Btn>
            <Btn variant="ghost" busy={busy} onClick={() => run(() => agent.escalate(tx))}>
              <UserIcon size={15} aria-hidden="true" /> {t(T.talkToHuman)}
            </Btn>
          </div>
        </div>
      )}

      {tx.state === "HUMAN_REVIEW" && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-2 font-semibold text-warn">
            <UserIcon size={18} aria-hidden="true" /> {t(T.reviewRequired)}
          </p>
          {tx.review && <p className="mt-1 text-sm text-[#6b430c]">{t(tx.review.reason)}</p>}
          {tx.blocker?.nextStep && <p className="mt-2 text-sm text-ink">{t(tx.blocker.nextStep)}</p>}
          <p className="mt-2 text-sm text-ink">{t(T.humanBody)}</p>
          {tx.review && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <ClockIcon size={13} aria-hidden="true" /> {t(T.caseId)} <span className="font-mono">{tx.review.caseId}</span>
            </p>
          )}
        </div>
      )}

      {tx.state === "CANCELLED" && <p className="mt-3 text-sm text-muted">{t(T.cancelled)}</p>}
    </Card>
  );
}
