import { supabase } from './supabase';

// ==========================================
// 🚨 تعريف درجات خطورة الخطأ (Severity Levels)
// ==========================================
export type ErrorSeverity = 'info' | 'warning' | 'critical';

// ==========================================
// 🛡️ درع الحماية من الإغراق (Spam Prevention Cache)
// نستخدم Set لأن عملية البحث فيه (has) سريعة جداً O(1) ولا تستهلك الذاكرة.
// ==========================================
const recentErrors = new Set<string>();

/**
 * 🛠️ محرك تسجيل الأخطاء العالمي - النسخة المحصنة (Global Error Logger)
 * المسار: lib/logger.ts
 * وظيفته: التقاط أي خطأ يحدث في المنصة، تجميع بيانات المستخدم والبيئة، وإرسالها بصمت لقاعدة البيانات.
 */
export const systemLogger = {
  log: async (error: any, severity: ErrorSeverity = 'warning', type: string = 'SYSTEM_ERROR') => {
    // 🛡️ حماية شاملة: نغلف المحرك بالكامل لتجنب أن يكون هو سبب انهيار التطبيق
    try {
      
      // ==========================================
      // 1️⃣ الاستخراج الآمن لرسالة الخطأ (Safe Payload Extraction)
      // الأخطاء في JavaScript قد تكون String، أو Object، أو Error Class.
      // هنا نقوم بتوحيدها لتجنب أخطاء تحويل الـ JSON (Circular Reference).
      // ==========================================
      let errorMessage = 'Unknown Error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        try {
          errorMessage = JSON.stringify(error);
        } catch (e) {
          errorMessage = 'Complex Object Error (Unstringifyable)';
        }
      }

      // ==========================================
      // 2️⃣ آلية منع التكرار اللانهائي (Rate Limiting)
      // ==========================================
      // تكوين "بصمة" للخطأ (Hash)
      const errorHash = `${type}:${errorMessage}`;
      
      // إذا تم إرسال نفس الخطأ خلال آخر 60 ثانية، فتجاهله بصمت لحماية السيرفر
      if (recentErrors.has(errorHash)) {
        return; 
      }
      
      // تسجيل بصمة الخطأ في الذاكرة المؤقتة، وبرمجة حذفها بعد 60 ثانية (60000ms)
      recentErrors.add(errorHash);
      setTimeout(() => recentErrors.delete(errorHash), 60000);

      // ==========================================
      // 3️⃣ تجميع السياق والبيئة (Context Gathering)
      // ==========================================
      // محاولة جلب بيانات المستخدم بصمت (بدون التأثير على الأداء) لمعرفة "مَن" واجه الخطأ
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const userRole = user?.user_metadata?.role || 'guest';

      // ==========================================
      // 4️⃣ تجهيز حزمة البيانات (Data Payload)
      // ==========================================
      const errorPayload = {
        user_id: user?.id || null,
        user_role: userRole,
        error_type: type,
        message: errorMessage,
        // typeof window يضمن عدم انهيار الكود إذا تم تشغيل المحرك في السيرفر (Next.js SSR)
        page_url: typeof window !== 'undefined' ? window.location.href : 'server-side',
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        severity: severity
      };

      // ==========================================
      // 5️⃣ إطلاق التقرير لقاعدة البيانات (Database Insertion)
      // ==========================================
      const { error: dbError } = await supabase.from('error_logs').insert(errorPayload);
      
      // طباعة الخطأ في الكونسول فقط إذا كنا في بيئة التطوير (Development) لتسهيل تنقيح الكود
      if (dbError && process.env.NODE_ENV === 'development') {
        console.error('[SystemLogger] Failed to insert to DB:', dbError);
      }

      if (process.env.NODE_ENV === 'development') {
        console.error(`[SystemLogger Detected] ${type}:`, errorMessage);
      }

    } catch (e) {
      // 💥 الفشل الصامت (Silent Fail)
      // في أسوأ الحالات، إذا فشل المحرك نفسه، نطبع الخطأ في كونسول المتصفح فقط ونستمر في تشغيل الموقع
      console.error('Critical Error: Logger Core Failed', e);
    }
  }
};
