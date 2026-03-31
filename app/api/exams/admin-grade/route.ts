import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { attemptId, questionId, pointsEarned } = await req.json();

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // تحديث أو إضافة درجة السؤال
    const { data: existingAns } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attemptId).eq('question_id', questionId).maybeSingle();

    if (existingAns) {
        await adminSupabase.from('student_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', existingAns.id);
    } else {
        await adminSupabase.from('student_answers').insert({ attempt_id: attemptId, question_id: questionId, points_earned: pointsEarned, is_correct: pointsEarned > 0, text_answer: 'تقييم يدوي' });
    }

    // إعادة حساب المجموع الكلي
    const { data: allAns } = await adminSupabase.from('student_answers').select('points_earned').eq('attempt_id', attemptId);
    const newTotal = (allAns || []).reduce((sum, a) => sum + (Number(a.points_earned) || 0), 0);
    
    await adminSupabase.from('exam_attempts').update({ score: newTotal, status: 'graded' }).eq('id', attemptId);

    return NextResponse.json({ success: true, newTotal });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

