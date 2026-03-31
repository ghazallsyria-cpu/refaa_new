import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 🚀 تدمير الكاش نهائياً في السيرفر
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { persistSession: false }
    });

    const { examId, studentId } = await req.json();

    // 1. جلب الاختبار
    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. جلب الأسئلة
    const { data: questions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
    
    // 🚀 الدمج اليدوي الخارق للخيارات (لتخطي فشل الـ Supabase Joins)
    const qIds = (questions || []).map(q => q.id);
    let allOptions: any[] = [];
    if (qIds.length > 0) {
        const { data: opts } = await adminSupabase.from('question_options').select('*').in('question_id', qIds);
        allOptions = opts || [];
    }

    const questionsWithOptions = (questions || []).map(q => ({
        ...q,
        options: allOptions.filter(o => String(o.question_id) === String(q.id))
    }));

    // 3. تحديد هوية الطالب بجميع الأشكال الممكنة
    const { data: studentRecords } = await adminSupabase.from('students').select('id, user_id, users(full_name)').or(`id.eq.${studentId},user_id.eq.${studentId}`);
    const validStudentIds = [studentId];
    studentRecords?.forEach(s => {
        if (s.id) validStudentIds.push(s.id);
        if (s.user_id) validStudentIds.push(s.user_id);
    });

    // 4. جلب كل المحاولات لهذا الاختبار
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId);
    
    // 5. جلب كل الإجابات
    const attemptIds = (attempts || []).map(a => a.id);
    let allAnswers: any[] = [];
    if (attemptIds.length > 0) {
        const { data: ans } = await adminSupabase.from('student_answers').select('*').in('attempt_id', attemptIds);
        allAnswers = ans || [];
    }

    // 6. البحث عن المحاولة الذهبية التي تملك إجابات للطالب
    let bestAttempt = null;
    let bestAnswers: any[] = [];

    for (const att of (attempts || [])) {
        if (validStudentIds.includes(att.student_id) || validStudentIds.includes(att.user_id)) {
            const currentAnswers = allAnswers.filter(a => String(a.attempt_id) === String(att.id));
            if (currentAnswers.length > 0) {
                bestAttempt = att;
                bestAnswers = currentAnswers;
                break;
            }
        }
    }

    // خطة بديلة إذا لم نجد إجابات
    if (!bestAttempt) {
        bestAttempt = (attempts || []).find(att => validStudentIds.includes(att.student_id) || validStudentIds.includes(att.user_id));
    }

    return NextResponse.json({
        exam: exam || {},
        student: studentRecords?.[0] || { id: studentId, users: { full_name: 'طالب' } },
        attempt: bestAttempt || null,
        answers: bestAnswers,
        questions: questionsWithOptions
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


