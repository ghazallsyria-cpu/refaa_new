import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examId, answers, score, status, timeSpent, userId } = body;

    // 1. البحث عن الطالب بأمان
    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    // 2. إنشاء أو تحديث المحاولة (مع الخطة البديلة B لتجاوز عمود time_spent)
    let attemptId;
    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    const attemptPayload: any = {
        exam_id: examId,
        student_id: realStudentId,
        score: score || 0,
        status: status === 'completed' ? 'graded' : 'submitted',
        completed_at: new Date().toISOString(),
        time_spent: timeSpent || 0
    };

    if (existing) {
      attemptId = existing.id;
      const { error: updErr } = await adminSupabase.from('exam_attempts').update(attemptPayload).eq('id', attemptId);
      
      if (updErr) {
          // الخطة البديلة: إذا اعترضت القاعدة على عمود time_spent، نحذفه ونرسل بدونه
          delete attemptPayload.time_spent;
          const retry = await adminSupabase.from('exam_attempts').update(attemptPayload).eq('id', attemptId);
          if (retry.error) throw new Error('DB_UPDATE_ATTEMPT: ' + retry.error.message);
      }
      
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
      await adminSupabase.from('exam_answers').delete().eq('attempt_id', attemptId);
    } else {
      attemptPayload.started_at = new Date().toISOString();
      let { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([attemptPayload]).select('id').single();
      
      if (insErr) {
          // الخطة البديلة: إذا اعترضت القاعدة على عمود time_spent، نحذفه ونرسل بدونه
          delete attemptPayload.time_spent;
          const retry = await adminSupabase.from('exam_attempts').insert([attemptPayload]).select('id').single();
          if (retry.error) throw new Error('DB_INSERT_ATTEMPT: ' + retry.error.message);
          newAtt = retry.data;
      }
      attemptId = newAtt.id;
    }

    // 3. إدخال الإجابات بأقصى درجات الأمان
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        let txt = null;
        let optId = null;
        let isCorr = false;
        let pts = 0;

        if (typeof ans === 'string') {
          if (ans.length === 36 && ans.includes('-')) optId = ans;
          else txt = ans;
        } else if (typeof ans === 'object' && ans !== null) {
          txt = ans.text ? String(ans.text) : null;
          optId = (ans.optionId && typeof ans.optionId === 'string' && ans.optionId.trim() !== '') ? ans.optionId : null;
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

      // محاولة الحفظ في الجدول الأول
      const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
      
      // إذا فشل الجدول الأول، نحفظ في الجدول الثاني إجبارياً!
      if (ansErr) {
         console.warn("Table student_answers failed, trying exam_answers. Error:", ansErr);
         const fallbackAnswers = formattedAnswers.map(a => ({
             attempt_id: a.attempt_id,
             question_id: a.question_id,
             answer: a.selected_option_id || a.text_answer || "بدون إجابة",
             is_correct: a.is_correct,
             points_earned: a.points_earned
         }));
         const { error: fallErr } = await adminSupabase.from('exam_answers').insert(fallbackAnswers);
         // دمج رسائل الخطأ لكي تظهر لنا بالتفصيل إذا فشل كلاهما
         if (fallErr) throw new Error(`Ans1: ${ansErr.message} | Ans2: ${fallErr.message}`);
      }
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    // إعادة الخطأ الحقيقي الدقيق إلى الواجهة
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


