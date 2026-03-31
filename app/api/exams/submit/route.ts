import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('MISSING_ENV_KEYS: مفاتيح السيرفر مفقودة');

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { examId, answers, score, status, userId } = await req.json();

    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    let attemptId;
    const validStatus = (status === 'graded' || status === 'completed') ? status : 'completed';

    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    if (existing) {
      attemptId = existing.id;
      const { error: updErr } = await adminSupabase.from('exam_attempts').update({
        score: score || 0, status: validStatus, completed_at: new Date().toISOString()
      }).eq('id', attemptId);
      if (updErr) throw new Error("DB_UPD_ATTEMPT_ERR: " + updErr.message);
      
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId, student_id: realStudentId, score: score || 0, status: validStatus,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString()
      }]).select('id').single();
      if (insErr) throw new Error("DB_INS_ATTEMPT_ERR: " + insErr.message);
      attemptId = newAtt.id;
    }

    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: ans?.text ? String(ans.text) : "",
          selected_option_id: (ans?.optionId && ans.optionId.length > 10) ? ans.optionId : null,
          is_correct: ans?.isCorrect || false,
          points_earned: ans?.pointsEarned || 0
        };
      });

      const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
      if (ansErr) throw new Error("DB_INS_ANS_ERR: " + ansErr.message);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


