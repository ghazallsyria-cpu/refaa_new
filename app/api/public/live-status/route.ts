// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kwtTime = new Date(utc + (3 * 3600000));
    const currentDayOfWeek = kwtTime.getDay() + 1; 
    const timeInMinutes = kwtTime.getHours() * 60 + kwtTime.getMinutes();

    const { data: settings } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    const activeSystem = settings?.active_schedule_system || 'manual';
    const scheduleTable = activeSystem === 'auto' ? 'schedules' : 'schedule';

    const { data: periods } = await supabase.from('periods').select('*').order('period_number', { ascending: true });
    if (!periods || periods.length === 0) return NextResponse.json({ status: { type: 'closed' }, classes: [] });

    let activePeriodNum = null;
    let timeStatus: any = null;

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const [startH, startM] = p.start_time.split(':').map(Number);
      const [endH, endM] = p.end_time.split(':').map(Number);
      if (timeInMinutes >= (startH * 60 + startM) && timeInMinutes <= (endH * 60 + endM)) {
        activePeriodNum = p.period_number;
        timeStatus = { type: 'class', period: activePeriodNum };
        break;
      }
      if (i < periods.length - 1) {
        const nextP = periods[i + 1];
        const [nextStartH, nextStartM] = nextP.start_time.split(':').map(Number);
        if (timeInMinutes > (endH * 60 + endM) && timeInMinutes < (nextStartH * 60 + nextStartM)) {
           timeStatus = { type: 'break', name: 'وقت الاستراحة', end: nextP.start_time.substring(0, 5) };
           break;
        }
      }
    }

    if (!timeStatus) return NextResponse.json({ status: { type: 'closed' }, classes: [] });

    let activeClasses = [];
    if (activePeriodNum !== null) {
      // 🚀 تم تحديث الاستعلام لجلب رقم المستوى (level) مباشرة
      const { data: scheduleData } = await supabase
        .from(scheduleTable)
        .select(`
          id,
          subjects (name),
          sections (id, name, classes(name, level)),
          teachers (zoom_link, users(full_name))
        `)
        .eq('day_of_week', currentDayOfWeek)
        .eq('period', activePeriodNum);

      if (scheduleData) {
        const uniqueSections = new Map();
        scheduleData.forEach(s => {
           const sec = Array.isArray(s.sections) ? s.sections[0] : s.sections;
           const cls = Array.isArray(sec?.classes) ? sec.classes[0] : sec?.classes;
           const u = Array.isArray(s.teachers?.users) ? s.teachers.users[0] : s.teachers?.users;
           
           if (sec?.id && !uniqueSections.has(sec.id)) {
             uniqueSections.set(sec.id, {
               id: s.id,
               subject_name: s.subjects?.name || 'مادة',
               class_name: `${cls?.name || ''} - ${sec?.name || ''}`,
               teacher_name: u?.full_name || 'معلم',
               zoom_link: s.teachers?.zoom_link || null,
               level: cls?.level || 0 // 🚀 إرسال رقم المستوى للجبهة الأمامية
             });
           }
        });
        activeClasses = Array.from(uniqueSections.values());
      }
    }

    return NextResponse.json({ status: timeStatus, classes: activeClasses });
  } catch (error) {
    return NextResponse.json({ status: { type: 'closed' }, classes: [] }, { status: 500 });
  }
}
