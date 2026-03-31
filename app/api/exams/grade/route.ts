import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('MISSING_ENV_KEYS: مفاتيح السيرفر مفقودة');

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { attemptId, questionId, pointsEarned, examId, studentId } = await req.json();

    let activeAttemptId = attemptId;

    // 1. إذا لم يكن هناك محاولة، نقوم بإنشاء واحدة
    if (!activeAttemptId && examId && studentId) {
       let realStudentId = studentId;
       const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', studentId).maybeSingle();
       if (st) realStudentId = st.id;

       const { data: existing, error: existErr } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();
       if (existErr && existErr.code !== 'PGRST116') throw new Error("DB_EXIST_ERR: " + existErr.message);

       if (existing) {
           activeAttemptId = existing.id;
       } else {
           const { data: newAtt, error: insAttErr } = await adminSupabase.from('exam_attempts').insert([{
               exam_id: examId,
               student_id: realStudentId,
               score: 0,
               status: 'graded',
               started_at: new Date().toISOString(),
               completed_at: new Date().toISOString()
           }]).select('id').single();
           
           if (insAttErr) throw new Error("DB_INS_ATTEMPT_ERR: " + insAttErr.message);
           activeAttemptId = newAtt.id;
       }
    }

    if (!activeAttemptId) throw new Error('لا يمكن تحديد رقم المحاولة للطالب');

    // 2. تحديث أو إدخال إجابة الطالب
    const { data: checkAns, error: checkAnsErr } = await adminSupabase.from('student_answers').select('id').eq('attempt_id', activeAttemptId).eq('question_id', questionId).maybeSingle();
    if (checkAnsErr && checkAnsErr.code !== 'PGRST116') throw new Error("DB_CHECK_ANS_ERR: " + checkAnsErr.message);

    if (checkAns) {
       const { error: updErr } = await adminSupabase.from('student_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', checkAns.id);
       if (updErr) throw new Error("DB_UPD_ANS_ERR: " + updErr.message);
    } else {
       const { error: insAnsErr } = await adminSupabase.from('student_answers').insert([{ 
         attempt_id: activeAttemptId, 
         question_id: questionId, 
         text_answer: 'تقييم المعلم (يدوي)', 
         is_correct: pointsEarned > 0, 
         points_earned: pointsEarned 
       }]);
       if (insAnsErr) throw new Error("DB_INS_ANS_ERR: " + insAnsErr.message);
    }

    // 3. إعادة جمع الدرجات
    const { data: allAnswers, error: allAnsErr } = await adminSupabase.from('student_answers').select('points_earned').eq('attempt_id', activeAttemptId);
    if (allAnsErr) throw new Error("DB_ALL_ANS_ERR: " + allAnsErr.message);
    
    let newTotalScore = 0;
    if (allAnswers) {
      newTotalScore = allAnswers.reduce((sum, ans) => sum + (ans.points_earned || 0), 0);
    }

    // 4. تحديث النتيجة النهائية
    const { error: finalErr } = await adminSupabase.from('exam_attempts').update({ score: newTotalScore, status: 'graded' }).eq('id', activeAttemptId);
    if (finalErr) throw new Error("DB_FINAL_UPD_ERR: " + finalErr.message);

    return NextResponse.json({ success: true, newTotalScore });

  } catch (error: any) {
    console.error('Grading API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


