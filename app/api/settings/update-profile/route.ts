import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, full_name, phone, role, zoom_link } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { error: userError } = await adminSupabase
      .from('users')
      .update({
        full_name,
        phone
      })
      .eq('id', userId);

    if (userError) throw userError;

    if (role === 'teacher') {
      const { error: teacherError } = await adminSupabase
        .from('teachers')
        .update({
          zoom_link
        })
        .eq('id', userId);
      if (teacherError) throw teacherError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Profile Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
