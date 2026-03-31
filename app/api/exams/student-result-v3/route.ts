import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    if (!examId || !studentId) {
      return NextResponse.json({ success: false, error: 'missing params' }, { status: 400 });
    }

    // exam
    const { data: exam } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    // attempt (أهم نقطة)
    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // answers (تعتمد كليًا على attempt)
    const { data: answers } = await supabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attempt?.id ?? 'none');

    // questions
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index');

    const safeQuestions = questions ?? [];

    const qIds = safeQuestions.map(q => q.id);

    // options
    const { data: options } = qIds.length
      ? await supabase
          .from('question_options')
          .select('*')
          .in('question_id', qIds)
      : { data: [] as any[] };

    const safeOptions = options ?? [];

    const finalQuestions = safeQuestions.map(q => ({
      ...q,
      options: safeOptions.filter(
        o => String(o.question_id) === String(q.id)
      )
    }));

    // exam finished
    let isExamFinished = true;

    if (exam?.exam_date) {
      const now = new Date();
      const end = new Date(exam.exam_date);

      if (exam.end_time) {
        const [h, m] = exam.end_time.split(':');
        end.setHours(+h, +m, 0, 0);
      }

      isExamFinished = now > end;
    }

    return NextResponse.json({
      success: true,
      exam: exam ?? null,
      attempt: attempt ?? null,
      answers: answers ?? [],
      questions: finalQuestions,
      isExamFinished
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || 'error' },
      { status: 500 }
    );
  }
}
