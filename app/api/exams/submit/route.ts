import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { examId, answers, score, status, userId } = await req.json();

    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    const validStatus = (status === 'graded' || status === 'completed') ? status : 'completed';

    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    let attemptId;
    if (existing) {
      attemptId = existing.id;
      await adminSupabase.from('exam_attempts').update({ score: score || 0, status: validStatus, completed_at: new Date().toISOString() }).eq('id', attemptId);
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId, student_id: realStudentId, score: score || 0, status: validStatus,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString()
      }]).select('id').single();
      attemptId = newAtt?.id;
    }

    // 🚀 السحر الثاني: حفظ الإجابة كنص كخيار أول لتجنب أي تعارض في نوع البيانات في قاعدة بياناتك
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        
        // التحقق من أن ID الخيار هو UUID صالح قبل إرساله لقاعدة البيانات
        let finalOptionId = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (ans.optionId && typeof ans.optionId === 'string' && uuidRegex.test(ans.optionId)) {
            finalOptionId = ans.optionId;
        }

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: ans.text ? String(ans.text) : "لم يتم تسجيل إجابة",
          selected_option_id: finalOptionId,
          is_correct: Boolean(ans.isCorrect),
          points_earned: Number(ans.pointsEarned) || 0
        };
      });

      if (formattedAnswers.length > 0) {
          await adminSupabase.from('student_answers').insert(formattedAnswers);
      }
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


