import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { attemptId, questionId, pointsEarned, examId, studentId } = await req.json();

    let activeAttemptId = attemptId;
    let realStudentId = studentId;

    // 1. تحديد الطالب بدقة
    if (studentId) {
       const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', studentId).maybeSingle();
       if (st) realStudentId = st.id;
    }

    // 2. السحر: إذا لم يرسل المتصفح رقم محاولة، نصنع واحدة بالقوة!
    if (!activeAttemptId && examId && realStudentId) {
       const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();
       if (existing) {
           activeAttemptId = existing.id;
       } else {
           const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{
               exam_id: examId,
               student_id: realStudentId,
               score: 0,
               status: 'graded',
               started_at: new Date().toISOString(),
               completed_at: new Date().toISOString()
           }]).select('id').single();
           
           if (insErr) throw new Error("فشل في تهيئة ملف النتيجة للطالب: " + insErr.message);
           activeAttemptId = newAtt.id;
       }
    }

    if (!activeAttemptId) throw new Error("تعذر تحديد المحاولة للحفظ.");

    // 3. حفظ الإجابة أو تحديثها
    const { data: checkAns } = await adminSupabase.from('student_answers').select('id').eq('attempt_id', activeAttemptId).eq('question_id', questionId).maybeSingle();

    if (checkAns) {
       await adminSupabase.from('student_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', checkAns.id);
    } else {
       await adminSupabase.from('student_answers').insert([{
         attempt_id: activeAttemptId,
         question_id: questionId,
         text_answer: 'تم التقييم من المعلم مباشرة',
         is_correct: pointsEarned > 0,
         points_earned: pointsEarned
       }]);
    }

    // 4. إعادة جمع درجات الطالب
    const { data: allAnswers } = await adminSupabase.from('student_answers').select('points_earned').eq('attempt_id', activeAttemptId);
    const newTotalScore = (allAnswers || []).reduce((sum, ans) => sum + (ans.points_earned || 0), 0);

    // 5. حفظ المجموع النهائي
    await adminSupabase.from('exam_attempts').update({ score: newTotalScore, status: 'graded' }).eq('id', activeAttemptId);

    return NextResponse.json({ success: true, newTotalScore });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


