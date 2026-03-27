import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { teacherId, oldSectionId, oldSubjectId, newSectionId, newSubjectId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from('teacher_sections')
      .update({
        section_id: newSectionId,
        subject_id: newSubjectId
      })
      .eq('teacher_id', teacherId)
      .eq('section_id', oldSectionId)
      .eq('subject_id', oldSubjectId);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Teacher Assignment Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
