import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    // 2. محاولة التعرف على الطالب
    const { data: students } = await adminSupabase.from('students').select('id, user_id, users(full_name)');
    const targetStudent = students?.find(s => s.id === studentId || s.user_id === studentId);
    const validIds = targetStudent ? [targetStudent.id, targetStudent.user_id] : [studentId];

    // 3. جلب جميع المحاولات لهذا الاختبار
    const { data: allAttempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId);
    
    // 4. 🚀 البحث عن المحاولة.. وإذا لم نجدها، نستخدم "وضع الإجبار" (God Mode)
    let bestAttempt = allAttempts?.find(a => validIds.includes(a.student_id) || validIds.includes(a.user_id));
    let isForced = false;

    if (!bestAttempt && allAttempts && allAttempts.length > 0) {
        // 🚨 الطالب غير متطابق! ولكننا سنجبر النظام على عرض أول محاولة موجودة في الداتا بيز لكي نرى الإجابات
        bestAttempt = allAttempts[0];
        isForced = true;
    }

    // 5. جلب الإجابات للمحاولة
    let answers = [];
    if (bestAttempt) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', bestAttempt.id);
        answers = ans || [];
    }

    // 6. جلب الأسئلة والخيارات
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

    // معلومات تصحيح الأخطاء لكشف الحقيقة
    const debugInfo = {
        urlStudentId: studentId,
        foundAttemptsCount: allAttempts?.length || 0,
        attemptStudentIdsInDB: allAttempts?.map(a => a.student_id) || [],
        isForced: isForced
    };

    return NextResponse.json({
        success: true,
        exam: exam || {},
        student: targetStudent || { id: studentId, users: { full_name: 'طالب (أرقام غير متطابقة)' } },
        attempt: bestAttempt || null,
        answers: answers,
        questions: finalQuestions,
        debugInfo: debugInfo
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


