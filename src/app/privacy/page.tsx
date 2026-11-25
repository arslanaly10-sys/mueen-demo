"use client";
import { DocPage } from "@/components/DocPage";

export default function Privacy() {
  return (
    <DocPage
      title={{ en: "Privacy notice", ar: "إشعار الخصوصية" }}
      updated="2026-11-25 · v2026-11"
      lede={{
        en: "This notice explains what the Saudi Government AI Services Platform does with personal data. It is concept text written to the structure the Personal Data Protection Law expects; a production version would be issued by the operating government entity and reviewed by its data protection officer.",
        ar: "يوضح هذا الإشعار ما تفعله منصة الخدمات الحكومية بالذكاء الاصطناعي بالبيانات الشخصية. وهو نص مفاهيمي مكتوب وفق البنية التي يتطلبها نظام حماية البيانات الشخصية؛ وتُصدر النسخة الفعلية الجهة الحكومية المشغّلة ويراجعها مسؤول حماية البيانات لديها.",
      }}
      sections={[
        { h: { en: "Who is responsible", ar: "الجهة المسؤولة" }, p: [{ en: "The operating government entity is the controller. In this demo no real entity operates the service and all people and records are synthetic.", ar: "الجهة الحكومية المشغّلة هي جهة التحكم. في هذا العرض لا تشغّل الخدمة أي جهة حقيقية، وجميع الأشخاص والسجلات افتراضية." }] },
        { h: { en: "What we process", ar: "ما نعالجه" }, p: [{ en: "Your verified identity; the records the owning agency holds for the services you ask about; the authorities you grant; your requests, approvals and payment references; and the conversation you have with the agent.", ar: "هويتك الموثّقة؛ والسجلات التي تحتفظ بها الجهة المالكة للخدمات التي تطلبها؛ والصلاحيات التي تمنحها؛ وطلباتك وموافقاتك ومراجع الدفع؛ ومحادثتك مع الوكيل." }] },
        { h: { en: "Why, and on what basis", ar: "الغرض والأساس النظامي" }, p: [{ en: "To check eligibility, prepare and submit the renewals you approve, and show you their status. The basis is your consent for each authority you grant, alongside the operating entity's statutory mandate. Nothing is used for profiling, advertising or model training.", ar: "للتحقق من الأهلية وتجهيز التجديدات التي توافق عليها وإرسالها وإطلاعك على حالتها. والأساس موافقتك على كل صلاحية تمنحها، إلى جانب الاختصاص النظامي للجهة المشغّلة. لا يُستخدم شيء للتنميط أو الإعلان أو تدريب النماذج." }] },
        { h: { en: "Who receives it", ar: "من يتسلّمها" }, p: [{ en: "Only the agency that owns the service you asked for, and the government payment gateway when you approve a payment. The language model that interprets your message runs inside the Kingdom and sees only the minimum needed.", ar: "الجهة المالكة للخدمة التي طلبتها فقط، وبوابة الدفع الحكومية عند موافقتك على الدفع. ويعمل النموذج اللغوي الذي يفسّر رسالتك داخل المملكة ولا يطّلع إلا على الحد الأدنى اللازم." }] },
        { h: { en: "How long we keep it", ar: "مدة الاحتفاظ" }, p: [{ en: "Requests and conversations: until you delete them. The signed audit log: for the period the records schedule sets, because it is the evidence of what was done for you. In this demo everything stays in your browser.", ar: "الطلبات والمحادثات: حتى تحذفها. وسجل التدقيق الموقّع: للمدة التي يحددها جدول الاحتفاظ بالوثائق، لأنه الدليل على ما نُفّذ نيابةً عنك. في هذا العرض تبقى البيانات كلها في متصفحك." }] },
        { h: { en: "Your rights", ar: "حقوقك" }, p: [{ en: "You can see what is held about you, export it, correct it through the owning agency, delete your requests and conversation, and withdraw consent. Use the My data page while signed in.", ar: "يمكنك الاطلاع على ما يُحتفظ به عنك وتصديره وتصحيحه عبر الجهة المالكة وحذف طلباتك ومحادثتك وسحب الموافقة. استخدم صفحة «بياناتي» بعد تسجيل الدخول." }] },
        { h: { en: "Contact", ar: "التواصل" }, p: [{ en: "A production service would name its data protection officer and a complaints route here, and the right to complain to the competent authority.", ar: "تذكر الخدمة الفعلية هنا مسؤول حماية البيانات لديها وقناة الشكاوى، والحق في التظلم أمام الجهة المختصة." }] },
      ]}
    />
  );
}
