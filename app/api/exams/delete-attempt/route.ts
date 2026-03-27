import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { attemptId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 });
    }

    const { error } = await adminSupabase.from('exam_attempts').delete().eq('id', attemptId);
    
    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Exam Attempt Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
