import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { examId, studentId, answers, timeTaken } = await req.json();

    if (!examId || !studentId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. جلب الأسئلة مع خياراتها لمعرفة الإجابة الصحيحة
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, points, type, question_options(id, is_correct, content)')
      .eq('exam_id', examId);

    if (questionsError || !questions) {
      console.error("Fetch Questions Error:", questionsError);
      return NextResponse.json({ error: 'Failed to fetch questions for grading' }, { status: 500 });
    }

    // 2. حساب الدرجة وتجهيز الإجابات للحفظ
    let computedScore = 0;
    const answerDataToSave: any[] = [];

    for (const question of questions) {
      const studentAnswer = answers[question.id]; // إجابة الطالب (قد تكون ID الخيار، أو نص)
      let isCorrect = false;

      // التحقق من الإجابة للأسئلة الموضوعية فقط (اختياري، صح/خطأ)
      if (['multiple_choice', 'true_false', 'multi_select'].includes(question.type)) {
        const correctOption = question.question_options?.find((opt: any) => opt.is_correct);
        
        // نتحقق مما إذا كانت إجابة الطالب تطابق ID الخيار الصحيح أو نصه
        if (correctOption && (studentAnswer === correctOption.id || studentAnswer === correctOption.content)) {
          isCorrect = true;
          computedScore += question.points || 1;
        }
      }

      answerDataToSave.push({
        question_id: question.id,
        selected_option: studentAnswer ? String(studentAnswer) : null,
        is_correct: isCorrect
      });
    }

    // 3. حفظ المحاولة في قاعدة البيانات بالدرجة المحسوبة بشكل آمن
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        score: computedScore,
        time_taken: timeTaken,
        status: 'completed'
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // 4. حفظ إجابات الطالب بعد ربطها برقم المحاولة
    const finalAnswerInserts = answerDataToSave.map(ans => ({
      attempt_id: attempt.id,
      ...ans
    }));

    if (finalAnswerInserts.length > 0) {
      const { error: answersInsertError } = await supabase
        .from('student_answers')
        .insert(finalAnswerInserts);

      if (answersInsertError) throw answersInsertError;
    }

    return NextResponse.json({ 
      success: true, 
      attemptId: attempt.id,
      score: computedScore 
    });

  } catch (error: any) {
    console.error('Exam submission error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
