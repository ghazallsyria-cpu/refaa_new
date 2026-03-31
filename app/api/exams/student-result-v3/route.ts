import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const normalizeId = (id: string | number | null | undefined): string => {
  return String(id ?? '').trim().toLowerCase();
};

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    if (!examId || !studentId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const normExamId = normalizeId(examId);
    const providedStudentId = normalizeId(studentId);

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // تحديد الطالب
    const { data: studentRecord } = await adminSupabase
      .from('students')
      .select('id, user_id, users(full_name)')
      .or(`id.eq.${providedStudentId},user_id.eq.${providedStudentId}`)
      .limit(1)
      .maybeSingle();

    const resolvedStudentId = studentRecord ? normalizeId(studentRecord.id) : providedStudentId;

    // جلب الاختبار
    const { data: examData } = await adminSupabase
      .from('exams')
      .select('*')
      .eq('id', normExamId)
      .single();

    // جلب المحاولة
    const { data: attemptRecord } = await adminSupabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', normExamId)
      .eq('student_id', resolvedStudentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!attemptRecord) {
      return NextResponse.json({
        success: true, exam: examData || {}, student: studentRecord,
        attempt: null, answers: [], questions: [], isDataMismatch: false
      });
    }

    const normAttemptId = normalizeId(attemptRecord.id);

    // جلب الإجابات
    const { data: answersData } = await adminSupabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', normAttemptId);

    // 📸 السحر هنا: جلب الأسئلة
    let questionsToReturn = [];
    let isDataMismatch = false;

    // إذا كان لدينا Snapshot (لقطة) محفوظة في المحاولة، نستخدمها!
    if (attemptRecord.questions_snapshot && Array.isArray(attemptRecord.questions_snapshot)) {
       questionsToReturn = attemptRecord.questions_snapshot;
    } else {
       // إذا كانت محاولة قديمة قبل تحديثنا هذا، نجلب الأسئلة الحية من قاعدة البيانات
       const { data: liveQuestions } = await adminSupabase
         .from('questions')
         .select('*, options:question_options(*)')
         .eq('exam_id', normExamId)
         .order('order_index');
         
       questionsToReturn = liveQuestions || [];

       // كشف التلاعب (للبيانات القديمة فقط)
       const currentQuestionIds = new Set(questionsToReturn.map((q:any) => normalizeId(q.id)));
       const studentAnswerQuestionIds = (answersData || []).map(a => normalizeId(a.question_id));
       for (const ansQid of studentAnswerQuestionIds) {
         if (!currentQuestionIds.has(ansQid)) {
           isDataMismatch = true; break;
         }
       }
    }

    return NextResponse.json({
      success: true,
      exam: examData || {},
      student: studentRecord || { id: studentId, users: { full_name: 'طالب' } },
      attempt: attemptRecord,
      answers: answersData || [],
      questions: questionsToReturn, // نرسل اللقطة المأمونة
      isDataMismatch
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


