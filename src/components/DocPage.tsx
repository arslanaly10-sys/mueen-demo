"use client";
import { AppNav } from "./AppNav";
import { Disclaimer } from "./Disclaimer";
import { LangToggle } from "./LangToggle";
import { useT } from "./useT";

type L = { en: string; ar: string };

/** A plain bilingual document page: a title, a dated lede and titled sections. */
export function DocPage({ title, updated, lede, sections }: { title: L; updated: string; lede: L; sections: { h: L; p: L[] }[] }) {
  const { t, ar } = useT();
  return (
    <div className="min-h-dvh">
      <AppNav>
        <LangToggle />
      </AppNav>
      <main className="wrap py-10">
        <article className="max-w-[68ch]">
          <h1 className="text-3xl font-semibold text-teal">{t(title)}</h1>
          <p className="mt-2 text-sm text-muted">{ar ? "آخر تحديث: " : "Last updated: "}<span className="num-ltr">{updated}</span></p>
          <p className="mt-4 leading-relaxed text-ink">{t(lede)}</p>
          {sections.map((s) => (
            <section key={s.h.en} className="mt-8">
              <h2 className="text-xl font-semibold text-teal">{t(s.h)}</h2>
              {s.p.map((p, i) => <p key={i} className="mt-2 leading-relaxed text-ink">{t(p)}</p>)}
            </section>
          ))}
        </article>
        <div className="mt-12"><Disclaimer /></div>
      </main>
    </div>
  );
}
