import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminSupabase = createClient(supabaseUrl!, serviceKey!);
    
    const { examId, studentId } = await req.json();

    // 1. جلب الاختبار
    const { data: examData } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. جلب الطالب بجميع الطرق
    let studentProfile = null;
    const { data: s1 } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
    if (s1) studentProfile = s1;
    else {
       const { data: s2 } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
       if (s2) studentProfile = s2;
    }

    // 3. جلب المحاولة بقوة
    let attemptData = null;
    if (studentProfile) {
       const { data: att1 } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentProfile.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
       attemptData = att1;
    }
    if (!attemptData) {
       const { data: att2 } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).maybeSingle();
       attemptData = att2;
    }

    // 4. جلب الأسئلة
    const { data: questions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

    // 5. جلب الإجابات بجميع الطرق الممكنة لمنع رسالة "لا توجد إجابات"
    let answersData: any[] = [];
    if (attemptData) {
       const { data: ans1 } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attemptData.id);
       if (ans1 && ans1.length > 0) {
          answersData = ans1;
       } else {
          const { data: ans2 } = await adminSupabase.from('exam_answers').select('*').eq('attempt_id', attemptData.id);
          if (ans2) answersData = ans2.map(a => ({ ...a, text_answer: a.answer, selected_option_id: a.answer }));
       }
    }

    return NextResponse.json({
      exam: examData,
      student: studentProfile || { id: studentId, users: { full_name: 'طالب' } },
      attempt: attemptData,
      answers: answersData,
      questions: questions || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


