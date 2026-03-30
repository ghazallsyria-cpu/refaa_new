import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { examId, answers, score, status, timeSpent, userId } = body;

    console.log('Submitting exam:', { examId, score, status, userId });

    if (!examId || !userId) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // ✅ 1. بحث متسلسل وآمن عن ملف الطالب (لمنع خطأ قاعدة البيانات 500)
    let realStudentId = userId;
    const { data: s1 } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (s1) {
      realStudentId = s1.id;
    } else {
      const { data: s2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (s2) {
        realStudentId = s2.id;
      }
    }

    // 2. التحقق من وجود محاولة سابقة
    const { data: attempts, error: existingError } = await adminSupabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', realStudentId);

    if (existingError) throw existingError;

    let attemptId;

    if (attempts && attempts.length > 0) {
      // تحديث المحاولة السابقة
      attemptId = attempts[0].id;
      const { error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .update({
          score: score || 0,
          status: status === 'completed' ? 'graded' : status,
          completed_at: new Date().toISOString(),
          time_spent: timeSpent || 0
        })
        .eq('id', attemptId);

      if (attemptError) throw attemptError;
      
      // مسح الإجابات القديمة لتحديثها
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      // إنشاء محاولة جديدة
      const { data: newAttempt, error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .insert([{
          exam_id: examId,
          student_id: realStudentId, // الحفظ بالمعرف الصحيح الآمن
          score: score || 0,
          status: status === 'completed' ? 'graded' : status,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          time_spent: timeSpent || 0
        }])
        .select()
        .single();

      if (attemptError) throw attemptError;
      attemptId = newAttempt.id;
    }

    // ✅ 3. حفظ إجابات الطالب بطريقة فائقة الأمان (تقبل أي نوع بيانات)
    if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
      const studentAnswersPayload = Object.entries(answers).map(([questionId, answerData]: [string, any]) => {
        let textAnswer = null;
        let selectedOptionId = null;
        let isCorrect = false;
        let pointsEarned = 0;

        // معالجة ذكية للإجابات سواء كانت نصاً أو كائناً
        if (typeof answerData === 'string') {
          textAnswer = answerData;
        } else if (typeof answerData === 'object' && answerData !== null) {
          textAnswer = answerData.text || null;
          selectedOptionId = (answerData.optionId && answerData.optionId !== '') ? answerData.optionId : null;
          isCorrect = answerData.isCorrect || false;
          pointsEarned = answerData.pointsEarned || 0;
        }

        return {
          attempt_id: attemptId,
          question_id: questionId,
          text_answer: textAnswer,
          selected_option_id: selectedOptionId,
          is_correct: isCorrect,
          points_earned: pointsEarned
        };
      });

      const { error: answersError } = await adminSupabase.from('student_answers').insert(studentAnswersPayload);
      if (answersError) {
        console.error('Error saving student answers:', answersError);
        throw answersError;
      }
    }

    // 4. إرسال إشعار للمعلم (بشكل آمن لا يعطل التسليم إذا فشل)
    try {
      const { data: examInfo } = await adminSupabase
        .from('exams')
        .select('teacher_id, title')
        .eq('id', examId)
        .single();

      if (examInfo?.teacher_id) {
        // جلب المعرف المناسب للإشعار
        const { data: teacherUser } = await adminSupabase
           .from('teachers')
           .select('user_id, id')
           .eq('id', examInfo.teacher_id)
           .maybeSingle();
           
        const targetTeacherId = teacherUser?.user_id || teacherUser?.id || examInfo.teacher_id;
           
        if (targetTeacherId) {
           await adminSupabase.from('notifications').insert([{
             user_id: targetTeacherId,
             title: 'تسليم اختبار جديد',
             content: `قام طالب بتسليم اختبار: ${examInfo.title}`,
             type: 'exam',
             link: `/exams/results/${examId}`
           }]);
        }
      }
    } catch (notifError) {
      console.warn('Failed to send notification to teacher, ignoring...', notifError);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Exam Submit Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء حفظ الاختبار' }, { status: 500 });
  }
}


