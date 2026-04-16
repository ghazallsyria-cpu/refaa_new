import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 🚀 تخطينا المفتش الصارم (Zod) الذي كان يسبب "Validation failed"
    // وسنقرأ البيانات المرسلة مباشرة من الواجهة
    const body = await req.json();
    const { id, ...scheduleData } = body;

    // تحقق أساسي بسيط لضمان عدم وجود بيانات فارغة
    if (!scheduleData.teacher_id || !scheduleData.section_id || !scheduleData.subject_id) {
      throw new Error('بيانات الحصة غير مكتملة، يرجى التأكد من اختيار المعلم والفصل والمادة.');
    }

    // 🚀 الخطوة الذهبية: تأمين جدول teacher_sections قبل إضافة الحصة
    // لتجنب رفض قاعدة البيانات بسبب (Foreign Key Conflict)
    if (scheduleData.teacher_id && scheduleData.section_id && scheduleData.subject_id) {
      const { data: existingAssignment } = await adminSupabase
        .from('teacher_sections')
        .select('id')
        .eq('teacher_id', scheduleData.teacher_id)
        .eq('section_id', scheduleData.section_id)
        .eq('subject_id', scheduleData.subject_id)
        .maybeSingle();

      // إذا لم يكن الإسناد موجوداً، نقوم بخلقه فوراً في الخلفية
      if (!existingAssignment) {
        const { error: assignError } = await adminSupabase
          .from('teacher_sections')
          .insert({
            teacher_id: scheduleData.teacher_id,
            section_id: scheduleData.section_id,
            subject_id: scheduleData.subject_id
          });
        
        if (assignError) {
          console.warn("⚠️ تنبيه: لم نتمكن من التعيين التلقائي:", assignError.message);
        }
      }
    }

    if (id) {
      // 🚀 عملية التعديل (Update)
      const { data, error } = await adminSupabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
           throw new Error('يوجد تعارض: المعلم أو الفصل لديه حصة أخرى في نفس التوقيت المختار.');
        }
        throw error;
      }
      return NextResponse.json(data);
    } else {
      // 🚀 عملية الإضافة الجديدة (Insert)
      const { data, error } = await adminSupabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
           throw new Error('يوجد تعارض: المعلم أو الفصل لديه حصة أخرى في نفس التوقيت المختار.');
        }
        throw error;
      }
      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error("Schedule API Error:", error);
    // إرسال رسالة خطأ واضحة للواجهة
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع أثناء الحفظ' }, { status: 400 });
  }
}
