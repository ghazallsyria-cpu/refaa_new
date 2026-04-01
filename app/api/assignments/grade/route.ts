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

    if (!submissionId) {
      return NextResponse.json({ error: "معرف التسليم مفقود" }, { status: 400 });
    }

    // 1. تحديث حالة الواجب والدرجة الكلية (بحماية مزدوجة ضد أي خلل في الجداول)
    const { error: updateError } = await adminSupabase.from('assignment_submissions').update({
        grade: Number(grade) || 0,
        feedback: feedback || null,
        status: 'graded',
        graded_at: new Date().toISOString()
    }).eq('id', submissionId);

    // إذا فشل التحديث (بسبب تريجر أو غياب حقل الوقت)، نمرر الحفظ كخطة بديلة (Fallback)
    if (updateError) {
      const { error: retryError } = await adminSupabase.from('assignment_submissions').update({
          grade: Number(grade) || 0,
          feedback: feedback || null,
          status: 'graded'
      }).eq('id', submissionId);
      
      if (retryError) throw new Error('فشل التقييم الكلي للواجب: ' + retryError.message);
    }

    // 2. حفظ تفاصيل التقييم والملاحظات لكل سؤال بدقة تامة
    if (answersGrading && Array.isArray(answersGrading) && answersGrading.length > 0) {
        for (const ans of answersGrading) {
            if (!ans.questionId) continue;
            
            // البحث عن إجابة الطالب لهذا السؤال
            const { data: existingAns } = await adminSupabase.from('assignment_answers')
                .select('id')
                .eq('submission_id', submissionId)
                .eq('question_id', ans.questionId)
                .maybeSingle();

            if (existingAns) {
                // تحديث الإجابة الموجودة بالدرجات والملاحظات
                await adminSupabase.from('assignment_answers')
                  .update({
                      is_correct: Boolean(ans.isCorrect),
                      points_earned: Number(ans.pointsEarned) || 0,
                      feedback: ans.feedback || null
                  })
                  .eq('id', existingAns.id);
            } else {
                // في حال عدم إرسال الطالب إجابة لهذا السؤال، نقوم بإنشاء سجل ليحفظ درجة المعلم
                await adminSupabase.from('assignment_answers')
                  .insert({
                      submission_id: submissionId,
                      question_id: ans.questionId,
                      is_correct: Boolean(ans.isCorrect),
                      points_earned: Number(ans.pointsEarned) || 0,
                      feedback: ans.feedback || null,
                      answer_text: 'تم التقييم يدوياً من المعلم'
                  });
            }
        }
    }

    // 3. إرسال إشعار فوري للطالب بالنتيجة
    if (studentId) {
      try {
        await adminSupabase.from('notifications').insert([{
          user_id: studentId,
          type: 'assignment',
          title: 'تم تقييم الواجب 📝',
          content: `تم تقييم واجبك: ${assignmentTitle || 'الواجب'}. الدرجة المكتسبة: ${grade}`,
          link: `/assignments`, 
          is_read: false
        }]);
      } catch (e) {
        console.warn("Failed to send notification:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Grading Assignment Error:", error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير معروف في السيرفر' }, { status: 500 });
  }
}
