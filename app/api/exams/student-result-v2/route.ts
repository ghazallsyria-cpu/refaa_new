import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // منع الكاش نهائياً

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('مفاتيح السيرفر مفقودة');

    // 🚀 السحر الأول: استخدام مفتاح الإدارة لتخطي حجب الحماية (RLS)
    const adminSupabase = createClient(supabaseUrl, serviceKey);
    
    const { examId, studentId } = await req.json();

    // 1. جلب بيانات الاختبار
    const { data: exam } = await adminSupabase.from('exams').select('*').eq('id', examId).single();

    // 2. تحديد هوية الطالب بدقة فائقة
    const { data: studentById } = await adminSupabase.from('students').select('*, users(full_name)').eq('id', studentId).maybeSingle();
    const { data: studentByUserId } = await adminSupabase.from('students').select('*, users(full_name)').eq('user_id', studentId).maybeSingle();
    
    const student = studentById || studentByUserId || { id: studentId, users: { full_name: 'طالب' } };
    
    const possibleIds = [studentId];
    if (studentById?.id) possibleIds.push(studentById.id);
    if (studentById?.user_id) possibleIds.push(studentById.user_id);
    if (studentByUserId?.id) possibleIds.push(studentByUserId.id);
    if (studentByUserId?.user_id) possibleIds.push(studentByUserId.user_id);
    const uniqueStudentIds = [...new Set(possibleIds.filter(Boolean))];

    // 3. جلب الأسئلة مع الخيارات
    const { data: questions } = await adminSupabase.from('questions').select('*, options:question_options(*), question_options(*)').eq('exam_id', examId).order('order_index');
    
    const normalizedQuestions = (questions || []).map(q => ({
        ...q, options: q.options || q.question_options || []
    }));

    // 4. سحب المحاولة الذهبية وإجاباتها بالقوة
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).in('student_id', uniqueStudentIds).order('created_at', { ascending: false });

    let bestAttempt = attempts?.[0] || null;
    let answers: any[] = [];

    if (attempts && attempts.length > 0) {
        const attemptIds = attempts.map(a => a.id);
        const { data: allAnswers } = await adminSupabase.from('student_answers').select('*').in('attempt_id', attemptIds);
        
        for (const att of attempts) {
            const attAnswers = (allAnswers || []).filter(a => String(a.attempt_id) === String(att.id));
            if (attAnswers.length > 0) {
                bestAttempt = att; answers = attAnswers; break;
            }
        }
    }

    return NextResponse.json({
        exam: exam || {}, student, attempt: bestAttempt, answers, questions: normalizedQuestions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

