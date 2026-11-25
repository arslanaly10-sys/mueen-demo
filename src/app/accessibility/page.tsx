"use client";
import { DocPage } from "@/components/DocPage";

export default function Accessibility() {
  return (
    <DocPage
      title={{ en: "Accessibility statement", ar: "بيان إمكانية الوصول" }}
      updated="2026-11-25"
      lede={{
        en: "The platform aims to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA, in Arabic and English. It is partially conformant: we test it ourselves, and it has not yet had an independent audit.",
        ar: "تسعى المنصة إلى استيفاء إرشادات إمكانية الوصول إلى محتوى الويب (WCAG) 2.2 بالمستوى AA، باللغتين العربية والإنجليزية. وهو متوافق جزئيًا: نختبره بأنفسنا ولم يخضع بعد لتدقيق مستقل.",
      }}
      sections={[
        { h: { en: "What we check", ar: "ما نتحقق منه" }, p: [{ en: "Every release is checked with an automated audit in both languages, a keyboard-only walk through each flow, reflow at 320 pixels wide and the reduced-motion setting.", ar: "يُفحص كل إصدار بتدقيق آلي باللغتين، وتجربة كل مسار بلوحة المفاتيح فقط، وإعادة التدفق بعرض 320 بكسل، وإعداد تقليل الحركة." }] },
        { h: { en: "Known limitations", ar: "قيود معروفة" }, p: [
          { en: "Grey labels inside the illustrations on the home page are below 4.5:1 contrast; they are decorative pictures of the product.", ar: "التسميات الرمادية داخل الرسوم التوضيحية في الصفحة الرئيسية أقل من نسبة تباين 4.5:1؛ وهي صور زخرفية للمنتج." },
          { en: "The home page's animation pause buttons are labelled in English on the Arabic page.", ar: "أزرار إيقاف الحركة في الصفحة الرئيسية مسمّاة بالإنجليزية في الصفحة العربية." },
          { en: "The service has not been tested with screen readers by people who use them every day.", ar: "لم تُختبر الخدمة مع قارئات الشاشة من قِبل مستخدميها اليوميين." },
        ] },
        { h: { en: "Report a problem", ar: "أبلغ عن مشكلة" }, p: [{ en: "A production service would give an email address and phone number here, answer within five working days, and offer every service through an assisted channel as well.", ar: "تذكر الخدمة الفعلية هنا بريدًا إلكترونيًا ورقم هاتف، وترد خلال خمسة أيام عمل، وتتيح كل خدمة عبر قناة مساعَدة أيضًا." }] },
      ]}
    />
  );
}
