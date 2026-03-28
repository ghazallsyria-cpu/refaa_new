import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { validateRequest, handleApiError } from '@/lib/api-utils';
import { SubmitAssignmentRequestSchema } from '@/lib/validations';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SubmitAssignmentRequestSchema);
    const { assignmentId, studentId, studentName, answers, submissionId } = validatedData;

    let finalSubmissionId = submissionId;

    // 1. Create or update submission
    if (finalSubmissionId) {
      const { error: subError } = await adminSupabase
        .from('assignment_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', finalSubmissionId);

      if (subError) throw subError;
      
      // Delete old answers if updating
      await adminSupabase.from('assignment_answers').delete().eq('submission_id', finalSubmissionId);
    } else {
      const { data: submission, error: subError } = await adminSupabase
        .from('assignment_submissions')
        .insert([{
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (subError) throw subError;
      if (!submission) throw new Error('Failed to create submission');
      finalSubmissionId = submission.id;
    }

    // 2. Insert new answers (Raw input only, backend sets grading fields to null)
    const answersToInsert = answers.map((ans) => ({
      submission_id: finalSubmissionId,
      question_id: ans.question_id,
      answer_text: ans.answer_text,
      selected_options: ans.selected_options,
      is_correct: null, // Backend only
      points_earned: null, // Backend only
      feedback: null, // Backend only
    }));

    const { error: answersError } = await adminSupabase
      .from('assignment_answers')
      .insert(answersToInsert);

    if (answersError) throw answersError;

    // 3. Notify teacher
    try {
      const { data: assignment } = await adminSupabase
        .from('assignments')
        .select('teacher_id, title')
        .eq('id', assignmentId)
        .single();

      if (assignment?.teacher_id) {
        await adminSupabase.from('notifications').insert([{
          user_id: assignment.teacher_id,
          type: 'assignment',
          title: 'تسليم واجب جديد',
          content: `قام الطالب ${studentName} بتسليم الواجب: ${assignment.title}`,
          link: `/assignments/${assignmentId}/submissions/${finalSubmissionId}`,
          is_read: false
        }]);
      }
    } catch (notifErr) {
      console.error('Error sending teacher notification:', notifErr);
    }

    return NextResponse.json({ id: finalSubmissionId, status: 'success' });

  } catch (error: unknown) {
    return handleApiError(error, 'Submit Assignment Error');
  }
}
