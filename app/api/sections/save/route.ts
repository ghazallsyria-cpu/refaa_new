import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, name, classId } = await req.json();

    if (id) {
      // Update
      const { error } = await adminSupabase
        .from('sections')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await adminSupabase
        .from('sections')
        .insert([{ name, class_id: classId }]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Save Section Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
