import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { studentId, updateData, newEmail } = await req.json();

    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name: updateData.full_name,
        email: newEmail,
        phone: updateData.phone
      })
      .eq('id', studentId);

    if (userError) throw userError;

    const { error: studentError } = await adminSupabase
      .from('students')
      .update({
        national_id: updateData.national_id,
        parent_id: updateData.parent_id || null
      })
      .eq('id', studentId);

    if (studentError) throw studentError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Student Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
