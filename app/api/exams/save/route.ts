import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { normalizePayload } from '@/lib/utils';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examData, questions, isNew, userId } = body;

    let realTeacherId = userId;
    const { data: tProfile } = await adminSupabase.from('teachers').select('id').eq('user_id', userId).maybeSingle();
    if (tProfile) {
        realTeacherId = tProfile.id;
    } else {
        const { data: tProfile2 } = await adminSupabase.from('teachers').select('id').eq('id', userId).maybeSingle();
        if (tProfile2) realTeacherId = tProfile2.id;
    }

    const rawPayload = {
      ...examData,
      teacher_id: realTeacherId, 
    };

    const savedSectionIds = rawPayload.section_ids || [];
    delete rawPayload.section_ids;

    const payload = normalizePayload(rawPayload);
    let finalExamId = payload.id;

    if (isNew || !finalExamId) {
      const { data: newEx, error: insertErr } = await adminSupabase.from('exams').insert([payload]).select().single();
      if (insertErr) throw new Error('DB_INSERT_EXAM: ' + insertErr.message);
      finalExamId = newEx.id;
    } else {
      const { error: updateErr } = await adminSupabase.from('exams').update(payload).eq('id', finalExamId);
      if (updateErr) throw new Error('DB_UPDATE_EXAM: ' + updateErr.message);
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    if (savedSectionIds && savedSectionIds.length > 0) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
      const sections = savedSectionIds.map((sId: string) => ({ exam_id: finalExamId, section_id: sId }));
      await adminSupabase.from('exam_sections').insert(sections);
    }

    if (questions && questions.length > 0) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const { data: newQ, error: qErr } = await adminSupabase.from('questions').insert([{
          exam_id: finalExamId,
          type: q.type || 'open',
          content: q.content || '',
          media_url: q.mediaUrl || q.media_url || null, // ✅ تمت إضافة الصور هنا لكي لا تختفي!
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


