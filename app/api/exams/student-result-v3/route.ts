import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

    // 2. تحديد هوية الطالب بدقة وتخطي الأخطاء
    const { data: studentRecords } = await adminSupabase.from('students').select('*').or(`id.eq.${studentId},user_id.eq.${studentId}`);
    let resolvedStudentId = studentId;
    if (studentRecords && studentRecords.length > 0) resolvedStudentId = studentRecords[0].id;

    // 3. جلب الأسئلة الحالية للاختبار
    const { data: questions } = await adminSupabase.from('questions').select('*, options:question_options(*)').eq('exam_id', examId).order('order_index');

    // 4. سحب المحاولة وإجاباتها بالقوة
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('*').eq('exam_id', examId).order('created_at', { ascending: false });
    
    let bestAttempt = null;
    let answers: any[] = [];

    // البحث عن محاولة تحتوي على إجابات لهذا الطالب
    for (const att of (attempts || [])) {
        if (att.student_id === resolvedStudentId || att.student_id === studentId || att.user_id === studentId) {
            const { data: ans } = await adminSupabase.from('student_answers').select('*').eq('attempt_id', att.id);
            if (ans && ans.length > 0) {
                bestAttempt = att;
                answers = ans;
                break; 
            }
        }
    }

    if (!bestAttempt && attempts) {
        bestAttempt = attempts.find(a => a.student_id === resolvedStudentId || a.student_id === studentId || a.user_id === studentId) || attempts[0];
    }

    return NextResponse.json({
        success: true, 
        exam: exam || {}, 
        attempt: bestAttempt, 
        answers, 
        questions: questions || [],
        debug: { studentId, resolvedStudentId, answersCount: answers.length }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

