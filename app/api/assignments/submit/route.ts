import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 🚀 استخدام صلاحيات الأدمن (God Mode) لتخطي أي قيود RLS تمنع الطالب من الحفظ
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { assignmentId, studentId, answers, submissionId, content, fileUrl } = body;

    if (!assignmentId || !studentId) {
      return NextResponse.json({ error: 'بيانات الواجب أو الطالب مفقودة', success: false }, { status: 400 });
    }

    let actualSubmissionId = submissionId;

    // 1. التحقق مما إذا كان هناك تسليم سابق لهذا الطالب في هذا الواجب
    if (!actualSubmissionId) {
      const { data: existingSub } = await adminSupabase
        .from('assignment_submissions')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('student_id', studentId)
        .maybeSingle();
      
      if (existingSub) {
        actualSubmissionId = existingSub.id;
      }
    }

    // 2. إنشاء أو تحديث سجل التسليم العام في جدول (assignment_submissions)
    if (actualSubmissionId) {
      // تحديث تسليم موجود
      const { error: updateError } = await adminSupabase
        .from('assignment_submissions')
        .update({
          content: content || null,
          file_url: fileUrl || null,
          status: 'submitted', // تحويل الحالة إلى تم التسليم
          submitted_at: new Date().toISOString(),
        })
        .eq('id', actualSubmissionId);

      if (updateError) throw new Error('فشل تحديث التسليم: ' + updateError.message);
    } else {
      // إنشاء تسليم جديد
      const { data: newSub, error: insertError } = await adminSupabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: studentId,
          content: content || null,
          file_url: fileUrl || null,
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError) throw new Error('فشل إنشاء التسليم: ' + insertError.message);
      actualSubmissionId = newSub.id;
    }

    // ==========================================
    // 🚀 الجزء الأهم (الذي كان مفقوداً لديك): حفظ إجابات الأسئلة!
    // ==========================================
    if (answers && Array.isArray(answers) && answers.length > 0) {
      
      // أولاً: حذف أي إجابات قديمة لهذا التسليم (لتفادي التكرار إذا عدّل الطالب إجابته)
      await adminSupabase.from('assignment_answers').delete().eq('submission_id', actualSubmissionId);

      // ثانياً: تجهيز الإجابات الجديدة لتطابق هيكل قاعدة البيانات
      const answersToInsert = answers.map((ans: any) => {
        return {
          submission_id: actualSubmissionId,
          question_id: ans.question_id,
          answer_text: typeof ans.answer_text === 'object' && ans.answer_text !== null ? JSON.stringify(ans.answer_text) : ans.answer_text || null,
          selected_options: ans.selected_options || null,
        };
      });

      // ثالثاً: إدخال الإجابات في جدول (assignment_answers)
      const { error: answersError } = await adminSupabase
        .from('assignment_answers')
        .insert(answersToInsert);

      if (answersError) {
        console.error("Answers Insert Error:", answersError);
        throw new Error('فشل حفظ الإجابات التفصيلية في قاعدة البيانات');
      }
    }

    return NextResponse.json({ 
      success: true, 
      id: actualSubmissionId,
      message: 'تم استلام وحفظ الواجب بنجاح' 
    });

  } catch (error: any) {
    console.error('Submit Assignment API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
