import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { submissionId, grade, feedback, studentId, assignmentTitle, answersGrading } = await req.json();

    // 1. حفظ الدرجة الكلية والملاحظة العامة
    const { error } = await adminSupabase.from('assignment_submissions').update({
        grade: Number(grade) || 0,
        feedback: feedback || null,
        status: 'graded',
        graded_at: new Date().toISOString()
    }).eq('id', submissionId);

    if (error) throw new Error('فشل تقييم الواجب: ' + error.message);

    // 2. السحر: حفظ تقييم المعلم وملاحظاته لكل سؤال على حدة!
    if (answersGrading && Array.isArray(answersGrading)) {
        for (const ans of answersGrading) {
            await adminSupabase.from('assignment_answers')
              .update({
                  is_correct: ans.isCorrect,
                  points_earned: ans.pointsEarned,
                  feedback: ans.feedback || null
              })
              .eq('submission_id', submissionId)
              .eq('question_id', ans.questionId);
        }
    }

    // 3. إرسال الإشعار للطالب
    try {
      await adminSupabase.from('notifications').insert([{
        user_id: studentId,
        type: 'assignment',
        title: 'تم تقييم الواجب ومراجعته',
        content: `تم تقييم واجبك: ${assignmentTitle} وتمت إضافة ملاحظات على إجاباتك. حصلت على ${grade}`,
        link: `/assignments`, 
        is_read: false
      }]);
    } catch (e) {}

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
