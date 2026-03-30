import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { examId, answers, score, status, timeSpent, userId } = await req.json();
    console.log('Submitting exam:', { examId, score, status, userId });

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Check if attempt exists
    const { data: attempts, error: existingError } = await adminSupabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', userId);

    if (existingError) {
      console.error('Error checking existing attempt:', existingError);
      throw existingError;
    }

    let attemptId;

    if (attempts && attempts.length > 0) {
      // Update existing attempt
      attemptId = attempts[0].id;
      console.log('Updating existing attempt:', attemptId);
      const { error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .update({
          score,
          status,
          completed_at: new Date().toISOString(),
          time_spent: timeSpent
        })
        .eq('id', attemptId);

      if (attemptError) {
        console.error('Error updating attempt:', attemptError);
        throw attemptError;
      }
      
      // Delete old answers
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      // Create new attempt
      console.log('Creating new attempt for exam:', examId);
      const { data: newAttempt, error: attemptError } = await adminSupabase
        .from('exam_attempts')
        .insert([{
          exam_id: examId,
          student_id: userId,
          score,
          status,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          time_spent: timeSpent
        }])
        .select()
        .single();

      if (attemptError) {
        console.error('Error creating attempt:', attemptError);
        throw attemptError;
      }
      attemptId = newAttempt.id;
    }

    // Save answers
    const studentAnswersPayload = Object.entries(answers).map(([questionId, answerData]: [string, any]) => ({
      attempt_id: attemptId,
      question_id: questionId,
      text_answer: answerData.text || null,
      selected_option_id: (answerData.optionId && answerData.optionId !== '') ? answerData.optionId : null,
      is_correct: answerData.isCorrect || false,
      points_earned: answerData.pointsEarned || 0
    }));

    if (studentAnswersPayload.length > 0) {
      console.log('Saving student answers, count:', studentAnswersPayload.length);
      const { error: answersError } = await adminSupabase.from('student_answers').insert(studentAnswersPayload);
      if (answersError) {
        console.error('Error saving student answers:', answersError);
        throw answersError;
      }
    }

    // Send notification to teacher
    const { data: examInfo } = await adminSupabase
      .from('exams')
      .select('teacher_id, title')
      .eq('id', examId)
      .single();

    if (examInfo?.teacher_id) {
      await adminSupabase.from('notifications').insert([{
        user_id: examInfo.teacher_id,
        title: 'تسليم اختبار جديد',
        content: `قام طالب بتسليم اختبار: ${examInfo.title}`,
        type: 'exam',
        link: `/exams/submissions/${examId}`
      }]);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Exam Submit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
