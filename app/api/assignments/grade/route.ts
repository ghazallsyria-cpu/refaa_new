import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );

    const { submissionId, grade, feedback, studentId, assignmentTitle, answersGrading } = await req.json();

    // 1. تحديث الدرجة النهائية للتسليم (ما تراه في صفحة الطالب الرئيسية)
    const { error: subError } = await adminSupabase
      .from('assignment_submissions')
      .update({ grade, feedback, status: 'graded' })
      .eq('id', submissionId);
    
    if (subError) throw new Error('فشل تحديث درجة التسليم: ' + subError.message);

    // 2. 🚀 السحر هنا: تحديث حالة كل سؤال (هل هو صحيح؟ وكم درجته؟) لكي تظهر للطالب!
    if (answersGrading && Array.isArray(answersGrading)) {
       for (const ans of answersGrading) {
         await adminSupabase
           .from('assignment_answers')
           .update({
             is_correct: ans.isCorrect,
             points_earned: ans.pointsEarned,
             feedback: ans.feedback
           })
           .eq('submission_id', submissionId)
           .eq('question_id', ans.questionId);
       }
    }

    // 3. إرسال إشعار للطالب بأنه تم تقييم واجبه
    if (studentId) {
        const { data: stUser } = await adminSupabase.from('students').select('user_id').eq('id', studentId).maybeSingle();
        if (stUser?.user_id) {
           await adminSupabase.from('notifications').insert({
             user_id: stUser.user_id,
             title: 'تم تقييم الواجب',
             content: `تم تقييم إجابتك في واجب: ${assignmentTitle}`,
             type: 'grade',
             link: '/assignments'
           });
        }
    }

    return NextResponse.json({ success: true, message: 'تم حفظ التقييم بنجاح' });
  } catch (err: any) {
    console.error('Grade API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
