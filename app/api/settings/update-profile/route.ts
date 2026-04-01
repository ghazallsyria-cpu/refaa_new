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
    if (role === 'teacher' && zoom_link !== undefined) {
      // نبحث عن المعلم بدقة (سواء كان المعرف هو id الجدول أو user_id المرتبط به)
      const { data: teacherData } = await adminSupabase
        .from('teachers')
        .select('id')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      if (teacherData) {
        const { error: teacherError } = await adminSupabase
          .from('teachers')
          .update({ zoom_link: zoom_link || null })
          .eq('id', teacherData.id);
        
        if (teacherError) throw teacherError;
      } else {
        // خطة بديلة (Fallback) إذا لم يجده بالبحث المزدوج
        const { error: teacherErrorFallback } = await adminSupabase
          .from('teachers')
          .update({ zoom_link: zoom_link || null })
          .eq('user_id', userId);
          
        if (teacherErrorFallback) {
          console.warn("Failed to update teacher zoom link fallback:", teacherErrorFallback);
        }
      }
    }

    return NextResponse.json({ success: true, message: "تم التحديث بنجاح" });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
