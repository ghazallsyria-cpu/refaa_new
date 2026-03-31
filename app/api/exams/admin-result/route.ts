import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    // 🚀 السحر هنا: استخدام مفتاح الـ SERVICE_ROLE يتجاوز كل حمايات الـ RLS!
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // تحديد الطالب
    const { data: students } = await adminSupabase.from('students').select('*, users(full_name)').or(`id.eq.${studentId},user_id.eq.${studentId}`);
    const validStudentIds = [studentId];
    students?.forEach(s => {
        if (s.id) validStudentIds.push(s.id);
        if (s.user_id) validStudentIds.push(s.user_id);
    });

    // جلب المحاولة
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).in('student_id', validStudentIds).order('created_at', { ascending: false });
    const bestAttempt = attempts?.[0] || null;

    // 🚀 جلب الإجابات بقوة الإدارة (هنا كان الفشل سابقاً بسبب حماية قاعدة البيانات)
    let answers = [];
    if (bestAttempt) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', bestAttempt.id);
        answers = ans || [];
    }

    // جلب الأسئلة والخيارات
    const { data: questions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
    const qIds = questions?.map(q => q.id) || [];
    
    let options = [];
    if (qIds.length > 0) {
        const { data: opts } = await adminSupabase.from('question_options').select('*').in('question_id', qIds);
        options = opts || [];
    }

    const finalQuestions = (questions || []).map(q => ({
        ...q, options: options.filter(o => o.question_id === q.id)
    }));

    return NextResponse.json({
        success: true,
        exam: exam || {},
        student: students?.[0] || { id: studentId, users: { full_name: 'طالب' } },
        attempt: bestAttempt,
        answers: answers,
        questions: finalQuestions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

