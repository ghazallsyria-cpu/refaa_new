import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const SaveTeacherAssignmentsRequestSchema = z.object({
  teacherId: z.string().uuid(),
  assignments: z.array(z.object({
    section_id: z.string().uuid(),
    subject_id: z.string().uuid(),
  })),
  userId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validatedData = SaveTeacherAssignmentsRequestSchema.parse(body);
    const { teacherId, assignments, userId } = validatedData;

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
    console.error('Teacher Assignments Save Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
