// استخدام مكتبة SSR (Server-Side Rendering) الحديثة من Supabase
// وهي الباقة الرسمية والأحدث للعمل بتوافق تام مع Next.js App Router
import { createBrowserClient } from '@supabase/ssr';

// ==========================================
// 🔌 مزوّد الاتصال بقاعدة البيانات (Supabase Browser Client)
// هذا الملف هو بوابة العبور بين المتصفح (Client) وقاعدة البيانات السحابية.
// يتم استدعاؤه في أي مكون (Component) يحتاج لجلب أو إرسال بيانات.
// ==========================================

// 🔐 جلب المفاتيح البيئية (Environment Variables)
// البادئة NEXT_PUBLIC_ ضرورية جداً هنا لكي يسمح Next.js بتضمين هذه المفاتيح
// داخل حزمة المتصفح (Client Bundle) بشكل آمن للمفتاح العام (Anon Key).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 🛡️ حماية وتنبيه للمطورين (Developer Experience - DX)
// التحقق من وجود المفاتيح قبل محاولة الاتصال. 
// هذا الفحص البسيط يوفر ساعات من تتبع الأخطاء (Debugging) إذا نسي أحد أعضاء الفريق
// إعداد ملف الـ (.env.local) الخاص به بعد استنساخ المشروع.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase configuration is missing. Please check your .env file.');
}

// 🚀 إنشاء وتصدير نسخة الاتصال (Client Instance)
// نقوم بإنشاء العميل وتصديره كـ (Singleton)، أي نسخة واحدة فقط يتم مشاركتها 
// في جميع أنحاء التطبيق. هذا يمنع فتح آلاف الاتصالات المتكررة التي قد ترهق قاعدة البيانات.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
