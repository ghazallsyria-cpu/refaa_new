import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { attemptId, questionId, pointsEarned, examId, studentId } = await req.json();

    let activeAttemptId = attemptId;

    // 🌟 السحر هنا: إذا لم نجد رقم محاولة، سنقوم بإنشائها فوراً لكي يحفظ المعلم الدرجة!
    if (!activeAttemptId && examId && studentId) {
       let realStudentId = studentId;
       const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', studentId).maybeSingle();
       if (st) realStudentId = st.id;

       const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();
       
       if (existing) {
           activeAttemptId = existing.id;
       } else {
           // إنشاء محاولة جديدة فارغة بالقوة لكي نربط الدرجة بها
           const { data: newAtt } = await adminSupabase.from('exam_attempts').insert([{
               exam_id: examId,
               student_id: realStudentId,
               score: 0,
               status: 'graded',
               started_at: new Date().toISOString(),
               completed_at: new Date().toISOString()
           }]).select('id').single();
           if (newAtt) activeAttemptId = newAtt.id;
       }
    }

    if (!activeAttemptId) {
      return NextResponse.json({ error: 'لم نتمكن من تحديد هوية الطالب في قاعدة البيانات.' }, { status: 400 });
    }

    // 1. تحديث أو إدخال إجابة الطالب
    const { data: checkAns } = await adminSupabase.from('student_answers').select('id').eq('attempt_id', activeAttemptId).eq('question_id', questionId).maybeSingle();

    if (checkAns) {
       await adminSupabase.from('student_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', checkAns.id);
    } else {
       await adminSupabase.from('student_answers').insert([{ 
         attempt_id: activeAttemptId, 
         question_id: questionId, 
         text_answer: 'تم التقييم من المعلم', 
         is_correct: pointsEarned > 0, 
         points_earned: pointsEarned 
       }]);
    }

    // 2. تحديث جدول الإجابات البديل إن وجد
    const { data: checkAnsExam } = await adminSupabase.from('exam_answers').select('id').eq('attempt_id', activeAttemptId).eq('question_id', questionId).maybeSingle();
    if (checkAnsExam) {
       await adminSupabase.from('exam_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', checkAnsExam.id);
    }

    // 3. الخوارزمية الذكية: إعادة جمع درجات كل الأسئلة لهذا الطالب
    const { data: allAnswers } = await adminSupabase.from('student_answers').select('points_earned').eq('attempt_id', activeAttemptId);
    let newTotalScore = 0;
    if (allAnswers) {
      newTotalScore = allAnswers.reduce((sum, ans) => sum + (ans.points_earned || 0), 0);
    }

    // 4. تحديث النتيجة النهائية وإغلاق المحاولة
    await adminSupabase.from('exam_attempts').update({ score: newTotalScore, status: 'graded' }).eq('id', activeAttemptId);

    return NextResponse.json({ success: true, newTotalScore });

  } catch (error: any) {
    console.error('Grading API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


