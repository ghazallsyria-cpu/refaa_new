import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔴 حساب الدرجة في الخادم - حذفنا استقبال الدرجة من المتصفح
    const { examId, studentId, answers, timeTaken } = await req.json();

    if (!examId || !studentId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. جلب الأسئلة الصحيحة من قاعدة البيانات لحساب الدرجة
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, correct_answer, points')
      .eq('exam_id', examId);

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch questions for grading' }, { status: 500 });
    }

    // 2. حساب الدرجة (Server-Side Grading)
    let computedScore = 0;
    
    // answers is expected to be an object: { question_id: "selected_option" }
    for (const question of questions) {
      const studentAnswer = answers[question.id];
      if (studentAnswer && studentAnswer === question.correct_answer) {
        computedScore += question.points || 1; // نفترض نقطة واحدة إذا لم تكن محددة
      }
    }

    // 3. حفظ المحاولة في قاعدة البيانات بالدرجة المحسوبة بشكل آمن
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        student_id: studentId,
        score: computedScore, // 🟢 نستخدم الدرجة المحسوبة في الخادم
        time_taken: timeTaken,
        status: 'completed'
        // تمت إزالة questions_snapshot بناء على توصية الأداء في التقرير لمنع تضخم البيانات
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // حفظ إجابات الطالب
    const answerInserts = Object.entries(answers).map(([questionId, selectedOption]) => ({
      attempt_id: attempt.id,
      question_id: questionId,
      selected_option: selectedOption,
      is_correct: questions.find(q => q.id === questionId)?.correct_answer === selectedOption
    }));

    const { error: answersInsertError } = await supabase
      .from('student_answers')
      .insert(answerInserts);

    if (answersInsertError) throw answersInsertError;

    return NextResponse.json({ 
      success: true, 
      attemptId: attempt.id,
      score: computedScore 
    });

  } catch (error) {
    console.error('Exam submission error:', error);
    return NextResponse.json(
      { error: 'Failed to submit exam' },
      { status: 500 }
    );
  }
}
