import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examId, answers, score, status, userId } = body; // أزلنا timeSpent لتفادي مشاكل الأعمدة

    // 1. إيجاد الطالب
    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;

    // 2. إنشاء المحاولة (بأقل عدد من الأعمدة لمنع الرفض)
    const attemptPayload = {
      exam_id: examId,
      student_id: realStudentId,
      score: score || 0,
      status: status === 'completed' ? 'graded' : 'submitted'
    };

    let attemptId;
    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();
    
    if (existing) {
      attemptId = existing.id;
      const { error: updErr } = await adminSupabase.from('exam_attempts').update(attemptPayload).eq('id', attemptId);
      if (updErr) throw new Error('فشل في تحديث المحاولة: ' + updErr.message);
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([attemptPayload]).select().single();
      if (insErr) throw new Error('فشل في إنشاء المحاولة: ' + insErr.message);
      attemptId = newAtt.id;
    }

    // 3. حفظ الإجابات بشكل مبسط
    if (answers && Object.keys(answers).length > 0) {
      const answersToSave = Object.entries(answers).map(([qId, ans]: any) => ({
        attempt_id: attemptId,
        question_id: qId,
        text_answer: typeof ans === 'string' ? ans : (ans?.text || ''),
        is_correct: ans?.isCorrect || false,
        points_earned: ans?.pointsEarned || 0
      }));
      
      const { error: ansErr } = await adminSupabase.from('student_answers').insert(answersToSave);
      if (ansErr) throw new Error('فشل في حفظ الإجابات: ' + ansErr.message);
    }

    return NextResponse.json({ success: true, attemptId });
  } catch (error: any) {
    console.error('Submit Exam Error:', error);
    // إرسال رسالة الخطأ الدقيقة لتظهر في الواجهة!
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


