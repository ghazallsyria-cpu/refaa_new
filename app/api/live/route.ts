import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. توقيت الكويت (UTC+3)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kuwaitTime = new Date(utc + (3 * 3600000));
    
    const currentHour = kuwaitTime.getHours();
    const currentMinute = kuwaitTime.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
    
    // يوم الأسبوع (الأحد = 1)
    const jsDay = kuwaitTime.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 : jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    // جلب الحصص باستخدام مفتاح الإدارة لتخطي RLS لأن الزائر غير مسجل دخول
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

    if (dbDay === 0 || dbDay > 5) {
      return NextResponse.json({ status: { type: 'closed', message: 'عطلة نهاية الأسبوع' }, classes: [] });
    }

    // 2. 🚀 استكشاف النظام الفعال
    const { data: settings } = await adminSupabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    const activeSystem = settings?.active_schedule_system || 'manual';

    // 3. 🚀 جلب فترات الحصص (الأوقات)
    let periods: any[] = [];
    if (activeSystem === 'auto') {
        const { data } = await adminSupabase.from('auto_class_periods').select('*');
        periods = data || [];
    } else {
        const { data } = await adminSupabase.from('class_periods').select('*');
        periods = data || [];
    }

    if (periods.length === 0) {
        return NextResponse.json({ status: { type: 'closed', message: 'لا توجد أوقات مسجلة' }, classes: [] });
    }

    periods.sort((a, b) => a.period_number - b.period_number);

    // 4. 🚀 تحديد الفترات الفعالة "الآن" بدقة
    const activePeriods = periods.filter(p => currentTimeStr >= p.start_time.slice(0,5) && currentTimeStr < p.end_time.slice(0,5));

    // 🚀 كاشف الفراغات الذكي (الاستراحات)
    if (activePeriods.length === 0) {
        const sortedUnique = [...periods].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const firstStart = sortedUnique[0].start_time.slice(0, 5);
        const lastEnd = sortedUnique[sortedUnique.length - 1].end_time.slice(0, 5);

        let currentStatus: any = { type: 'closed', message: 'المدرسة مغلقة حالياً' };

        if (currentTimeStr < firstStart) {
             currentStatus = { type: 'closed', message: 'قبل بدء الدوام المدرسي' };
        } else if (currentTimeStr >= lastEnd) {
             currentStatus = { type: 'closed', message: 'انتهى الدوام المدرسي' };
        } else {
             currentStatus = { type: 'break', name: 'استراحة / فرصة' };
        }

        return NextResponse.json({ status: currentStatus, classes: [] });
    }

    const activePeriodNumbers = [...new Set(activePeriods.map(p => p.period_number))];
    const currentStatus = { type: 'class', period: activePeriodNumbers[0] }; // نأخذ رقم الفترة الأولى للعرض

    // 5. 🚀 جلب الحصص المباشرة من النظام الفعال
    let schedulesData: any[] = [];

    if (activeSystem === 'auto') {
        const { data: planData } = await adminSupabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (planData) {
            const { data } = await adminSupabase.from('auto_schedules')
                .select(`
                    id, period_number, section_id,
                    subjects(name), 
                    sections(name, classes(name)), 
                    teachers(zoom_link, users(full_name))
                `)
                .eq('plan_id', planData.id)
                .eq('day_of_week', dbDay)
                .in('period_number', activePeriodNumbers);

            if (data) {
                // فلترة دقيقة لضمان عدم عرض حصص مرحلة إذا كانت في استراحة
                schedulesData = data.filter((cls: any) => {
                    const section: any = Array.isArray(cls.sections) ? cls.sections[0] : cls.sections;
                    const className = Array.isArray(section?.classes) ? section?.classes[0]?.name : section?.classes?.name;
                    let stage = 'high';
                    if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className || '')) stage = 'middle';
                    return activePeriods.some(ap => ap.period_number === cls.period_number && ap.stage === stage);
                }).map((s: any) => ({ ...s, period: s.period_number }));
            }
        }
    } else {
        const { data } = await adminSupabase.from('schedules')
            .select(`
                id, period, 
                subjects(name), 
                sections(name, classes(name)), 
                teachers(zoom_link, users(full_name))
            `)
            .eq('day_of_week', dbDay)
            .in('period', activePeriodNumbers);
        if (data) schedulesData = data;
    }

    const activeClasses = schedulesData.map((s: any) => {
      const subject: any = Array.isArray(s.subjects) ? s.subjects[0] : s.subjects;
      const section: any = Array.isArray(s.sections) ? s.sections[0] : s.sections;
      const tClass: any = Array.isArray(section?.classes) ? section?.classes[0] : section?.classes;
      const teacher: any = Array.isArray(s.teachers) ? s.teachers[0] : s.teachers;
      const user: any = Array.isArray(teacher?.users) ? teacher?.users[0] : teacher?.users;

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
    console.error('Public Live Status API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
