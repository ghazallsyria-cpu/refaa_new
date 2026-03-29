import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { examId, answers, score, status, timeSpent, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'المستخدم غير مصرح له' }, { status: 401 });
    }

    if (!examId) {
      return NextResponse.json({ error: 'معرف الاختبار مفقود' }, { status: 400 });
    }

    // 1. التحقق من وجود محاولة سابقة
    const { data: attempts, error: existingError } = await adminSupabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', userId);

    if (existingError) throw new Error(`خطأ في التحقق من المحاولات: ${existingError.message}`);

    let attemptId;

    if (attempts && attempts.length > 0) {
      // 2. تحديث المحاولة الموجودة
      attemptId = attempts[0].id;
      const { error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .update({
          score: Number(score) || 0,
          status: status || 'completed',
          completed_at: new Date().toISOString(),
          time_spent: Number(timeSpent) || 0
        })
        .eq('id', attemptId);

      if (attemptError) throw new Error(`خطأ في تحديث المحاولة: ${attemptError.message}`);
      
      // مسح الإجابات القديمة لتسجيل الجديدة
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      // 3. إنشاء محاولة جديدة
      const { data: newAttempt, error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .insert([{
          exam_id: examId,
          student_id: userId,
          score: Number(score) || 0,
          status: status || 'completed',
          started_at: new Date().toISOString(), // يمكن تمرير started_at من الواجهة إذا أردت دقة أكبر
          completed_at: new Date().toISOString(),
          time_spent: Number(timeSpent) || 0
        }])
        .select()
        .single();

      if (attemptError) throw new Error(`خطأ في إنشاء المحاولة: ${attemptError.message}`);
      attemptId = newAttempt.id;
    }

    // 4. معالجة وتجهيز إجابات الطالب
    let studentAnswersPayload: any[] = [];
    
    if (answers && typeof answers === 'object') {
      studentAnswersPayload = Object.entries(answers).map(([questionId, answerData]: [string, any]) => ({
        attempt_id: attemptId,
        question_id: questionId,
        text_answer: answerData.text || null,
        selected_option_id: answerData.optionId || null,
        is_correct: answerData.isCorrect || false,
        points_earned: Number(answerData.pointsEarned) || 0
      }));
    }

    // 5. حفظ الإجابات في قاعدة البيانات
    if (studentAnswersPayload.length > 0) {
      const { error: answersError } = await adminSupabase.from('student_answers').insert(studentAnswersPayload);
      if (answersError) throw new Error(`خطأ في حفظ الإجابات: ${answersError.message}`);
    }

    // 6. إرسال إشعار للمعلم (بشكل صامت حتى لا يعطل الاستجابة للطالب)
    try {
      const { data: examInfo } = await adminSupabase
        .from('exams')
        .select('teacher_id, title')
        .eq('id', examId)
        .single();

      if (examInfo?.teacher_id) {
        await adminSupabase.from('notifications').insert([{
          user_id: examInfo.teacher_id,
          title: 'تسليم اختبار جديد 🎓',
          content: `قام أحد الطلاب للتو بتسليم الاختبار: ${examInfo.title}`,
          type: 'exam',
          link: `/exams/results/${examId}` // تم تصحيح الرابط ليوجه المعلم لصفحة النتائج الصحيحة
        }]);
      }
    } catch (notifErr) {
      console.warn('تجاهل خطأ الإشعارات لتجنب تعطيل تسليم الاختبار:', notifErr);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Exam Submit Full Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع أثناء تسليم الاختبار' }, { status: 500 });
  }
}

