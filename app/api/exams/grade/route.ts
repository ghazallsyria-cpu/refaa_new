import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { attemptId, questionId, pointsEarned } = await req.json();

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // 1. تحديث درجة السؤال في جدول الإجابات (وتحديث أنه تم تصحيحه)
    const { error: updateAnsErr } = await adminSupabase
      .from('student_answers')
      .update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 })
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId);

    if (updateAnsErr) throw new Error('فشل تحديث درجة السؤال: ' + updateAnsErr.message);

    // 2. تحديث الخطة البديلة (exam_answers) إن وجدت
    await adminSupabase
      .from('exam_answers')
      .update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 })
      .eq('attempt_id', attemptId)
      .eq('question_id', questionId);

    // 3. الخوارزمية الذكية: جلب كل الإجابات لهذه المحاولة لجمع النتيجة النهائية الجديدة
    const { data: allAnswers } = await adminSupabase
      .from('student_answers')
      .select('points_earned')
      .eq('attempt_id', attemptId);

    let newTotalScore = 0;
    if (allAnswers) {
      newTotalScore = allAnswers.reduce((sum, ans) => sum + (ans.points_earned || 0), 0);
    }

    // 4. تحديث النتيجة النهائية في جدول المحاولات وتحويل الحالة إلى (تم التقييم)
    const { error: attemptErr } = await adminSupabase
      .from('exam_attempts')
      .update({ 
        score: newTotalScore, 
        status: 'graded' // تحويل الحالة لتم التقييم
      })
      .eq('id', attemptId);

    if (attemptErr) throw new Error('فشل تحديث النتيجة النهائية: ' + attemptErr.message);

    return NextResponse.json({ success: true, newTotalScore });

  } catch (error: any) {
    console.error('Grading API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

