import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      throw new Error('تحذير: مفتاح السيرفر (Service Role Key) غير موجود في إعدادات البيئة!');
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { examId, studentId } = await req.json();

    // 1. جلب الاختبار
    const { data: examData, error: examErr } = await adminSupabase.from('exams').select('*').eq('id', examId).single();
    if (examErr) throw new Error('لم يتم العثور على الاختبار');

    // 2. جلب الطالب بأمان
    let studentData = null;
    const { data: sd1 } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
    if (sd1) studentData = sd1;
    else {
      const { data: sd2 } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
      studentData = sd2;
    }

    // 3. جلب المحاولة
    const { data: attemptData } = await adminSupabase.from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentData?.id || studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let answersData: any[] = [];

    if (attemptData) {
      let { data: rawAnswers } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attemptData.id);

      // الخطة البديلة
      if (!rawAnswers || rawAnswers.length === 0) {
        const { data: fAnswers } = await adminSupabase.from('exam_answers').select('*').eq('attempt_id', attemptData.id);
        if (fAnswers && fAnswers.length > 0) {
           rawAnswers = fAnswers.map(a => ({ ...a, text_answer: a.answer, selected_option_id: a.answer }));
        }
      }

      if (rawAnswers && rawAnswers.length > 0) {
        const { data: rawQuestions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId);
        answersData = rawAnswers.map((ans: any) => {
          const matchedQ = rawQuestions?.find((q: any) => q.id === ans.question_id);
          return { ...ans, question: matchedQ || null };
        });
      }
    }

    return NextResponse.json({
      exam: examData,
      student: studentData,
      attempt: attemptData,
      answers: answersData
    });

  } catch (error: any) {
    console.error('API Error Fetching Result:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


