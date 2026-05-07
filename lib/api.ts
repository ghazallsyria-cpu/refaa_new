import { supabase } from '@/lib/supabase';

// ==========================================
// 🗄️ محرك جلب البيانات الديناميكي (Generic Data Fetcher)
// هذه الدالة تعتبر "الجوكر" للتعامل مع قاعدة بيانات Supabase.
// تمنع تكرار الكود (DRY Principle) وتوفر جلب البيانات، الفلترة، والتقسيم في مكان واحد.
// ==========================================
export async function fetchScopedData(
  table: string,                  // 📌 اسم الجدول المستهدف (مثال: 'students', 'exams', 'announcements')
  filters: Record<string, any>,   // 📌 كائن يحتوي على شروط الفلترة (مثال: { class_level: 10, status: 'active' })
  page: number = 1,               // 📌 رقم الصفحة الحالية (الافتراضي 1)
  limit: number = 20              // 📌 عدد العناصر في كل صفحة (الافتراضي 20 لتخفيف الضغط على السيرفر وتسريع الواجهة)
) {
  
  // 1️⃣ بناء الاستعلام الأساسي (Base Query)
  // نطلب كل الأعمدة (*)، ونطلب أيضاً العدد الإجمالي الدقيق (exact count)
  // الـ Count هنا ضروري جداً لكي يعمل شريط التنقل (Pagination) بشكل صحيح في الواجهة.
  let query = supabase
    .from(table)
    .select('*', { count: 'exact' })
    // 2️⃣ تطبيق نظام التقسيم الرياضي (Pagination Logic)
    // تحويل رقم الصفحة إلى نطاق (Range) برمجي. 
    // مثال: الصفحة 1 بحد 20 تعني من الـ Index (0) إلى (19).
    .range((page - 1) * limit, page * limit - 1);

  // 3️⃣ تطبيق الفلاتر الديناميكية (Dynamic Filtering)
  // حلقة تكرارية تمر على كل مفتاح (Key) وقيمة (Value) تم تمريرها في كائن الفلتر
  Object.entries(filters).forEach(([key, value]) => {
    // 🛡️ حماية: نتأكد أن القيمة موجودة فعلياً (ليست null أو undefined) 
    // لكي لا نبني استعلاماً خاطئاً يؤدي لانهيار الطلب.
    if (value !== undefined && value !== null) {
      query = query.eq(key, value); // تطبيق شرط المساواة (Equal)
    }
  });

  // 4️⃣ تنفيذ الطلب الفعلي للسيرفر (Execution)
  const { data, error, count } = await query;
  
  // 💥 معالجة الأخطاء: إذا فشل الطلب، نرمي الخطأ ليتم التقاطه 
  // في الـ (try/catch) الخاص بالصفحة التي استدعت هذه الدالة.
  if (error) throw error;
  
  // 📦 إعادة البيانات مع العدد الإجمالي ككائن موحد
  return { data, count };
}
