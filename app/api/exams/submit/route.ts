import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examId, answers, score, status, userId } = body;

    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    let attemptId;
    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    if (existing) {
      attemptId = existing.id;
      await adminSupabase.from('exam_attempts').update({
        score: score || 0,
        status: status === 'completed' ? 'graded' : 'submitted',
        completed_at: new Date().toISOString()
      }).eq('id', attemptId);
      
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
      await adminSupabase.from('exam_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId,
        student_id: realStudentId,
        score: score || 0,
        status: status === 'completed' ? 'graded' : 'submitted',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }]).select('id').single();
      
      if (insErr) throw new Error('DB_INSERT_ATTEMPT: ' + insErr.message);
      attemptId = newAtt.id;
    }

    // ✅ نظام إدخال الإجابات الإجباري والآمن
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        let txt = "";
        let optId = null;
        let isCorr = false;
        let pts = 0;

        if (typeof ans === 'string') {
          if (ans.length === 36 && ans.includes('-')) optId = ans;
          else txt = ans;
        } else if (typeof ans === 'object' && ans !== null) {
          txt = ans.text || "";
          optId = (ans.optionId && ans.optionId.trim() !== '') ? ans.optionId : null;
          isCorr = ans.isCorrect || false;
          pts = ans.pointsEarned || 0;
        }

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: txt,
          selected_option_id: optId,
          is_correct: isCorr,
          points_earned: pts
        };
      });

      const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
      
      // إذا فشل الجدول الأول، نجبر الجدول الثاني على القبول
      if (ansErr) {
         console.warn("Table 1 failed, trying Table 2");
         const fallbackAnswers = formattedAnswers.map(a => ({
             attempt_id: a.attempt_id,
             question_id: a.question_id,
             answer: a.selected_option_id || a.text_answer || "بدون إجابة",
             is_correct: a.is_correct,
             points_earned: a.points_earned
         }));
         await adminSupabase.from('exam_answers').insert(fallbackAnswers);
      }
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


