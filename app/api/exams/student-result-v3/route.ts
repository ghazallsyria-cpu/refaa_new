import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const normalizeId = (id: any) => String(id ?? '').trim().toLowerCase();

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );

    const { examId, studentId } = await req.json();

    // 1. جلب الاختبار
    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. جلب الطالب
    const { data: students } = await adminSupabase.from('students').select('*, users(full_name)').or(`id.eq.${studentId},user_id.eq.${studentId}`);
    const student = students?.[0] || { id: studentId, users: { full_name: 'طالب' } };
    const allStudentIds = [...new Set([studentId, student.id, student.user_id].filter(Boolean))];

    // 3. جلب المحاولة
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).in('student_id', allStudentIds).order('created_at', { ascending: false });
    const attempt = attempts?.[0] || null;

    // 4. جلب الإجابات
    let answers: any[] = [];
    if (attempt) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attempt.id);
        answers = ans || [];
    }

    // 5. 🚀 السحر النووي: جلب الأسئلة والخيارات منفصلة لضمان عدم انهيار قاعدة البيانات!
    let finalQuestions: any[] = [];

    // هل لدينا لقطة شاشة (Snapshot) للأسئلة وقت تقديم الطالب؟
    if (attempt?.questions_snapshot && Array.isArray(attempt.questions_snapshot) && attempt.questions_snapshot.length > 0) {
        finalQuestions = attempt.questions_snapshot;
    } else {
        // إذا لم يكن هناك لقطة، نجلب الأسئلة الحية بأمان تام
        const { data: rawQuestions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
        
        if (rawQuestions && rawQuestions.length > 0) {
            const qIds = rawQuestions.map(q => q.id);
            // جلب الخيارات وحدها
            const { data: rawOptions } = await adminSupabase.from('question_options').select('*').in('question_id', qIds);
            
            // الدمج اليدوي الخارق
            finalQuestions = rawQuestions.map(q => ({
                ...q,
                options: (rawOptions || []).filter(o => o.question_id === q.id)
            }));
        }
    }

    return NextResponse.json({
        success: true,
        exam: exam || {},
        student,
        attempt,
        answers,
        questions: finalQuestions
    });

  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


