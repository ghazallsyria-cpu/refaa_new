import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, ...scheduleData } = await req.json();

    if (id) {
      // Update
      const { data, error } = await adminSupabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Insert
      const { data, error } = await adminSupabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

  } catch (error: any) {
    console.error('Save Schedule Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
