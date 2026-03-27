import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, title, description, file_url, category } = await req.json();

    const payload = {
      title,
      description: description || null,
      file_url,
      category,
    };

    if (id) {
      // Update
      const { data, error } = await adminSupabase
        .from('documents')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    } else {
      // Insert
      const { data, error } = await adminSupabase
        .from('documents')
        .insert([payload])
        .select()
        .single();
        
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }
  } catch (error: any) {
    console.error('Save Document Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
