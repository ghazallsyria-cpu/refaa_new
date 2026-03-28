import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveTeacherAssignmentsRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveTeacherAssignmentsRequestSchema);
    const { teacherId, assignments } = validatedData;

    const assignmentsToInsert = assignments.map((a) => ({
      teacher_id: teacherId,
      section_id: a.section_id,
      subject_id: a.subject_id
    }));

    const { error } = await adminSupabase
      .from('teacher_sections')
      .insert(assignmentsToInsert);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, 'Save Teacher Assignments');
  }
}
