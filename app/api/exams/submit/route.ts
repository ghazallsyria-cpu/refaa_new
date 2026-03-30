import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// دالة للتحقق من أن النص هو UUID حقيقي وليس كلمة عادية
const isValidUUID = (uuid: string) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid);
};

export async function POST(req: Request) {
  const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  try {
    const body = await req.json();
    const { examId, answers, score, status, userId } = body;

    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    let attemptId;
    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    // ✅ الحل السحري لتجاوز قيد قاعدة البيانات: ضمان إرسال (completed أو graded) فقط!
    const validStatus = status === 'graded' ? 'graded' : 'completed';

    const attemptPayload = {
        exam_id: examId,
        student_id: realStudentId,
        score: score || 0,
        status: validStatus,
        completed_at: new Date().toISOString(),
    };

    if (existing) {
      attemptId = existing.id;
      await adminSupabase.from('exam_attempts').update(attemptPayload).eq('id', attemptId);
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{...attemptPayload, started_at: new Date().toISOString()}]).select('id').single();
      if (insErr) throw new Error('فشل إنشاء محاولة الاختبار: ' + insErr.message);
      attemptId = newAtt.id;
    }

    // تجهيز الإجابات بطريقة آمنة جداً تمنع انهيار قاعدة البيانات
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        let optId = null;
        let textAns = "";

        if (typeof ans === 'object' && ans !== null) {
          if (ans.optionId && typeof ans.optionId === 'string' && isValidUUID(ans.optionId)) {
            optId = ans.optionId;
          }
          textAns = ans.text ? String(ans.text) : "";
        }

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: textAns,
          selected_option_id: optId,
          is_correct: ans?.isCorrect || false,
          points_earned: ans?.pointsEarned || 0
        };
      });

      const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
      if (ansErr) throw new Error('فشل حفظ الإجابات: ' + ansErr.message);
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


