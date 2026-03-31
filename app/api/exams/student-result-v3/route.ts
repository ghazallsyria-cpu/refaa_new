import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

export async function POST(req: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { examId, studentId } = await req.json();

  const { data: exam } = await supabase.from('exams').select('*').eq('id', examId).single();

  const now = new Date();
  const examDate = new Date(exam.exam_date);
  const [h, m] = (exam.end_time || '23:59').split(':');

  examDate.setHours(Number(h), Number(m));
  const isExamFinished = now > examDate;

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  const attempt = attempts?.[0] || null;

  let answers: any[] = [];

  if (attempt) {
    const { data } = await supabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', attempt.id);

    answers = data || [];
  }

  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('exam_id', examId);

  const qIds = questions.map((q: any) => q.id);

  const { data: options } = await supabase
    .from('question_options')
    .select('*')
    .in('question_id', qIds);

  const finalQuestions = questions.map((q: any) => ({
    ...q,
    options: options.filter((o: any) => normalize(o.question_id) === normalize(q.id))
  }));

  // 🔒 منع تسريب البيانات للطالب
  const isPrivileged = true; // اربطها لاحقاً بالجلسة

  if (!isPrivileged) {
    if (!isExamFinished || attempt?.status !== 'graded') {
      answers = [];
    }
  }

  return NextResponse.json({
    success: true,
    exam,
    attempt,
    answers,
    questions: finalQuestions,
    isExamFinished
  });
}
