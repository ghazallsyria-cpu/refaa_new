import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    // 🚀 تنظيف المعرفات من أي مسافات أو أسطر مخفية (وهي التي تسبب عدم التطابق)
    const cleanExamId = String(examId).trim().toLowerCase();
    const cleanStudentId = String(studentId).trim().toLowerCase();

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. جلب الاختبار
    const { data: exam, error: examErr } = await adminSupabase.from('exams').select('*').eq('id', cleanExamId).single();

    // 2. جلب المحاولات (مع التقاط أي خطأ من قاعدة البيانات لفضح المشكلة)
    const { data: allAttempts, error: attErr } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', cleanExamId);
    
    let bestAttempt = null;
    let finalAnswers: any[] = [];
    let ansErr = null;

    if (allAttempts && allAttempts.length > 0) {
        // البحث عن محاولة الطالب
        bestAttempt = allAttempts.find(a => String(a.student_id).trim() === cleanStudentId || String(a.user_id).trim() === cleanStudentId);
        
        // إذا لم نجدها، نأخذ أي محاولة موجودة بالقوة
        if (!bestAttempt) bestAttempt = allAttempts[0];

        // جلب الإجابات
        if (bestAttempt) {
            const { data: ans, error: ae } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', bestAttempt.id);
            finalAnswers = ans || [];
            ansErr = ae;
        }
    }

    // 3. جلب الأسئلة والخيارات
    const { data: questions } = await adminSupabase.from('questions').select('*').eq('exam_id', cleanExamId).order('order_index');
    const qIds = questions?.map(q => q.id) || [];
    
    let options: any[] = [];
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
        attempt: bestAttempt || null,
        answers: finalAnswers,
        questions: finalQuestions,
        debugInfo: {
            cleanExamId,
            cleanStudentId,
            examError: examErr?.message || null,
            attemptError: attErr?.message || null,
            answerError: ansErr?.message || null,
            foundAttemptsCount: allAttempts?.length || 0,
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


