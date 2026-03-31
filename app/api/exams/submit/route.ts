import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('مفاتيح السيرفر مفقودة');

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const { examId, answers, score, status, userId } = await req.json();

    // 1. تحديد الطالب
    let realStudentId = userId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (st) realStudentId = st.id;
    else {
      const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (st2) realStudentId = st2.id;
    }

    const validStatus = (status === 'graded' || status === 'completed') ? status : 'completed';

    // 2. معالجة المحاولة (Attempt)
    const { data: existing } = await adminSupabase.from('exam_attempts').select('id').eq('exam_id', examId).eq('student_id', realStudentId).maybeSingle();

    let attemptId;
    if (existing) {
      attemptId = existing.id;
      const { error: updErr } = await adminSupabase.from('exam_attempts').update({
        score: score || 0, status: validStatus, completed_at: new Date().toISOString()
      }).eq('id', attemptId);
      if (updErr) throw new Error("خطأ في تحديث المحاولة: " + updErr.message);
      
      // مسح الإجابات القديمة لضمان عدم التكرار
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId, student_id: realStudentId, score: score || 0, status: validStatus,
        started_at: new Date().toISOString(), completed_at: new Date().toISOString()
      }]).select('id').single();
      if (insErr) throw new Error("خطأ في إنشاء المحاولة: " + insErr.message);
      attemptId = newAtt.id;
    }

    // 3. 🌟 السحر هنا: تنظيف وتجهيز الإجابات لتقبلها قاعدة البيانات برحابة صدر
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        
        let finalOptionId = null;
        let finalText = null;

        // إذا كان هناك optionId صالح، نضعه
        if (ans.optionId && typeof ans.optionId === 'string' && ans.optionId.trim() !== '') {
            finalOptionId = ans.optionId;
        }

        // إذا كان النص موجوداً
        if (ans.text) {
            finalText = typeof ans.text === 'object' ? JSON.stringify(ans.text) : String(ans.text);
        }

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: finalText,
          selected_option_id: finalOptionId,
          is_correct: Boolean(ans.isCorrect),
          points_earned: Number(ans.pointsEarned) || 0
        };
      });

      if (formattedAnswers.length > 0) {
          const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
          if (ansErr) throw new Error("خطأ من قاعدة البيانات في حفظ الإجابات: " + ansErr.message);
      }
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


