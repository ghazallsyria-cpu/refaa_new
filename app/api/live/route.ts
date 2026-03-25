import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get current day and time
    const now = new Date();
    // JS getDay() 0=Sun, 1=Mon, ..., 6=Sat
    // DB day_of_week 1=Sun, 2=Mon, ..., 5=Thu
    const jsDay = now.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                  jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    if (dbDay === 0) {
      return NextResponse.json({ 
        classes: [], 
        currentPeriod: null,
        message: 'اليوم عطلة نهاية الأسبوع' 
      });
    }

    // Get all class periods to find the current one
    const { data: periods, error: periodsError } = await adminSupabase
      .from('class_periods')
      .select('*')
      .order('period_number');

    if (periodsError) throw periodsError;

    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                        now.getMinutes().toString().padStart(2, '0') + ':00';

    const currentPeriod = periods.find(p => 
      currentTime >= p.start_time && currentTime <= p.end_time
    );

    if (!currentPeriod) {
      return NextResponse.json({ 
        classes: [], 
        currentPeriod: null,
        message: 'لا توجد حصص حالياً' 
      });
    }

    // Get all schedules for the current day and period
    const { data: schedules, error: schedulesError } = await adminSupabase
      .from('schedules')
      .select(`
        id,
        period,
        sections (
          id,
          name,
          classes (
            id,
            name
          )
        ),
        subjects (
          id,
          name
        ),
        teachers (
          id,
          specialization,
          zoom_link,
          users (
            full_name,
            avatar_url
          )
        )
      `)
      .eq('day_of_week', dbDay)
      .eq('period', currentPeriod.period_number);

    if (schedulesError) throw schedulesError;

    return NextResponse.json({
      classes: schedules,
      currentPeriod,
      currentTime
    });
  } catch (error: any) {
    console.error('Live API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
