import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // استخدام مفتاح السيرفر (Service Role) لتخطي حماية RLS وجلب البيانات للمعلم إجبارياً
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const { examId, studentId } = await req.json();

    // 1. جلب بيانات الاختبار
    const { data: examData } = await adminSupabase.from('exams').select('*').eq('id', examId).single();
    
    // 2. جلب بيانات الطالب
    let studentData = null;
    const { data: sd1 } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
    if (sd1) studentData = sd1;
    else {
      const { data: sd2 } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
      if (sd2) studentData = sd2;
    }

    // 3. جلب محاولة الاختبار
    const { data: attemptData } = await adminSupabase.from('exam_attempts')
      .select('*')
      .eq('exam_id', examId)
      .eq('student_id', studentData?.id || studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    // 4. جلب الإجابات والأسئلة وربطها
    let answersData: any[] = [];
    if (attemptData) {
      let { data: rawAnswers } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attemptData.id);
      
      // الخطة البديلة لجلب الإجابات
      if (!rawAnswers || rawAnswers.length === 0) {
        const { data: fAnswers } = await adminSupabase.from('exam_answers').select('*').eq('attempt_id', attemptData.id);
        if (fAnswers) rawAnswers = fAnswers.map(a => ({ ...a, text_answer: a.answer, selected_option_id: a.answer }));
      }

      if (rawAnswers && rawAnswers.length > 0) {
        const { data: rawQuestions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId);
        
        answersData = rawAnswers.map((ans: any) => {
          const matchedQ = rawQuestions?.find((q: any) => q.id === ans.question_id);
          return {
            ...ans,
            question: matchedQ || null
          };
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
    console.error('Fetch Student Result API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

