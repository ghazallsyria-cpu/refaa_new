import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveExamRequestSchema } from '@/lib/validations';
import { normalizePayload } from '@/lib/utils';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveExamRequestSchema);
    const { examData, questions, isNew, userId } = validatedData;

    // Validation: Check if total question points equal exam max_score
    const totalPoints = questions.reduce((sum: number, q: any) => sum + (Number(q.points) || 0), 0);
    if (totalPoints !== Number(examData.max_score)) {
      return NextResponse.json(
        { error: `مجموع درجات الأسئلة (${totalPoints}) لا يساوي الدرجة الكلية للاختبار (${examData.max_score})` },
        { status: 400 }
      );
    }

    let finalExamId = examData.id;
    let finalTeacherId = examData.teacher_id;

    // Ensure teacher_id is set if missing
    if (!finalTeacherId && userId) {
      finalTeacherId = userId;
    }

    const examPayload = normalizePayload({
      title: examData.title,
      description: examData.description,
      subject_id: examData.subject_id,
      teacher_id: finalTeacherId,
      duration: examData.duration,
      max_attempts: examData.max_attempts,
      max_score: examData.max_score,
      total_marks: examData.max_score, // Keep in sync with max_score
      exam_date: examData.exam_date,
      start_time: examData.start_time,
      end_time: examData.end_time,
      status: examData.status,
      settings: examData.settings
    });

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

    // Handle sections
    if (!isNew && finalExamId) {
      await adminSupabase.from('exam_sections').delete().eq('exam_id', finalExamId);
    }

    if (examData.section_ids && examData.section_ids.length > 0 && finalExamId) {
      const sectionsToInsert = examData.section_ids.map((sectionId: string) => ({
        exam_id: finalExamId,
        section_id: sectionId
      }));
      const { error: sectionsError } = await adminSupabase.from('exam_sections').insert(sectionsToInsert);
      if (sectionsError) throw sectionsError;
    }

    // Handle questions
    if (!isNew && finalExamId) {
      const { data: oldQuestions } = await adminSupabase.from('questions').select('id').eq('exam_id', finalExamId);
      if (oldQuestions && oldQuestions.length > 0) {
        const oldQuestionIds = oldQuestions.map(q => q.id);
        await adminSupabase.from('question_options').delete().in('question_id', oldQuestionIds);
      }
      await adminSupabase.from('questions').delete().eq('exam_id', finalExamId);
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionPayload = normalizePayload({
        exam_id: finalExamId,
        type: q.type,
        content: q.content,
        points: q.points,
        explanation: q.explanation,
        media_url: q.media_url,
        media_type: q.media_type,
        order_index: i
      });

      const { data: newQ, error: qError } = await adminSupabase
        .from('questions')
        .insert([questionPayload])
        .select()
        .single();

      if (qError) throw qError;

      if (q.options && q.options.length > 0) {
        const optionsPayload = q.options.map((opt: any, index: number) => ({
          question_id: newQ.id,
          content: opt.content,
          is_correct: opt.is_correct,
          order_index: index
        }));
        const { error: optError } = await adminSupabase.from('question_options').insert(optionsPayload);
        if (optError) throw optError;
      }
    }

    // Send notifications if published
    if (examData.status === 'published' && examData.section_ids && examData.section_ids.length > 0 && finalExamId) {
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

  } catch (error: unknown) {
    return handleApiError(error, 'Save Exam');
  }
}
