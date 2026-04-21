import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { teacherId, updateData, newEmail, hodData } = await req.json();

    // 1. تحديث جدول المستخدمين الأساسي
    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name: updateData.full_name,
        email: newEmail,
        phone: updateData.phone
      })
      .eq('id', teacherId);

    if (userError) throw userError;

    // 2. تحديث جدول المعلمين (بما فيه القسم والتخصص)
    const { error: teacherError } = await adminSupabase
      .from('teachers')
      .update({
        national_id: updateData.national_id,
        specialization: updateData.specialization,
        zoom_link: updateData.zoom_link,
        department_id: updateData.department_id || null,
        custom_titles: updateData.custom_titles || []
      })
      .eq('id', teacherId);

    if (teacherError) throw teacherError;

    // 3. تحديث صلاحيات رئيس القسم إن وجدت
    if (hodData !== undefined) {
      // إزالة الإشراف القديم
      await adminSupabase.from('department_heads').delete().eq('teacher_id', teacherId);
      
      // إضافة الإشراف الجديد
      if (hodData.isHead && hodData.subject_id) {
        await adminSupabase.from('department_heads').insert({
          teacher_id: teacherId,
          subject_id: hodData.subject_id,
          stage_name: hodData.stage_name || 'الكل'
        });

        // اعتماد المعلم كرئيس فعلي للقسم في جدول الأقسام
        if (updateData.department_id) {
          await adminSupabase.from('academic_departments').update({ head_id: teacherId }).eq('id', updateData.department_id);
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Teacher Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
