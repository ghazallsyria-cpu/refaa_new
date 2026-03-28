import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { examData, questions, isNew, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    let finalExamId = examData.id;

    // --- تم الإصلاح هنا: تضمين section_id لإرضاء قاعدة البيانات (Not-Null Constraint) ---
    const examPayload = {
      title: examData.title,
      description: examData.description,
      subject_id: examData.subject_id,
      teacher_id: examData.teacher_id || userId, // لضمان وجود المعلم دائماً
      section_id: examData.section_id || (examData.section_ids && examData.section_ids[0]) || null, // الحل الجذري
      duration: examData.duration,
      max_attempts: examData.max_attempts,
      max_score: examData.max_score,
      exam_date: examData.exam_date,
      start_time: examData.start_time,
      end_time: examData.end_time,
      status: examData.status,
      settings: examData.settings
    };

    if (isNew) {
      const { data: newExam, error } = await adminSupabase
        .from('exams')
        .insert([examPayload])
        .select()
        .single();

      if (error) throw error;
      if (!newExam) throw new Error('Failed to create exam');
      finalExamId = newExam.id;
    } else {
      const { error } = await adminSupabase
        .from('exams')
        .update(examPayload)
        .eq('id', finalExamId);

      if (error) throw error;
    }

    // Handle sections (هنا يتم حفظ تعدد الصفوف بشكل سليم)
    if (!isNew) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
    }

    if (examData.section_ids && examData.section_ids.length > 0) {
      const sectionsToInsert = examData.section_ids.map((sectionId: string) => ({
        exam_id: finalExamId,
        section_id: sectionId
      }));
      const { error: sectionsError } = await adminSupabase.from('exam_sections').insert(sectionsToInsert);
      if (sectionsError) throw sectionsError;
    }

    // Handle questions
    if (!isNew) {
      // Delete old options first due to foreign key constraints
      const { data: oldQuestions } = await adminSupabase.from('questions').select('id').eq('exam_id', finalExamId);
      if (oldQuestions && oldQuestions.length > 0) {
        const oldQuestionIds = oldQuestions.map(q => q.id);
        await adminSupabase.from('question_options').delete().in('question_id', oldQuestionIds);
      }
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionPayload = {
        exam_id: finalExamId,
        type: q.type,
        content: q.content,
        points: q.points,
        explanation: q.explanation,
        media_url: q.media_url,
        media_type: q.media_type,
        order_index: i
      };

      const { data: newQ, error: qError } = await adminSupabase
        .from('questions')
        .insert([questionPayload])
        .select()
        .single();

      if (qError) throw qError;

      if (q.options && q.options.length > 0) {
        const optionsPayload = q.options.map((opt: any) => ({
          question_id: newQ.id,
          content: opt.content,
          is_correct: opt.is_correct
        }));
        const { error: optError } = await adminSupabase.from('question_options').insert(optionsPayload);
        if (optError) throw optError;
      }
    }

    // Send notifications if published
    if (examData.status === 'published' && examData.section_ids && examData.section_ids.length > 0) {
      try {
        let studentsQuery = adminSupabase.from('students').select('id');
        if (examData.section_ids.length > 0) {
          studentsQuery = studentsQuery.in('section_id', examData.section_ids);
        }
        const { data: students } = await studentsQuery;

        if (students && students.length > 0) {
          const notificationPayloads = students.map(student => ({
            user_id: student.id,
            title: 'اختبار جديد متاح',
            content: `تم نشر اختبار جديد: ${examData.title}`,
            type: 'exam',
            link: `/exams/${finalExamId}`
          }));
          await adminSupabase.from('notifications').insert(notificationPayloads);
        }
      } catch (notifErr) {
        console.error('Error sending exam notifications:', notifErr);
      }
    }

    return NextResponse.json({ success: true, examId: finalExamId });

  } catch (error: any) {
    console.error('Exam Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

