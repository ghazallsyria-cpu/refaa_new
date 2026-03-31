import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// 1. دالة توحيد المعرفات الصارمة (Strict Normalization)
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

    // 2. التحقق من هوية الطالب بدقة (Strict Student Resolution)
    const { data: studentRecord, error: studentError } = await adminSupabase
      .from('students')
      .select('id, user_id, users(full_name)')
      .or(`id.eq.${providedStudentId},user_id.eq.${providedStudentId}`)
      .limit(1)
      .maybeSingle();

    if (studentError || !studentRecord) {
      return NextResponse.json({ error: 'Student record not found in database' }, { status: 404 });
    }

    const resolvedStudentId = normalizeId(studentRecord.id);

    // 3. جلب بيانات الاختبار (Exam)
    const { data: examData } = await adminSupabase
      .from('exams')
      .select('*')
      .eq('id', normExamId)
      .single();

    // 4. جلب المحاولة بشكل صارم (Strict Attempt Fetching) - لا يوجد Loops هنا
    const { data: attemptRecord, error: attemptError } = await adminSupabase
      .from('exam_attempts')
      .select('*')
      .eq('exam_id', normExamId)
      .eq('student_id', resolvedStudentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // إذا لم تكن هناك محاولة مسجلة، نعود ببيانات فارغة منظمة
    if (!attemptRecord) {
      return NextResponse.json({
        success: true,
        exam: examData || {},
        student: studentRecord,
        attempt: null,
        answers: [],
        questions: [],
        isDataMismatch: false,
        debug: { message: "No attempt found for this student and exam." }
      });
    }

    const normAttemptId = normalizeId(attemptRecord.id);

    // 5. جلب الإجابات المرتبطة حصرياً بهذه المحاولة
    const { data: answersData } = await adminSupabase
      .from('student_answers')
      .select('*')
      .eq('attempt_id', normAttemptId);

    // 6. جلب الأسئلة الحالية المرتبطة بالاختبار
    const { data: questionsData } = await adminSupabase
      .from('questions')
      .select('*, options:question_options(*)')
      .eq('exam_id', normExamId)
      .order('order_index');

    // 7. الكشف عن تلاعب البيانات (Mismatch Detection)
    const currentQuestionIds = new Set((questionsData || []).map(q => normalizeId(q.id)));
    const studentAnswerQuestionIds = (answersData || []).map(a => normalizeId(a.question_id));

    let isDataMismatch = false;
    let orphanedAnswersCount = 0;

    for (const ansQid of studentAnswerQuestionIds) {
      if (!currentQuestionIds.has(ansQid)) {
        isDataMismatch = true;
        orphanedAnswersCount++;
      }
    }

    // 8. طباعة سجل واضح في السيرفر لتتبع تدفق البيانات (Console Debug)
    console.log('\n[End-to-End Data Flow Analysis]');
    console.log(`- Exam ID: ${normExamId}`);
    console.log(`- Resolved Student ID: ${resolvedStudentId}`);
    console.log(`- Active Attempt ID: ${normAttemptId}`);
    console.log(`- Questions in DB: ${questionsData?.length || 0}`);
    console.log(`- Answers in DB: ${answersData?.length || 0}`);
    console.log(`- Orphaned Answers (Mismatch): ${orphanedAnswersCount}`);
    console.log(`- Data Mismatch Flag: ${isDataMismatch}\n`);

    return NextResponse.json({
      success: true,
      exam: examData || {},
      student: studentRecord,
      attempt: attemptRecord,
      answers: answersData || [],
      questions: questionsData || [],
      isDataMismatch, // الراية (Flag) الصريحة للواجهة
      debug: {
        orphanedAnswersCount,
        message: isDataMismatch ? "Warning: Questions were modified after this attempt was recorded." : "Data integrity is stable."
      }
    });

  } catch (error: unknown) {
    console.error('[API Error]', error);
    const msg = error instanceof Error ? error.message : 'Unknown Server Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


