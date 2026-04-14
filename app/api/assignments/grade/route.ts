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

    // 1. تحديث الدرجة النهائية للتسليم العام
    const { error: subError } = await adminSupabase
      .from('assignment_submissions')
      .update({ grade, feedback, status: 'graded' })
      .eq('id', submissionId);
    
    if (subError) throw new Error('فشل تحديث درجة التسليم: ' + subError.message);

    // 2. تحديث درجات الأسئلة الفردية (السحر هنا)
    if (answersGrading && Array.isArray(answersGrading)) {
       for (const ans of answersGrading) {
         
         // البحث هل توجد إجابة مسجلة لهذا السؤال
         const { data: existingAns } = await adminSupabase
           .from('assignment_answers')
           .select('id')
           .eq('submission_id', submissionId)
           .eq('question_id', ans.questionId)
           .maybeSingle();

         if (existingAns) {
            // تحديث الإجابة الموجودة
            await adminSupabase
              .from('assignment_answers')
              .update({
                is_correct: ans.isCorrect,
                points_earned: ans.pointsEarned,
                feedback: ans.feedback
              })
              .eq('id', existingAns.id);
         } else {
            // إذا ترك الطالب السؤال فارغاً، ننشئ سجلاً لنحفظ تقييم المعلم (مثلاً خاطئ و 0)
            await adminSupabase
              .from('assignment_answers')
              .insert({
                submission_id: submissionId,
                question_id: ans.questionId,
                answer_text: 'لم يجب الطالب',
                is_correct: ans.isCorrect,
                points_earned: ans.pointsEarned,
                feedback: ans.feedback
              });
         }
       }
    }

    // 3. إرسال إشعار للطالب
    // 🚀 الإصلاح: studentId هو نفسه رقم المستخدم، لا حاجة للبحث عن user_id الوهمي!
    if (studentId) {
       const { error: notifError } = await adminSupabase.from('notifications').insert({
         user_id: studentId, // ✅ التصحيح المباشر والسريع هنا
         title: 'تم تقييم الواجب',
         content: `تم تقييم إجابتك في واجب: ${assignmentTitle}`,
         type: 'grade',
         link: '/assignments'
       });
       
       if(notifError) console.error("فشل إرسال الإشعار للطالب:", notifError);
    }

    return NextResponse.json({ success: true, message: 'تم حفظ التقييم بنجاح' });
  } catch (err: any) {
    console.error('Grade API Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
