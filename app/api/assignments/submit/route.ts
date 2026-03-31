import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'مفاتيح السيرفر مفقودة' }, { status: 500 });
  }

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const { assignmentId, studentId, answers, submissionId } = await req.json();

    // 1. تحديد الطالب بدقة
    let realStudentId = studentId;
    const { data: st } = await adminSupabase.from('students').select('id').eq('user_id', studentId).maybeSingle();
    if (st?.id) realStudentId = st.id;
    else {
        const { data: st2 } = await adminSupabase.from('students').select('id').eq('id', studentId).maybeSingle();
        if (st2?.id) realStudentId = st2.id;
    }

    let finalSubmissionId = submissionId;

    // 2. إنشاء أو تحديث تسليم الواجب
    if (finalSubmissionId) {
      const { error: updErr } = await adminSupabase.from('assignment_submissions').update({
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }).eq('id', finalSubmissionId);
      
      if (updErr) throw new Error('فشل تحديث التسليم: ' + updErr.message);
      
      // مسح الإجابات القديمة
      await adminSupabase.from('assignment_answers').delete().eq('submission_id', finalSubmissionId);
    } else {
      const { data: sub, error: subErr } = await adminSupabase.from('assignment_submissions').insert([{
        assignment_id: assignmentId,
        student_id: realStudentId,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      }]).select('id').single();

      if (subErr) throw new Error('فشل إنشاء التسليم: ' + subErr.message);
      finalSubmissionId = sub.id;
    }

    // 3. حفظ الإجابات
    if (answers && answers.length > 0) {
      const answersToInsert = answers.map((ans: any) => ({
        submission_id: finalSubmissionId,
        question_id: ans.question_id,
        answer_text: ans.answer_text || null,
        selected_options: ans.selected_options || null,
      }));
      const { error: ansErr } = await adminSupabase.from('assignment_answers').insert(answersToInsert);
      if (ansErr) throw new Error('فشل حفظ الإجابات: ' + ansErr.message);
    }

    return NextResponse.json({ id: finalSubmissionId, status: 'success' });
  } catch (error: any) {
    console.error('Submit Assignment Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

