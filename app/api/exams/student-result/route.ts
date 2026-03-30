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
    const { data: examData } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. البحث الدقيق جداً عن المحاولة (Attempt)
    let attemptData = null;
    let studentData = null;

    // المحاولة الأولى: البحث المباشر باستخدام studentId القادم من الرابط
    const { data: directAttempt } = await adminSupabase.from('exam_attempts')
      .select('*').eq('exam_id', examId).eq('student_id', studentId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (directAttempt) {
       attemptData = directAttempt;
       // جلب بيانات الطالب بناء على الـ ID الدقيق
       const { data: sd } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
       studentData = sd;
    } else {
       // المحاولة الثانية: ربما studentId هو user_id، نبحث عن ملف الطالب أولاً
       const { data: profile } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
       if (profile) {
          studentData = profile;
          const { data: fallbackAttempt } = await adminSupabase.from('exam_attempts')
            .select('*').eq('exam_id', examId).eq('student_id', profile.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          attemptData = fallbackAttempt;
       }
    }

    // 3. جلب الأسئلة دائماً وبشكل مستقل
    const { data: rawQuestions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

    // 4. جلب الإجابات إن وجدت بناءً على رقم المحاولة
    let answersData: any[] = [];
    if (attemptData && attemptData.id) {
      let { data: rawAnswers } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', attemptData.id);
      
      if (!rawAnswers || rawAnswers.length === 0) {
        const { data: fAnswers } = await adminSupabase.from('exam_answers').select('*').eq('attempt_id', attemptData.id);
        if (fAnswers && fAnswers.length > 0) {
           rawAnswers = fAnswers.map(a => ({ ...a, text_answer: a.answer, selected_option_id: a.answer }));
        }
      }
      answersData = rawAnswers || [];
    }

    return NextResponse.json({
      exam: examData,
      student: studentData || { id: studentId, users: { full_name: 'طالب' } },
      attempt: attemptData, // ✅ الآن مستحيل أن يكون فارغاً إذا كان الطالب قد أرسل الاختبار!
      answers: answersData,
      questions: rawQuestions || []
    });

  } catch (error: any) {
    console.error('API Error Fetching Result:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


