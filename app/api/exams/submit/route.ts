import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { examId, answers, score, status, timeSpent, userId } = body;

    if (!examId || !userId) {
      return NextResponse.json({ error: 'بيانات غير مكتملة' }, { status: 400 });
    }

    // 1. بحث متسلسل وآمن عن الطالب
    let realStudentId = userId;
    const { data: s1 } = await adminSupabase.from('students').select('id').eq('user_id', userId).maybeSingle();
    if (s1) realStudentId = s1.id;
    else {
      const { data: s2 } = await adminSupabase.from('students').select('id').eq('id', userId).maybeSingle();
      if (s2) realStudentId = s2.id;
    }

    // 2. إنشاء أو تحديث محاولة الاختبار
    let attemptId;
    const { data: existing } = await adminSupabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('student_id', realStudentId)
      .maybeSingle();

    if (existing) {
      attemptId = existing.id;
      const { error: updateErr } = await adminSupabase
        .from('exam_attempts')
        .update({
          score: score || 0,
          status: status === 'completed' ? 'graded' : status,
          completed_at: new Date().toISOString(),
          time_spent: timeSpent || 0
        })
        .eq('id', attemptId);
      if (updateErr) throw new Error('فشل تحديث المحاولة: ' + updateErr.message);
    } else {
      const { data: newAttempt, error: insertErr } = await adminSupabase
        .from('exam_attempts')
        .insert([{
          exam_id: examId,
          student_id: realStudentId,
          score: score || 0,
          status: status === 'completed' ? 'graded' : status,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          time_spent: timeSpent || 0
        }])
        .select()
        .single();
      if (insertErr) throw new Error('فشل إنشاء المحاولة: ' + insertErr.message);
      attemptId = newAttempt.id;
    }

    // 3. الخوارزمية المدرعة لحفظ الإجابات (Dual-Schema Fallback)
    if (answers && typeof answers === 'object' && Object.keys(answers).length > 0) {
      try {
        // المحاولة الأولى: الحفظ في جدول student_answers
        await adminSupabase.from('student_answers').delete().eq('attempt_id', attemptId);
        
        const payload1 = Object.entries(answers).map(([qId, ansData]: any) => ({
          attempt_id: attemptId,
          question_id: qId,
          text_answer: ansData?.text || null,
          selected_option_id: ansData?.optionId || null,
          is_correct: ansData?.isCorrect || false,
          points_earned: ansData?.pointsEarned || 0
        }));
        
        const { error: err1 } = await adminSupabase.from('student_answers').insert(payload1);
        if (err1) throw err1; // إذا فشل، انتقل للمحاولة الثانية
        
      } catch (fallbackError) {
        console.warn('Table student_answers failed, falling back to exam_answers...');
        
        // المحاولة الثانية: الحفظ في جدول exam_answers
        try {
          await adminSupabase.from('exam_answers').delete().eq('attempt_id', attemptId);
          
          const payload2 = Object.entries(answers).map(([qId, ansData]: any) => ({
            attempt_id: attemptId,
            question_id: qId,
            answer: ansData?.text || ansData?.optionId || JSON.stringify(ansData),
            is_correct: ansData?.isCorrect || false,
            points_earned: ansData?.pointsEarned || 0
          }));
          
          const { error: err2 } = await adminSupabase.from('exam_answers').insert(payload2);
          if (err2) console.error('Both answer schemas failed:', err2);
        } catch (e) {
          console.error('Critical failure in saving answers:', e);
        }
      }
    }

    // 4. إرسال إشعار للمعلم بأمان
    try {
      const { data: examInfo } = await adminSupabase.from('exams').select('teacher_id, title').eq('id', examId).single();
      if (examInfo?.teacher_id) {
        const { data: teacherUser } = await adminSupabase.from('teachers').select('user_id, id').eq('id', examInfo.teacher_id).maybeSingle();
        const targetTeacherId = teacherUser?.user_id || teacherUser?.id || examInfo.teacher_id;
        if (targetTeacherId) {
           await adminSupabase.from('notifications').insert([{
             user_id: targetTeacherId,
             title: 'تسليم اختبار جديد',
             content: `قام طالب بتسليم اختبار: ${examInfo.title}`,
             type: 'exam',
             link: `/exams/results/${examId}`
           }]);
        }
      }
    } catch (e) {}

    return NextResponse.json({ success: true, attemptId });

  } catch (error: any) {
    console.error('CRITICAL EXAM SUBMIT ERROR:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ أثناء الحفظ' }, { status: 400 });
  }
}


