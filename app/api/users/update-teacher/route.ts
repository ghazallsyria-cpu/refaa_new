import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { teacherId, updateData, newEmail } = await req.json();

    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name: updateData.full_name,
        email: newEmail,
        phone: updateData.phone
      })
      .eq('id', teacherId);

    if (userError) throw userError;

    const { error: teacherError } = await adminSupabase
      .from('teachers')
      .update({
        national_id: updateData.national_id,
        specialization: updateData.specialization,
        zoom_link: updateData.zoom_link
      })
      .eq('id', teacherId);

    if (teacherError) throw teacherError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Teacher Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
