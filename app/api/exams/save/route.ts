import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { examData, questions, isNew, userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'المستخدم غير مصرح له' }, { status: 401 });
    }

    let finalExamId = examData.id;

    // تجهيز بيانات الاختبار مع حل مشكلة section_id لضمان التوافق
    const examPayload = {
      title: examData.title,
      description: examData.description || null,
      subject_id: examData.subject_id,
      teacher_id: examData.teacher_id || userId,
      duration: examData.duration || 30,
      max_attempts: examData.max_attempts || 1,
      max_score: examData.max_score || 100,
      total_marks: examData.max_score || 100,
      exam_date: examData.exam_date || new Date().toISOString().split('T')[0],
      start_time: examData.start_time || '08:00',
      end_time: examData.end_time || '23:59',
      status: examData.status || 'draft',
      settings: examData.settings || {},
      // حل مشكلة الـ Not-Null في قاعدة البيانات القديمة
      section_id: examData.section_ids && examData.section_ids.length > 0 ? examData.section_ids[0] : null
    };

    // حفظ أو تحديث الاختبار
    if (isNew || !finalExamId) {
      const { data: newExam, error: insertError } = await adminSupabase
        .from('exams')
        .insert([examPayload])
        .select()
        .single();

      if (insertError) throw new Error(`فشل إنشاء الاختبار: ${insertError.message}`);
      finalExamId = newExam.id;
    } else {
      const { error: updateError } = await adminSupabase
        .from('exams')
        .update(examPayload)
        .eq('id', finalExamId);

      if (updateError) throw new Error(`فشل تحديث الاختبار: ${updateError.message}`);
    }

    // إدارة الفصول (Sections)
    if (!isNew && finalExamId) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
    }

    if (examData.section_ids && Array.isArray(examData.section_ids) && examData.section_ids.length > 0) {
      const sectionsToInsert = examData.section_ids.map((sectionId: string) => ({
        exam_id: finalExamId,
        section_id: sectionId
      }));
      await adminSupabase.from('exam_sections').insert(sectionsToInsert);
    }

    // تنظيف الأسئلة القديمة عند التحديث
    if (!isNew && finalExamId) {
      const { data: oldQuestions } = await adminSupabase.from('questions').select('id').eq('exam_id', finalExamId);
      if (oldQuestions && oldQuestions.length > 0) {
        const oldQuestionIds = oldQuestions.map(q => q.id);
        await adminSupabase.from('question_options').delete().in('question_id', oldQuestionIds);
        await adminSupabase.from('questions').delete().in('id', oldQuestionIds);
      }
    }

    // إدخال الأسئلة والخيارات الجديدة
    if (questions && Array.isArray(questions)) {
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        
        const { data: newQ, error: qError } = await adminSupabase
          .from('questions')
          .insert([{
            exam_id: finalExamId,
            type: q.type || 'multiple_choice',
            content: q.content || q.text || 'سؤال بدون نص',
            points: Number(q.points) || 1,
            explanation: q.explanation || null,
            media_url: q.media_url || null,
            media_type: q.media_type || null,
            order_index: i
          }])
          .select()
          .single();

        if (qError) throw new Error(`فشل حفظ السؤال: ${qError.message}`);

        // إدخال الخيارات مع حل مشكلة order_index
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          const optionsPayload = q.options.map((opt: any, optIndex: number) => ({
            question_id: newQ.id,
            content: typeof opt === 'string' ? opt : (opt.content || opt.text || 'خيار غير محدد'),
            is_correct: typeof opt === 'string' ? false : (opt.is_correct || false),
            // إرسال رقم الترتيب لحل الخطأ المطلوب
            order_index: optIndex 
          }));
          
          const { error: optError } = await adminSupabase.from('question_options').insert(optionsPayload);
          if (optError) throw new Error(`فشل حفظ الخيارات: ${optError.message}`);
        }
      }
    }

    return NextResponse.json({ success: true, examId: finalExamId });

  } catch (error: any) {
    console.error('Save Exam Full Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع أثناء الحفظ' }, { status: 500 });
  }
}
