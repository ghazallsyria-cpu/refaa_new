import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const normalize = (v: any) => String(v ?? '').trim().toLowerCase();

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { examId, studentId } = await req.json();

    // 1. exam
    const { data: exam } = await adminSupabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single();

    // 2. student
    const { data: students } = await adminSupabase
      .from('students')
      .select('*, users(full_name)')
      .or(`id.eq.${studentId},user_id.eq.${studentId}`);

    const student = students?.[0] || {
      id: studentId,
      users: { full_name: 'طالب' }
    };

    const allStudentIds = [
      ...new Set([studentId, student.id, student.user_id].filter(Boolean))
    ];

    // 3. attempt
    const { data: attempts } = await adminSupabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .in('student_id', allStudentIds)
      .order('created_at', { ascending: false });

    const attempt = attempts?.[0] || null;

    // 4. answers
    let answers: any[] = [];

    if (attempt?.id) {
      const { data: ans } = await adminSupabase
        .from('student_answers')
        .select('*')
        .eq('attempt_id', attempt.id);

      answers = ans || [];
    }

    // 5. exam time state
    let isExamFinished = true;

    if (exam?.exam_date) {
      const now = new Date();
      const examDate = new Date(exam.exam_date);

      const [h, m] = (exam.end_time || '23:59').split(':');
      examDate.setHours(Number(h), Number(m), 0, 0);

      isExamFinished = now > examDate;
    }

    // 6. questions
    const { data: rawQuestions } = await adminSupabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index');

    const safeQuestions = rawQuestions || [];

    const qIds = safeQuestions.map((q: any) => q.id);

    // 7. options
    let options: any[] = [];

    if (qIds.length > 0) {
      const { data: rawOptions } = await adminSupabase
        .from('question_options')
        .select('*')
        .in('question_id', qIds);

      options = rawOptions || [];
    }

    // 8. merge
    const finalQuestions = safeQuestions.map((q: any) => ({
      ...q,
      options: (options || []).filter(
        (o: any) => normalize(o.question_id) === normalize(q.id)
      )
    }));

    return NextResponse.json({
      success: true,
      exam: exam || {},
      student,
      attempt,
      answers: answers || [],
      questions: finalQuestions,
      isExamFinished
    });
  } catch (error: any) {
    console.error('API Error:', error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
