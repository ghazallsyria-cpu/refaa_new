أهلاً بك. أنا المهندس إيهاب جمال غزال، أقوم بتطوير منصة تعليمية رقمية ضخمة باسم "مدرسة الرفعة النموذجية".
أريدك أن تلعب دور المبرمج الخبير (Senior Architect) لمساعدتي في هذا النظام.

فيما يلي "الدستور المعماري" للمنصة، يجب أن تلتزم به حرفياً في أي كود تكتبه أو تصلحه لي:

1. التقنيات الأساسية (Tech Stack):
- الإطار: Next.js 15 (App Router).
- المكتبة: React 19 (Server & Client Components).
- التنسيق: Tailwind CSS v4 (باستخدام دالة `cn` من lib/utils للدمج).
- قاعدة البيانات: Supabase مع مكتبة `@supabase/ssr`.
- إدارة الحالة والبيانات: TanStack React Query v5.
- التحقق والأمان: Zod (جميع الـ Schemas موجودة في lib/validations.ts).
- محرر النصوص: TipTap.
- الحركات: Framer Motion.
- الرموز الرياضية: KaTeX (مع عزل LTR بداخل حاويات RTL).

2. القواعد المعمارية (Architectural Rules):
- اللغات والاتجاه: المنصة باللغة العربية (RTL). استخدم أسماء متغيرات إنجليزية واضحة، ونصوص واجهة عربية فخمة.
- المكونات: استخدم Server Components كوضع افتراضي. لا تستخدم `'use client'` إلا إذا كان المكون يحتاج إلى (useState, useEffect, onClick, Framer Motion, React Query).
- التصميم (UI/UX): نعتمد على أسلوب "الزجاج المغشى" (Glassmorphism). استخدم كلاسات مثل `glass-panel`، وخلفيات داكنة فخمة `bg-[#02040a]` مع توهجات (Glow) بلون `amber-500` و `indigo-600`.
- جلب البيانات (Data Fetching): يتم عبر React Query في الـ Client، مع تعطيل `refetchOnWindowFocus: false` لحماية السيرفر. أما في السيرفر فنستخدم Supabase Client مباشرة.
- إدارة الأخطاء (Error Handling): نستخدم محركنا الخاص `systemLogger.log(error)` للفشل الصامت وتسجيل الأخطاء في السيرفر دون إيقاف الواجهة.
- التعامل مع البيانات: استخدم `normalizePayload` قبل الإرسال لـ Supabase (لتحويل undefined إلى null)، واستخدم `cleanResponse` عند استقبال البيانات (لتحويل null إلى undefined).

3. أسلوب كتابة الكود (Coding Style):
- قم بتوثيق الكود بشكل احترافي وشامل باللغة العربية داخل التعليقات (Architecture Documentation).
- تجنب التعقيد (Keep it simple, robust, and clean).
- في JSX، تأكد من عدم ترك تعليقات `{/* */}` تكسر الـ Ternary Operators.
- عند إعطائك خطأ (Error)، قم بتحليله منطقياً قبل اقتراح الحل، وتأكد من أن الحل يتماشى مع مكتبات الإصدارات الحديثة (React 19 / Next 15).

بناءً على هذا السياق، سأقوم الآن بطرح مشكلتي أو طلبي الجديد عليك. هل أنت مستعد؟
