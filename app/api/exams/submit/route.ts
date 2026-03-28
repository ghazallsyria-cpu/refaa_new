import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SubmitExamRequestSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.record(z.any()), // answers is a map of questionId -> answer
});

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validatedData = SubmitExamRequestSchema.parse(body);
    const { attemptId, answers } = validatedData;

    // 1. Get the attempt and exam details
    const { data: attempt, error: attemptError } = await adminSupabase
      .from('exam_attempts')
      .select(`
        *,
        exam:exams (
          id,
          title,
          questions (
            id,
            type,
            correct_answer,
            points
          )
        )
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError || !attempt) {
      throw new Error('Attempt not found');
    }

    const typedAttempt = attempt as any; // Still need some casting for complex joins if not fully typed

    if (typedAttempt.status === 'completed' || typedAttempt.status === 'graded') {
      return NextResponse.json({ error: 'Exam already submitted' }, { status: 400 });
    }

    const questions = typedAttempt.exam.questions;
    let totalPoints = 0;
    let earnedPoints = 0;

    // 2. Grade the answers
    const gradedAnswers = questions.map((q: any) => {
      const studentAnswer = answers[q.id];
      const isCorrect = q.type === 'multiple_choice' 
        ? studentAnswer === q.correct_answer 
        : false; // Open questions need manual grading

      totalPoints += q.points || 0;
      if (isCorrect) {
        earnedPoints += q.points || 0;
      }

      return {
        attempt_id: attemptId,
        question_id: q.id,
        answer: studentAnswer,
        is_correct: isCorrect,
        points_earned: isCorrect ? q.points : 0
      };
    });

    // 3. Save graded answers
    const { error: answersError } = await adminSupabase
      .from('exam_answers')
      .upsert(gradedAnswers);

    if (answersError) throw answersError;

    // 4. Calculate final score
    const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    // 5. Update attempt status
    const { error: updateError } = await adminSupabase
      .from('exam_attempts')
      .update({
        status: questions.some((q: any) => q.type === 'open') ? 'completed' : 'graded',
        score: finalScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', attemptId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      score: finalScore,
      status: questions.some((q: any) => q.type === 'open') ? 'completed' : 'graded'
    });

  } catch (error: unknown) {
    console.error('Exam Submit Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
