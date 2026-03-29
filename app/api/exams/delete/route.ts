import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { examId, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    if (!examId) {
      return NextResponse.json({ error: 'Missing examId' }, { status: 400 });
    }

    // Delete exam (cascading delete should handle related tables if configured, 
    // otherwise we might need to delete questions/options manually)
    const { error } = await adminSupabase.from('exams').delete().eq('id', examId);
    
    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Exam Delete Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
