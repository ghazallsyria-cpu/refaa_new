import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveScheduleRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveScheduleRequestSchema);
    const { id, ...scheduleData } = validatedData;

    // 🚀 الخطوة الذهبية: تأمين جدول teacher_sections قبل إضافة الحصة
    // لتجنب رفض قاعدة البيانات (Foreign Key Conflict)
    if (scheduleData.teacher_id && scheduleData.section_id && scheduleData.subject_id) {
      const { data: existingAssignment } = await adminSupabase
        .from('teacher_sections')
        .select('id')
        .eq('teacher_id', scheduleData.teacher_id)
        .eq('section_id', scheduleData.section_id)
        .eq('subject_id', scheduleData.subject_id)
        .maybeSingle();

      // إذا لم يكن الإسناد موجوداً، نقوم بخلقه فوراً كخدمة إدارية خلف الكواليس
      if (!existingAssignment) {
        const { error: assignError } = await adminSupabase
          .from('teacher_sections')
          .insert({
            teacher_id: scheduleData.teacher_id,
            section_id: scheduleData.section_id,
            subject_id: scheduleData.subject_id
          });
        
        if (assignError) {
          console.warn("⚠️ لم نتمكن من التعيين التلقائي في teacher_sections:", assignError.message);
          // لا نوقف العملية، بل نستمر في المحاولة
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
        // فحص أخطاء التعارض الفريدة (Unique Constraints)
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
        // فحص أخطاء التعارض الفريدة
        if (error.code === '23505') {
           throw new Error('يوجد تعارض: المعلم أو الفصل لديه حصة أخرى في نفس التوقيت المختار.');
        }
        throw error;
      }
      return NextResponse.json(data);
    }

  } catch (error: unknown) {
    return handleApiError(error, 'Save Schedule');
  }
}
