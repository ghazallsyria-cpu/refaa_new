import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AssignmentAnswerSchema } from '@/lib/validations';

const SubmitAssignmentRequestSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  studentName: z.string(),
  answersPayload: z.array(AssignmentAnswerSchema.omit({ id: true, submission_id: true })),
  submissionId: z.string().uuid().optional().nullable(),
});

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validatedData = SubmitAssignmentRequestSchema.parse(body);
    const { assignmentId, studentId, studentName, answersPayload, submissionId } = validatedData;

    let currentSubmissionId = submissionId;

    if (currentSubmissionId) {
      // Update existing submission
      const { error } = await adminSupabase
        .from('assignment_submissions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', currentSubmissionId);
      
      if (error) throw error;
      
      // Delete old answers
      await adminSupabase.from('assignment_answers').delete().eq('submission_id', currentSubmissionId);
    } else {
      // Create new submission
      const { data: newSub, error } = await adminSupabase
        .from('assignment_submissions')
        .insert([{
          assignment_id: assignmentId,
          student_id: studentId,
          status: 'submitted'
        }])
        .select()
        .single();
        
      if (error) throw error;
      if (!newSub) throw new Error('Failed to create submission');
      currentSubmissionId = newSub.id;
    }

    // Insert answers
    const finalAnswersPayload = answersPayload.map((a) => ({
      ...a,
      submission_id: currentSubmissionId
    }));

    const { error: answersError } = await adminSupabase.from('assignment_answers').insert(finalAnswersPayload);
    if (answersError) throw answersError;

    // Notify teacher
    try {
      const { data: assignmentInfo } = await adminSupabase
        .from('assignments')
        .select('title, teacher_id')
        .eq('id', assignmentId)
        .single();
      
      if (assignmentInfo?.teacher_id) {
        await adminSupabase.from('notifications').insert([{
          user_id: assignmentInfo.teacher_id,
          type: 'assignment',
          title: 'تسليم واجب جديد',
          content: `قام الطالب ${studentName} بتسليم واجب: ${assignmentInfo.title}`,
          link: `/assignments/${assignmentId}/submissions/${currentSubmissionId}`,
          is_read: false
        }]);
      }
    } catch (notifErr) {
      console.error('Error sending teacher notification:', notifErr);
    }

    return NextResponse.json({ id: currentSubmissionId });

  } catch (error: unknown) {
    console.error('Submit Assignment Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
