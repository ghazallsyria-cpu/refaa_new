import { supabase } from './supabase';

export type ErrorSeverity = 'info' | 'warning' | 'critical';

// ذاكرة مؤقتة لمنع تكرار إرسال نفس الخطأ (Spam Prevention)
const recentErrors = new Set<string>();

/**
 * 🛠️ محرك تسجيل الأخطاء العالمي - النسخة المحصنة
 * المسار: lib/logger.ts
 */
export const systemLogger = {
  log: async (error: any, severity: ErrorSeverity = 'warning', type: string = 'SYSTEM_ERROR') => {
    try {
      // 1. استخراج رسالة الخطأ بشكل آمن (لتجنب أخطاء تحويل JSON)
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

      // 2. منع التكرار اللانهائي (Rate Limiting)
      // إذا تم إرسال نفس الخطأ خلال آخر 60 ثانية، لا ترسله مجدداً
      const errorHash = `${type}:${errorMessage}`;
      if (recentErrors.has(errorHash)) {
        return; // تجاهل الخطأ المكرر بصمت
      }
      
      // تسجيل الخطأ في الذاكرة وحذفه بعد 60 ثانية
      recentErrors.add(errorHash);
      setTimeout(() => recentErrors.delete(errorHash), 60000);

      // 3. محاولة جلب بيانات المستخدم بصمت (بدون انتظار طويل)
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const userRole = user?.user_metadata?.role || 'guest';

      // 4. تجهيز الحزمة
      const errorPayload = {
        user_id: user?.id || null,
        user_role: userRole,
        error_type: type,
        message: errorMessage,
        page_url: typeof window !== 'undefined' ? window.location.href : 'server-side',
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : 'unknown',
        severity: severity
      };

      // 5. إطلاق التقرير لقاعدة البيانات
      const { error: dbError } = await supabase.from('error_logs').insert(errorPayload);
      
      if (dbError && process.env.NODE_ENV === 'development') {
        console.error('[SystemLogger] Failed to insert to DB:', dbError);
      }

      if (process.env.NODE_ENV === 'development') {
        console.error(`[SystemLogger Detected] ${type}:`, errorMessage);
      }

    } catch (e) {
      // الفشل الصامت لكي لا يتعطل الموقع بسبب أداة التتبع
      console.error('Critical Error: Logger Core Failed', e);
    }
  }
};
