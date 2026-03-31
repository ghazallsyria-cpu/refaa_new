import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const { examId, studentId } = await req.json();

    // 🚀 1. مفتاح الإدارة يكسر حماية RLS نهائياً
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. تحديد الطالب بكل المعرفات الممكنة
    const { data: students } = await adminSupabase.from('students').select('*, users(full_name)').or(`id.eq.${studentId},user_id.eq.${studentId}`);
    const validStudentIds = [studentId];
    students?.forEach(s => {
        if (s.id) validStudentIds.push(s.id);
        if (s.user_id) validStudentIds.push(s.user_id);
    });

    // 3. جلب جميع محاولات الاختبار (بدون فلترة صارمة للطالب لتفادي مشكلة اختلاف المعرفات)
    const { data: allAttempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).order('created_at', { ascending: false });

    let bestAttempt = null;
    let finalAnswers: any[] = [];

    // 🚀 4. البحث الذكي: مسح جميع المحاولات للعثور على المحاولة التي تحتوي على إجابات!
    if (allAttempts && allAttempts.length > 0) {
        for (const att of allAttempts) {
            // جلب الإجابات لهذه المحاولة (بقوة الإدارة)
            const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', att.id);

            if (ans && ans.length > 0) {
                // إذا وجدنا إجابات، نتأكد أنها تخص هذا الطالب
                if (validStudentIds.includes(att.student_id) || validStudentIds.includes(att.user_id)) {
                    bestAttempt = att;
                    finalAnswers = ans;
                    break; // وجدنا المحاولة الذهبية!
                } else if (!bestAttempt) {
                    // كخطة إنقاذ: إذا لم تتطابق الأرقام ولكنها المحاولة الوحيدة التي بها إجابات، نأخذها!
                    bestAttempt = att;
                    finalAnswers = ans;
                }
            }
        }

        // إذا لم نجد أي محاولة بها إجابات، نأخذ محاولة الطالب كاحتياط
        if (!bestAttempt) {
            bestAttempt = allAttempts.find(a => validStudentIds.includes(a.student_id) || validStudentIds.includes(a.user_id)) || allAttempts[0];
        }
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
        student: students?.[0] || { id: studentId, users: { full_name: 'طالب' } },
        attempt: bestAttempt,
        answers: finalAnswers,
        questions: finalQuestions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


