import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('مفاتيح السيرفر مفقودة');

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { examId, answers, score, status, userId } = await req.json();

    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    const validStatus = (status === 'graded' || status === 'completed') ? status : 'completed';

    const { data: currentQuestions } = await adminSupabase
      .from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

    // 🚀 إصلاح الخلل القاتل: بدلاً من maybeSingle (التي تنهار لو وجد محاولتين)، نطلب أحدث محاولة فقط!
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('id')
      .eq('exam_id', examId).eq('student_id', realStudentId).order('created_at', { ascending: false }).limit(1);

    const existing = attempts && attempts.length > 0 ? attempts[0] : null;

    let attemptId;
    if (existing) {
      attemptId = existing.id;
      await adminSupabase.from('exam_attempts').update({
        score: score || 0, status: validStatus, completed_at: new Date().toISOString(), questions_snapshot: currentQuestions
      }).eq('id', attemptId);
      
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId, student_id: realStudentId, score: score || 0, status: validStatus,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString(), questions_snapshot: currentQuestions
      }]).select('id').single();
      attemptId = newAtt?.id;
    }

    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        let finalOptionId = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (ans.optionId && typeof ans.optionId === 'string' && uuidRegex.test(ans.optionId)) finalOptionId = ans.optionId;

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: ans.text ? String(ans.text) : "لم يتم تسجيل إجابة",
          selected_option_id: finalOptionId,
          is_correct: Boolean(ans.isCorrect),
          points_earned: Number(ans.pointsEarned) || 0
        };
      });

      if (formattedAnswers.length > 0) await adminSupabase.from('student_answers').insert(formattedAnswers);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


