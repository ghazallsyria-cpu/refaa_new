import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { sourceId, sourceDay, sourcePeriod, targetId, targetDay, targetPeriod } = await req.json();

    if (targetId) {
      // Swap two lessons
      const { error: err1 } = await adminSupabase
        .from('schedules')
        .update({ day_of_week: sourceDay, period: sourcePeriod })
        .eq('id', targetId);
      
      if (err1) throw err1;

      const { error: err2 } = await adminSupabase
        .from('schedules')
        .update({ day_of_week: targetDay, period: targetPeriod })
        .eq('id', sourceId);
      
      if (err2) throw err2;
    } else {
      // Move to empty slot
      const { error } = await adminSupabase
        .from('schedules')
        .update({ day_of_week: targetDay, period: targetPeriod })
        .eq('id', sourceId);
      
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Swap Schedules Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
