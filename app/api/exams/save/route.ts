import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizePayload } from '@/lib/utils';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examData, questions, isNew, userId } = body;

    // 1. تحديد المعلم بقوة (استخدام أي معرف متاح لمنع ضياع الاختبار)
    let realTeacherId = userId;
    const { data: tProfile } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
    if (tProfile) {
        realTeacherId = tProfile.id;
    } else {
        const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
        if (tProfile2) realTeacherId = tProfile2.id;
    }

    // تجهيز بيانات الاختبار
    const rawPayload = {
      ...examData,
      teacher_id: realTeacherId, 
    };

    // ✅ الإصلاح الجذري: استخراج الفصول ثم حذفها من بيانات الاختبار حتى لا تنهار قاعدة البيانات!
    const savedSectionIds = rawPayload.section_ids || [];
    delete rawPayload.section_ids;

    const payload = normalizePayload(rawPayload);

    let finalExamId = payload.id;

    // 2. الحفظ المباشر في جدول الاختبارات
    if (isNew || !finalExamId) {
      const { data: newEx, error: insertErr } = await adminSupabase.from('exams').insert([payload]).select().single();
      if (insertErr) throw new Error('DB_INSERT_EXAM: ' + insertErr.message);
      finalExamId = newEx.id;
    } else {
      const { error: updateErr } = await adminSupabase.from('exams').update(payload).eq('id', finalExamId);
      if (updateErr) throw new Error('DB_UPDATE_EXAM: ' + updateErr.message);
      
      // تنظيف الأسئلة القديمة للتحديث
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    // 3. حفظ الفصول في الجدول المخصص لها (exam_sections)
    if (savedSectionIds && savedSectionIds.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = savedSectionIds.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      const { error: sectionsErr } = await adminSupabase.from('exam_sections').insert(sections);
      if (sectionsErr) throw new Error('DB_INSERT_SECTIONS: ' + sectionsErr.message);
    }

    // 4. حفظ الأسئلة
    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: newQ, error: qErr } = await adminSupabase.from('questions').insert([{
          exam_id: finalExamId,
          type: q.type || 'open',
          content: q.content || '',
          points: q.points || 1,
          order_index: i
        }]).select().single();

        if (!qErr && newQ && q.options?.length > 0) {
          const opts = q.options.map((opt: any, idx: number) => ({
            question_id: newQ.id,
            content: opt.content || '',
            is_correct: opt.is_correct || false,
            order_index: idx
          }));
          await adminSupabase.from('question_options').insert(opts);
        }
      }
    }

    return NextResponse.json({ success: true, examId: finalExamId });
  } catch (error: any) {
    console.error('Save Exam Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


