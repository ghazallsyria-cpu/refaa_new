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
    if (tProfile) realTeacherId = tProfile.id;

    const payload = normalizePayload({
      ...examData,
      teacher_id: realTeacherId, // الحفظ بالمعرف الصحيح
    });

    let finalExamId = examData.id;

    // 2. الحفظ المباشر
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

    // 3. حفظ الفصول بدون تعقيد
    if (examData.section_ids && examData.section_ids.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = examData.section_ids.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      await adminSupabase.from('exam_sections').insert(sections);
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


