import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { teacherId, assignments, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const assignmentsToInsert = assignments.map((a: any) => ({
      teacher_id: teacherId,
      section_id: a.section_id,
      subject_id: a.subject_id
    }));

    const { error } = await adminSupabase
      .from('teacher_sections')
      .insert(assignmentsToInsert);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Teacher Assignments Save Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
