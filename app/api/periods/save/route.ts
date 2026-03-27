import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const periodData = await req.json();

    const { data, error } = await adminSupabase
      .from('class_periods')
      .insert([periodData])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Save Period Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
