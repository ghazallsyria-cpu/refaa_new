import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveAssignmentRequestSchema } from '@/lib/validations';
import { normalizePayload } from '@/lib/utils';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveAssignmentRequestSchema);
    const { payload, assignmentId, questions, sectionIds, subjects, userId } = validatedData;

    // ✅ الإصلاح الجذري: البحث عن المعرف الحقيقي للمعلم قبل الحفظ
    if (!payload.teacher_id && userId) {
      const { data: teacherProfile, error: teacherError } = await adminSupabase
        .from('teachers')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (teacherError || !teacherProfile) {
        return NextResponse.json(
          { error: 'لم يتم العثور على ملف المعلم المرتبط بحسابك. لا يمكن حفظ الواجب.' },
          { status: 400 }
        );
      }
      // تعيين المعرف الحقيقي!
      payload.teacher_id = teacherProfile.id; 
    }

    let finalAssignmentId = assignmentId;
    const normalizedPayload = normalizePayload(payload);

    if (finalAssignmentId) {
      // Update existing assignment
      const { error } = await adminSupabase
        .from('assignments')
        .update(normalizedPayload)
        .eq('id', finalAssignmentId);
      if (error) throw error;

      await adminSupabase.from('assignment_questions').delete().eq('assignment_id', finalAssignmentId);
    } else {
      // Insert new assignment
      const { data: newAssignment, error } = await adminSupabase
        .from('assignments')
        .insert([normalizedPayload])
        .select()
        .single();
        
      if (error) throw error;
      if (!newAssignment) throw new Error('Failed to create assignment');
      
      finalAssignmentId = newAssignment.id;

      // Send Notifications (✅ تم إصلاح الإشعارات لتصل للطلاب)
      try {
        const { data: students } = await adminSupabase
          .from('students')
          .select('id, user_id')
          .in('section_id', sectionIds || []);

        if (students && students.length > 0) {
          const subjectName = subjects.find((s: any) => s.id === payload.subject_id)?.name || 'المادة';
          const notificationPayloads = students.map((student: any) => ({
            user_id: student.user_id || student.id, // نستخدم حساب الدخول للطالب
            title: 'واجب جديد متاح',
            content: `تمت إضافة واجب جديد في مادة ${subjectName}: ${payload.title}`,
            type: 'assignment',
            link: `/assignments/${finalAssignmentId}`
          }));
          await adminSupabase.from('notifications').insert(notificationPayloads);
        }
      } catch (notifErr) {
        console.error('Error sending assignment notifications:', notifErr);
      }
    }

    // Save Questions
    if (questions && questions.length > 0) {
      const questionsPayload = questions.map((q: any, index: number) => ({
        assignment_id: finalAssignmentId,
        question_text: q.content,
        question_type: q.type,
        options: q.options || null,
        points: q.points || 0,
        is_required: q.isRequired || false,
        order: index
      }));
      const { error: qError } = await adminSupabase.from('assignment_questions').insert(questionsPayload);
      if (qError) throw qError;
    }

    // Save Sections
    if (finalAssignmentId) {
      await adminSupabase.from('assignment_sections').delete().eq('assignment_id', finalAssignmentId);
      if (sectionIds && sectionIds.length > 0) {
        const sectionsToInsert = sectionIds.map((sId: string) => ({
          assignment_id: finalAssignmentId,
          section_id: sId
        }));
        const { error: sectionsError } = await adminSupabase.from('assignment_sections').insert(sectionsToInsert);
        if (sectionsError) throw sectionsError;
      }
    }

    return NextResponse.json({ id: finalAssignmentId });

  } catch (error: unknown) {
    return handleApiError(error, 'Save Assignment');
  }
}

