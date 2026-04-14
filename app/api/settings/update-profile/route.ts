import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // نستخدم صلاحيات الأدمن (Service Role) مع إيقاف الجلسات (persistSession: false) لتجنب مشاكل الذاكرة
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const { userId, full_name, phone, role, zoom_link, avatar_url } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 1. تحديث بيانات المستخدم الأساسية (بما في ذلك الصورة الشخصية الجديدة)
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name,
        phone: phone || null,
        avatar_url: avatar_url || null, // 🚀 حفظ رابط الصورة
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (userError) throw userError;

    // 2. تحديث بيانات المعلم الإضافية (مثل رابط زووم)
    // 🚀 الإصلاح الجذري: البحث والتحديث باستخدام id مباشرة (تم حذف user_id والـ Fallback المعطوب)
    if (role === 'teacher' && zoom_link !== undefined) {
      const { error: teacherError } = await adminSupabase
        .from('teachers')
        .update({ zoom_link: zoom_link || null })
        .eq('id', userId); // ✅ التصحيح هنا
        
      if (teacherError) {
        console.error("Failed to update teacher zoom link:", teacherError.message);
        // نحن لا نوقف تحديث الملف الشخصي بالكامل إذا فشل حفظ رابط الزووم فقط
      }
    }

    return NextResponse.json({ success: true, message: "تم التحديث بنجاح" });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
