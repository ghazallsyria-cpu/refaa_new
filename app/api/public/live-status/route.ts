// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🚀 إجبار السيرفر على جلب بيانات جديدة دائماً وعدم تخزينها
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1️⃣ حساب توقيت الكويت الدقيق
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kwtTime = new Date(utc + (3 * 3600000));
    
    // 🚀 قراءة اليوم الحالي بدقة تامة (نظام الرفعة: الأحد=1, الاثنين=2...)
    const currentDayOfWeek = kwtTime.getDay() + 1; 
    
    const currentHour = kwtTime.getHours();
    const currentMinute = kwtTime.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;

    const { data: settings } = await supabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    const activeSystem = settings?.active_schedule_system || 'manual';
    const scheduleTable = activeSystem === 'auto' ? 'schedules' : 'schedule';

    const { data: periods, error: periodsError } = await supabase.from('periods').select('*').order('period_number', { ascending: true });

    if (periodsError || !periods || periods.length === 0) {
      return NextResponse.json({ status: { type: 'closed', message: 'نظام الأوقات غير مهيأ' }, classes: [] });
    }

    let activePeriodNum = null;
    let timeStatus: any = null;

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const [startH, startM] = p.start_time.split(':').map(Number);
      const [endH, endM] = p.end_time.split(':').map(Number);
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      if (timeInMinutes >= startMins && timeInMinutes <= endMins) {
        activePeriodNum = p.period_number;
        timeStatus = { type: 'class', period: activePeriodNum };
        break;
      }

      if (i < periods.length - 1) {
        const nextP = periods[i + 1];
        const [nextStartH, nextStartM] = nextP.start_time.split(':').map(Number);
        if (timeInMinutes > endMins && timeInMinutes < (nextStartH * 60 + nextStartM)) {
           timeStatus = { type: 'break', name: 'وقت الاستراحة', start: p.end_time.substring(0, 5), end: nextP.start_time.substring(0, 5) };
           break;
        }
      }
    }

    if (!timeStatus) {
      return NextResponse.json({ status: { type: 'closed', message: 'انتهى الدوام أو لم يبدأ بعد' }, classes: [] });
    }

    let activeClasses = [];
    if (activePeriodNum !== null) {
      // 🚀 جلب حصص اليوم الحالي فقققققط لمنع الازدواجية
      const { data: scheduleData } = await supabase
        .from(scheduleTable)
        .select(`
          id,
          period,
          subjects (name),
          sections (id, name, classes(name)),
          teachers (zoom_link, users(full_name))
        `)
        .eq('day_of_week', currentDayOfWeek)
        .eq('period', activePeriodNum);

      if (scheduleData) {
        // 🚀 مصفاة التنظيف: نمنع نهائياً ظهور أي فصل (Section) مرتين في نفس الحصة
        const uniqueSections = new Map();
        
        scheduleData.forEach(s => {
           const sectionId = Array.isArray(s.sections) ? s.sections[0]?.id : s.sections?.id;
           const classObj = Array.isArray(s.sections?.classes) ? s.sections.classes[0] : s.sections?.classes;
           const u = Array.isArray(s.teachers?.users) ? s.teachers.users[0] : s.teachers?.users;
           
           if (sectionId && !uniqueSections.has(sectionId)) {
             uniqueSections.set(sectionId, {
               id: s.id,
               subject_name: s.subjects?.name || 'مادة غير محددة',
               class_name: `${classObj?.name || ''} - ${s.sections?.name || ''}`,
               teacher_name: u?.full_name || 'معلم غير محدد',
               zoom_link: s.teachers?.zoom_link || null
             });
           }
        });
        
        activeClasses = Array.from(uniqueSections.values());
      }
    }

    return NextResponse.json({
      status: timeStatus,
      classes: activeClasses
    });

  } catch (error: any) {
    return NextResponse.json({ status: { type: 'closed', message: 'خطأ في جلب البيانات' }, classes: [] }, { status: 500 });
  }
}
