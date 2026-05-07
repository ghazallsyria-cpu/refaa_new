import { NextResponse } from 'next/server';
import { z } from 'zod';

// ==========================================
// 🛡️ أدوات حماية واجهات برمجة التطبيقات (API Utilities)
// هذا الملف هو خط الدفاع الأول للسيرفر (Backend).
// يضمن أن البيانات القادمة نظيفة، مطابقة للمواصفات، ويمنع انهيار السيرفر.
// ==========================================

// ==========================================
// 📥 1. محرك التحقق من الطلبات (Request Validator)
// دالة (Generic) تستقبل أي طلب HTTP وتمرره عبر مصفاة Zod لتنظيفه وتأكيد نوعه.
// ==========================================
export async function validateRequest<T>(req: Request, schema: z.Schema<T>): Promise<T> {
  let body;
  
  // 🛡️ الخطوة الأولى: محاولة قراءة جسم الطلب (JSON Body)
  // إذا أرسل المستخدم بيانات تالفة (Not a valid JSON)، نمنع انهيار السيرفر (Crash)
  try {
    body = await req.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
  
  // 🛡️ الخطوة الثانية: فلترة البيانات باستخدام Zod (Schema Validation)
  // safeParse يختبر البيانات دون أن يرمي خطأ مباشر، مما يسمح لنا بالتعامل مع النتيجة بأمان.
  const result = schema.safeParse(body);
  
  // إذا كانت البيانات ناقصة أو لا تطابق الشروط (مثلاً: إيميل خاطئ أو نص بدلاً من رقم)
  if (!result.success) {
    throw result.error; // نقوم برمي الخطأ ليلتقطه معالج الأخطاء في الأسفل
  }
  
  // إذا نجح الفحص، نعيد البيانات الموثوقة والمنظفة (Type-Safe Data)
  return result.data;
}

// ==========================================
// 🚨 2. المعالج المركزي للأخطاء (Centralized Error Handler)
// هذه الدالة توحد شكل رسائل الخطأ (Error Responses) التي تعود للـ Frontend.
// بدلاً من إرسال أخطاء عشوائية، السيرفر يتحدث دائماً بلغة واحدة ومنظمة.
// ==========================================
export function handleApiError(error: unknown, context: string) {
  // 📝 تسجيل الخطأ في الكونسول (لأغراض التتبع والصيانة Backend Logs)
  // يتم دمج اسم الـ context (مثلاً: "CreateUserAPI") مع الخطأ لسهولة العثور عليه.
  console.error(`${context} Error:`, error);
  
  // 🔍 الحالة الأولى: خطأ في التحقق (Validation Error)
  // إذا كان الخطأ قادماً من Zod، ننسقه ونرسله كـ 400 Bad Request
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Validation failed', // رسالة عامة للـ Frontend
        details: error.format()     // تفاصيل دقيقة (أي حقل بالضبط هو الخاطئ)
      }, 
      { status: 400 } // 400 تعني أن الخطأ من طرف المستخدم (Client Error)
    );
  }

  // استخراج النص الفعلي للخطأ بأمان (حتى لو لم يكن كائن Error قياسي)
  const message = error instanceof Error ? error.message : 'Unknown error';
  
  // 🔍 الحالة الثانية: خطأ في صياغة الـ JSON (تخريب مقصود أو خلل في الإرسال)
  if (message === 'Invalid JSON body') {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // 💥 الحالة الثالثة: خطأ غير متوقع في السيرفر (Database failure, Network issue, etc.)
  // يتم إرجاع 500 Internal Server Error كرسالة عامة.
  return NextResponse.json({ error: message }, { status: 500 });
}
