import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const GradeAssignmentRequestSchema = z.object({
  submissionId: z.string().uuid(),
  grade: z.number().min(0),
  feedback: z.string().optional().nullable(),
  studentId: z.string().uuid(),
  assignmentTitle: z.string(),
});

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validatedData = GradeAssignmentRequestSchema.parse(body);
    const { submissionId, grade, feedback, studentId, assignmentTitle } = validatedData;

    const { error } = await adminSupabase
      .from('assignment_submissions')
      .update({
        grade,
        feedback: feedback || null,
        status: 'graded',
        graded_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (error) throw error;

    // Notify student
    try {
      await adminSupabase.from('notifications').insert([{
        user_id: studentId,
        type: 'assignment',
        title: 'تم تقييم الواجب',
        content: `تم تقييم واجبك: ${assignmentTitle}. حصلت على ${grade}`,
        link: `/assignments/${submissionId}`,
        is_read: false
      }]);
    } catch (notifErr) {
      console.error('Error sending student notification:', notifErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Grade Assignment Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
