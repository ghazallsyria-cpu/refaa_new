import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, settings } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString(),
      ...settings
    };

    // Convert dates to ISO if they exist
    if (settings.open_date) updateData.open_date = new Date(settings.open_date).toISOString();
    if (settings.close_date) updateData.close_date = new Date(settings.close_date).toISOString();

    if (settings.id) {
      const { error } = await adminSupabase
        .from('platform_settings')
        .update(updateData)
        .eq('id', settings.id);
      if (error) throw error;
    } else {
      const { error } = await adminSupabase
        .from('platform_settings')
        .insert([updateData]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Platform Settings Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
