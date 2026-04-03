import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// جدول التوقيتات المدرسي (حسب طلبك)
const TIMETABLE = [
  { type: 'class', period: 1, start: '09:00', end: '09:35' },
  { type: 'break', name: 'استراحة قصيرة', start: '09:35', end: '09:40' },
  { type: 'class', period: 2, start: '09:40', end: '10:15' },
  { type: 'break', name: 'الفسحة الأولى', start: '10:15', end: '10:30' },
  { type: 'class', period: 3, start: '10:30', end: '11:05' },
  { type: 'break', name: 'استراحة قصيرة', start: '11:05', end: '11:10' },
  { type: 'class', period: 4, start: '11:10', end: '11:45' },
  { type: 'break', name: 'الفسحة الثانية', start: '11:45', end: '12:00' },
  { type: 'class', period: 5, start: '12:00', end: '12:35' },
];

export async function GET() {
  try {
    // توقيت الكويت (UTC+3)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kuwaitTime = new Date(utc + (3 * 3600000));
    
    const currentHour = kuwaitTime.getHours();
    const currentMinute = kuwaitTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // يوم الأسبوع (الأحد = 1)
    const jsDay = kuwaitTime.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 : jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    // تحديد الحالة الحالية (حصة، استراحة، أو مغلق)
    let currentStatus: any = { type: 'closed', message: 'المدرسة مغلقة حالياً' };
    
    for (const slot of TIMETABLE) {
      if (currentTimeStr >= slot.start && currentTimeStr < slot.end) {
        currentStatus = slot;
        break;
      }
    }

    if (dbDay === 0 || dbDay > 5) {
      currentStatus = { type: 'closed', message: 'عطلة نهاية الأسبوع' };
    }

    // إذا كانت المدرسة مغلقة أو في استراحة، لا داعي لجلب الجدول
    if (currentStatus.type !== 'class') {
      return NextResponse.json({ status: currentStatus, classes: [] });
    }

    // جلب الحصص باستخدام مفتاح الإدارة لتخطي RLS لأن الزائر غير مسجل دخول
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    const { data: schedules } = await adminSupabase
      .from('schedules')
      .select(`
        id, 
        period, 
        subjects(name), 
        sections(name, classes(name)), 
        teachers(zoom_link, users(full_name))
      `)
      .eq('day_of_week', dbDay)
      .eq('period', currentStatus.period);

    const activeClasses = (schedules || []).map((s: any) => {
      const subject = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
      const section = Array.isArray(s.sections) ? s.sections[0] : s.sections;
      const tClass = Array.isArray(section?.classes) ? section?.classes[0] : section?.classes;
      const teacher = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers;
      const user = Array.isArray(teacher?.users) ? teacher?.users[0] : teacher?.users;

      return {
        id: s.id,
        subject_name: subject?.name || 'مادة عامة',
        class_name: `${tClass?.name || ''} - ${section?.name || ''}`,
        teacher_name: user?.full_name || 'معلم',
        zoom_link: teacher?.zoom_link || null
      };
    });

    return NextResponse.json({ status: currentStatus, classes: activeClasses });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
