import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { subjectId, teacherIds } = await req.json();

    // First, delete existing assignments for this subject
    const { error: deleteError } = await adminSupabase
      .from('teacher_subjects')
      .delete()
      .eq('subject_id', subjectId);
      
    if (deleteError) throw deleteError;
    
    // Then, insert new assignments if any
    if (teacherIds.length > 0) {
      const newAssignments = teacherIds.map((teacherId: string) => ({
        subject_id: subjectId,
        teacher_id: teacherId
      }));
      
      const { error: insertError } = await adminSupabase
        .from('teacher_subjects')
        .insert(newAssignments);
        
      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Save Teacher Assignments Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
