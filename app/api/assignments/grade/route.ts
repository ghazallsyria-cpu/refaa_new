import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { submissionId, grade, feedback, studentId, assignmentTitle } = await req.json();

    const { error } = await adminSupabase
      .from('assignment_submissions')
      .update({
        grade,
        feedback,
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

  } catch (error: any) {
    console.error('Grade Assignment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
