import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// ==========================================
// 🛠️ صندوق الأدوات السويسرية (Global Utilities)
// هذا الملف يحتوي على الوظائف المساعدة التي تُستخدم في كل مكان في النظام
// ==========================================

// ==========================================
// 🎨 1. دمج الكلاسات الذكي (Tailwind Class Merger)
// ==========================================
// هذه الدالة (cn) تحل أكبر مشكلة في المكونات القابلة لإعادة الاستخدام مع Tailwind CSS وهي "تعارض الكلاسات".
// تجمع بين clsx (الذي يسمح بكتابة كلاسات شرطية بسهولة) 
// و twMerge (الذي يقوم بحذف الكلاسات المتعارضة بذكاء، مثلاً إذا دمجت p-4 مع p-2، سينتصر p-2 ويلغي الآخر).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==========================================
// 📝 2. تنظيف النصوص (String Normalization)
// ==========================================
// تحول القيمة الفارغة (null) القادمة من قاعدة البيانات إلى (undefined).
// هذا مهم لأن حقول الإدخال (Inputs) في React تفضل undefined لتعرف أن الحقل "غير متحكم به" (Uncontrolled).
export const normalizeString = (value: string | null | undefined): string | undefined => {
  return value ?? undefined;
};

// ==========================================
// 📤 3. تجهيز البيانات للإرسال لقاعدة البيانات (Payload Normalizer)
// ==========================================
/**
 * Normalizes a payload for database operations by converting undefined to null
 * for optional fields that should be nullable in the database.
 * * 💡 لماذا هذا مهم جداً؟ (السر المعماري)
 * في قواعد بيانات PostgreSQL (Supabase)، الحقل الفارغ يجب أن يكون صراحةً `null`. 
 * إذا أرسلنا `undefined` من الـ Frontend، فإن الـ API الخاص بـ Supabase سيتجاهل الحقل تماماً من جملة الـ UPDATE، 
 * وبالتالي لن يقوم بمسح البيانات القديمة! هذه الدالة تمر على كل البيانات وتضمن أن أي حقل تم إفراغه 
 * يتحول لـ null ليتم مسحه برمجياً في قاعدة البيانات بشكل سليم.
 */
export function normalizePayload<T extends Record<string, any>>(payload: T): T {
  const normalized = { ...payload };
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === undefined) {
      normalized[key as keyof T] = null as any;
    }
  });
  return normalized;
}

// ==========================================
// 📥 4. تنظيف البيانات القادمة من قاعدة البيانات (Response Cleaner)
// ==========================================
/**
 * Cleans a response from the database by converting null to undefined
 * for fields that should be optional in the UI.
 * * 💡 لماذا هذا مهم في واجهة المستخدم (UI)؟
 * عندما تعود البيانات من Supabase، الحقول غير المعبأة تأتي كـ `null`.
 * لكن في واجهة React و TypeScript (في الـ Interfaces التي صممناها بـ Optional Fields `?`)، 
 * النظام يتوقع `undefined`. هذه الدالة تقوم بمسح المفتاح (Key) بالكامل من الكائن (Object) إذا كانت قيمته null، 
 * مما يجعل البيانات نظيفة ومثالية وتمنع أخطاء عدم توافق الأنواع (Type Mismatch) في الواجهة.
 */
export function cleanResponse<T extends Record<string, any>>(data: T): T {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === null) {
      delete cleaned[key];
    }
  });
  return cleaned;
}
