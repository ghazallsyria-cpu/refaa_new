import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { messageIds, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from('messages')
      .delete()
      .in('id', messageIds);
    
    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Message Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
