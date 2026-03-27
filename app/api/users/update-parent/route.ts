import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { parentId, updateData, newEmail } = await req.json();

    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name: updateData.full_name,
        email: newEmail,
        phone: updateData.phone
      })
      .eq('id', parentId);

    if (userError) throw userError;

    const { error: parentError } = await adminSupabase
      .from('parents')
      .update({
        national_id: updateData.national_id,
        job_title: updateData.job_title,
        workplace: updateData.workplace
      })
      .eq('id', parentId);

    if (parentError) throw parentError;

    // Handle student links
    const { error: unlinkError } = await adminSupabase
      .from('students')
      .update({ parent_id: null })
      .eq('parent_id', parentId);
    
    if (unlinkError) throw unlinkError;

    if (updateData.student_ids && updateData.student_ids.length > 0) {
      const { error: linkError } = await adminSupabase
        .from('students')
        .update({ parent_id: parentId })
        .in('id', updateData.student_ids);
      
      if (linkError) throw linkError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Parent Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
