import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, name, code } = await req.json();

    if (id) {
      // Update
      const { error } = await adminSupabase
        .from('subjects')
        .update({ name, code })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    } else {
      // Insert
      const { data, error } = await adminSupabase
        .from('subjects')
        .insert([{ name, code }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error('Save Subject Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
