import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) throw new Error('مفاتيح السيرفر مفقودة');

    const adminSupabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    
    // 🚀 استلام البيانات والوقت من الفرونت إند
    const { examId, answers, score, status, userId, timeTaken } = await req.json(); 

    // 1. تحديد الطالب (🚀 تم الإصلاح الجذري: البحث بـ id مباشرة لأننا تخلصنا من user_id الوهمي)
    let realStudentId = userId;
    const { data: st, error: stError } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
    
    if (stError) throw new Error("حدث خطأ أثناء التحقق من حساب الطالب.");
    if (st) {
      realStudentId = st.id;
    } else {
      throw new Error("لم يتم العثور على حساب الطالب في قاعدة البيانات.");
    }

    const validStatus = (status === 'graded' || status === 'completed') ? status : 'completed';

    // 2. فصل الأسئلة عن الخيارات لمنع انهيار الاستعلام في Supabase
    const { data: rawQuestions } = await adminSupabase.from('questions').select('*').eq('exam_id', examId).order('order_index');
    const qIds = (rawQuestions || []).map(q => q.id);
    
    let rawOptions: any[] = [];
    if (qIds.length > 0) {
        const { data: opts } = await adminSupabase.from('question_options').select('*').in('question_id', qIds);
        rawOptions = opts || [];
    }

    const currentQuestions = (rawQuestions || []).map(q => ({
        ...q, options: rawOptions.filter(o => o.question_id === q.id)
    }));

    // 3. حفظ المحاولة
    const { data: attempts } = await adminSupabase.from('exam_attempts').select('id')
      .eq('exam_id', examId).eq('student_id', realStudentId).order('created_at', { ascending: false }).limit(1);

    const existing = attempts && attempts.length > 0 ? attempts[0] : null;

    let attemptId;
    if (existing) {
      attemptId = existing.id;
      const { error: updErr } = await adminSupabase.from('exam_attempts').update({
        score: score || 0, 
        status: validStatus, 
        completed_at: new Date().toISOString(), 
        questions_snapshot: currentQuestions,
        time_taken: timeTaken || 0 // 🚀 حفظ الوقت للمحاولة المُحدثة
      }).eq('id', attemptId);
      
      if (updErr) throw new Error("Update Error: " + updErr.message);
      await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
    } else {
      const { data: newAtt, error: insErr } = await adminSupabase.from('exam_attempts').insert([{
        exam_id: examId, 
        student_id: realStudentId, 
        score: score || 0, 
        status: validStatus,
        started_at: new Date().toISOString(), 
        completed_at: new Date().toISOString(), 
        questions_snapshot: currentQuestions,
        time_taken: timeTaken || 0 // 🚀 حفظ الوقت للمحاولة الجديدة
      }]).select('id').single();
      
      if (insErr) throw new Error("Insert Error: " + insErr.message);
      attemptId = newAtt?.id;
    }

    // 4. حفظ الإجابات
    if (answers && Object.keys(answers).length > 0) {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]: any) => {
        let finalOptionId = null;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (ans.optionId && typeof ans.optionId === 'string' && uuidRegex.test(ans.optionId)) finalOptionId = ans.optionId;

        return {
          attempt_id: attemptId,
          question_id: qId,
          text_answer: ans.text ? String(ans.text) : "لم يتم تسجيل إجابة",
          selected_option_id: finalOptionId,
          is_correct: Boolean(ans.isCorrect),
          points_earned: Number(ans.pointsEarned) || 0
        };
      });

      if (formattedAnswers.length > 0) {
          const { error: ansErr } = await adminSupabase.from('student_answers').insert(formattedAnswers);
          if (ansErr) throw new Error("Answers Insert Error: " + ansErr.message);
      }
    }

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('Submit API Failed:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
