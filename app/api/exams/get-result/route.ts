import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    // استخدام مفتاح الإدارة لتخطي كل حمايات قاعدة البيانات
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. جلب الاختبار
    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. جلب جميع الطلاب والبحث عن الطالب المطلوب (لتفادي مشكلة اختلاف الـ IDs)
    const { data: allStudents } = await adminSupabase.from('students').select('*');
    const targetStudent = allStudents?.find(s => s.id === studentId || s.user_id === studentId);
    
    // إعداد قائمة بالمعرفات المحتملة للطالب
    const validStudentIds = targetStudent ? [targetStudent.id, targetStudent.user_id] : [studentId];

    // 3. جلب جميع المحاولات لهذا الاختبار، والبحث عن محاولة الطالب
    const { data: allAttempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId);
    const attempt = allAttempts?.find(a => validStudentIds.includes(a.student_id) || validStudentIds.includes(a.user_id));

    // 4. جلب الإجابات فقط إذا وجدت المحاولة
    let answers = [];
    if (attempt) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attempt.id);
        answers = ans || [];
    }

    // 5. جلب الأسئلة
    const { data: questions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
    const qIds = questions?.map(q => q.id) || [];
    
    // 6. جلب الخيارات بشكل منفصل تماماً (لمنع فشل الدمج)
    let options = [];
    if (qIds.length > 0) {
        const { data: opts } = await adminSupabase.from('question_options').select('*').in('question_id', qIds);
        options = opts || [];
    }

    // 7. دمج الأسئلة مع خياراتها يدوياً في السيرفر
    const assembledQuestions = (questions || []).map(q => ({
        ...q,
        options: options.filter(o => o.question_id === q.id)
    }));

    return NextResponse.json({
        success: true,
        exam: exam || {},
        student: targetStudent || { id: studentId },
        attempt: attempt || null,
        answers,
        questions: assembledQuestions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

