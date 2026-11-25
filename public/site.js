// Language for the landing page: Arabic first, English on request.
// Shares the choice with the demo app, whose zustand store persists it under "mueen-demo-v1".
(() => {
  const KEY = 'mueen-demo-v1';
  const root = document.documentElement;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const q = new URLSearchParams(location.search).get('lang');
  let lang = q === 'en' || q === 'ar' ? q : read()?.state?.lang === 'en' ? 'en' : 'ar';

  // Keep the English written in the markup so switching back needs no second copy.
  const texts = [...document.querySelectorAll('[data-ar]')].map(el => [el, el.textContent]);
  const labels = [...document.querySelectorAll('[data-ar-aria]')].map(el => [el, el.getAttribute('aria-label')]);
  const meta = { title: document.title, desc: document.querySelector('meta[name="description"]')?.content };
  const AR = {
    title: 'مُعين: وكيل ذكي لتجديد الوثائق الحكومية في السعودية',
    desc: 'نموذج مفاهيمي لوكيل ذكي تحكمه الجهات الحكومية، يجدّد سبع وثائق حكومية سعودية بموافقتك قبل كل إرسال ودفع.',
  };
  const toggle = document.querySelector('[data-lang-toggle]');

  function apply(l) {
    const ar = l === 'ar';
    root.lang = l;
    root.dir = ar ? 'rtl' : 'ltr';
    for (const [el, en] of texts) el.textContent = ar ? el.dataset.ar : en;
    for (const [el, en] of labels) el.setAttribute('aria-label', ar ? el.dataset.arAria : en);
    document.title = ar ? AR.title : meta.title;
    const d = document.querySelector('meta[name="description"]');
    if (d) d.content = ar ? AR.desc : meta.desc;
    if (toggle) { toggle.textContent = ar ? 'English' : 'العربية'; toggle.lang = ar ? 'en' : 'ar'; }
    try {
      const s = read() || { state: {}, version: 0 };
      s.state = { ...s.state, lang: l };
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch { /* storage blocked: the choice lasts for this page only */ }
  }

  // Diagrams are drawn once from their JSON (diagram.js reads the first one): keep only this language's spec.
  for (const arSpec of document.querySelectorAll('script[data-ar-json]')) {
    if (lang === 'ar') arSpec.previousElementSibling.textContent = arSpec.textContent;
    arSpec.remove();
  }
  // The kit's windows write these status words into their rows as they animate.
  if (lang === 'ar') {
    const WORDS = { Waiting: 'قيد الانتظار', Checking: 'قيد التحقق', Confirmed: 'مؤكد', Policy: 'السياسة', Agent: 'الوكيل', Agency: 'الجهة' };
    for (const w of document.querySelectorAll('[data-ui="window"]')) for (const k of ['open', 'work', 'done']) w.dataset[k] = WORDS[w.dataset[k]] ?? w.dataset[k];
  }
  apply(lang);
  // The kit draws its diagrams and loops once, so a switch reloads the page in the other language.
  toggle?.addEventListener('click', () => { apply(lang === 'ar' ? 'en' : 'ar'); location.search = '?lang=' + root.lang; });
})();
