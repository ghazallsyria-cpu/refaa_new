import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    let { attemptId, questionId, pointsEarned, examId, studentId } = await req.json();

    // إذا لم تكن هناك محاولة، نصنع واحدة
    if (!attemptId) {
         const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', studentId).maybeSingle();
         const realStudentId = st ? st.id : studentId;
         const { data: newAtt } = await adminSupabase.from('exam_attempts').insert([{
             exam_id: examId, student_id: realStudentId, score: 0, status: 'graded'
         }]).select('id').single();
         attemptId = newAtt?.id;
    }

    if (!attemptId) throw new Error("تعذر إيجاد أو إنشاء محاولة للطالب.");

    // تعديل أو إضافة الإجابة
    const { data: existing } = await adminSupabase.from('student_answers').select('id').eq('attempt_id', attemptId).eq('question_id', questionId).maybeSingle();
    
    if (existing) {
        await adminSupabase.from('student_answers').update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 }).eq('id', existing.id);
    } else {
        await adminSupabase.from('student_answers').insert({ attempt_id: attemptId, question_id: questionId, points_earned: pointsEarned, is_correct: pointsEarned > 0, text_answer: 'تقييم يدوي' });
    }

    // إعادة جمع الدرجة الكلية وتحديثها
    const { data: allAnswers } = await adminSupabase.from('student_answers').select('points_earned').eq('attempt_id', attemptId);
    const total = (allAnswers || []).reduce((sum, a) => sum + (Number(a.points_earned) || 0), 0);

    await adminSupabase.from('exam_attempts').update({ score: total, status: 'graded' }).eq('id', attemptId);

    return NextResponse.json({ success: true, total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

