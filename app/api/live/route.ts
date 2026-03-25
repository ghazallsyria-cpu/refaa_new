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

    // Fixed schedule logic
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0');

    const FIXED_SCHEDULE = [
      { period: 1, start: '09:00', end: '09:35', type: 'class' },
      { period: 1.5, start: '09:35', end: '09:40', type: 'break', name: 'استراحة قصيرة' },
      { period: 2, start: '09:40', end: '10:15', type: 'class' },
      { period: 2.5, start: '10:15', end: '10:30', type: 'break', name: 'استراحة طويلة' },
      { period: 3, start: '10:30', end: '11:05', type: 'class' },
      { period: 3.5, start: '11:05', end: '11:10', type: 'break', name: 'استراحة قصيرة' },
      { period: 4, start: '11:10', end: '11:45', type: 'class' },
      { period: 4.5, start: '11:45', end: '12:00', type: 'break', name: 'استراحة طويلة' },
      { period: 5, start: '12:00', end: '12:35', type: 'class' },
    ];

    const currentItem = FIXED_SCHEDULE.find(item => 
      currentTimeStr >= item.start && currentTimeStr < item.end
    );

    if (!currentItem) {
      return NextResponse.json({ 
        classes: [], 
        currentPeriod: null,
        message: 'لا توجد حصص حالياً' 
      });
    }

    if (currentItem.type === 'break') {
      return NextResponse.json({
        classes: [],
        currentPeriod: {
          period_number: currentItem.period,
          start_time: currentItem.start,
          end_time: currentItem.end,
          isBreak: true,
          breakName: currentItem.name
        },
        message: currentItem.name
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
      .eq('period', currentItem.period);

    if (schedulesError) throw schedulesError;

    return NextResponse.json({
      classes: schedules,
      currentPeriod: {
        period_number: currentItem.period,
        start_time: currentItem.start,
        end_time: currentItem.end,
        isBreak: false
      },
      currentTime: currentTimeStr
    });
  } catch (error: any) {
    console.error('Live API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
