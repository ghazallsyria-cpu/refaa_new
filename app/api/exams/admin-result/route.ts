import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // 1. جلب الاختبار
    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. التعرف على الطالب وتوحيد الأرقام
    const { data: students } = await adminSupabase.from('students').select('id, user_id, users(full_name)');
    const targetStudent = students?.find(s => s.id === studentId || s.user_id === studentId);
    const validIds = targetStudent ? [targetStudent.id, targetStudent.user_id].filter(Boolean) : [studentId];

    // 3. جلب جميع محاولات الاختبار
    const { data: allAttempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId);
    
    // فلترة المحاولات لتخص هذا الطالب فقط
    const studentAttempts = (allAttempts || []).filter(a => validIds.includes(a.student_id) || validIds.includes(a.user_id));

    let bestAttempt = null;
    let finalAnswers: any[] = [];
    let maxAnswersCount = -1;

    // 🚀 4. الذكاء الاصطناعي: فحص كل المحاولات لاختيار المحاولة المليئة بالإجابات وتجاهل الفارغة
    for (const att of studentAttempts) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', att.id);
        const count = ans?.length || 0;
        
        // إذا وجدنا إجابات أكثر من المحاولة السابقة، نعتمد هذه المحاولة
        if (count > maxAnswersCount) {
            maxAnswersCount = count;
            bestAttempt = att;
            finalAnswers = ans || [];
        }
    }

    if (!bestAttempt && studentAttempts.length > 0) {
        bestAttempt = studentAttempts[0];
    }

    // 5. جلب الأسئلة والخيارات
    const { data: questions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
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
        student: targetStudent || { id: studentId, users: { full_name: 'طالب' } },
        attempt: bestAttempt,
        answers: finalAnswers,
        questions: finalQuestions,
        debugInfo: {
            foundAttemptsCount: studentAttempts.length,
            isForced: studentAttempts.length === 0,
            attemptStudentIdsInDB: validIds
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


