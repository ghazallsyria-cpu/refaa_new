// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🚀 إجبار السيرفر على عدم تخزين النتيجة (لضمان تحديث الحصص لحظة بلحظة)
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // استخدام Service Role لتخطي حماية RLS لصفحة البث العامة
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1️⃣ حساب توقيت الكويت الدقيق 
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kwtTime = new Date(utc + (3 * 3600000)); // Kuwait is UTC+3
    
    // تأمين اصطياد اليوم بغض النظر عن نظام الترقيم في قاعدة بياناتك (0-6 أو 1-7)
    const dayIndex1 = kwtTime.getDay(); 
    const dayIndex2 = kwtTime.getDay() + 1; 
    
    const currentHour = kwtTime.getHours();
    const currentMinute = kwtTime.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;

    // 2️⃣ جلب النظام المفعل (يدوي أم ذكي)
    const { data: settings } = await supabase
      .from('school_settings')
      .select('active_schedule_system')
      .eq('id', 1)
      .maybeSingle();

    const activeSystem = settings?.active_schedule_system || 'manual';
    
    // 🚀 تصحيح أسماء الجداول بناءً على المخطط (Schema) الخاص بك
    const scheduleTable = activeSystem === 'auto' ? 'schedules' : 'schedule';

    // 3️⃣ جلب أوقات الحصص الرسمية
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .order('period_number', { ascending: true });

    if (periodsError || !periods || periods.length === 0) {
      return NextResponse.json({ status: { type: 'closed', message: 'نظام الأوقات غير مهيأ' }, classes: [] });
    }

    // 4️⃣ تحديد حالة المدرسة الآن
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

    // 5️⃣ جلب الحصص النشطة 
    let activeClasses = [];
    if (activePeriodNum !== null) {
      // 🚀 البحث بـ IN لليومين لضمان عدم ضياع أي حصة بسبب فوارق الترقيم
      const { data: scheduleData, error: scheduleError } = await supabase
        .from(scheduleTable)
        .select(`
          id,
          day_of_week,
          period,
          subjects (name),
          sections (name, classes(name)),
          teachers (zoom_link, users(full_name))
        `)
        .in('day_of_week', [dayIndex1, dayIndex2])
        .eq('period', activePeriodNum);

      if (scheduleData) {
        activeClasses = scheduleData.map(s => {
           const classObj = Array.isArray(s.sections?.classes) ? s.sections.classes[0] : s.sections?.classes;
           const u = Array.isArray(s.teachers?.users) ? s.teachers.users[0] : s.teachers?.users;
           
           return {
             id: s.id,
             subject_name: s.subjects?.name || 'مادة غير محددة',
             class_name: `${classObj?.name || ''} - ${s.sections?.name || ''}`,
             teacher_name: u?.full_name || 'معلم غير محدد',
             zoom_link: s.teachers?.zoom_link || null
           };
        });
      }
    }

    return NextResponse.json({
      status: timeStatus,
      classes: activeClasses
    });

  } catch (error: any) {
    console.error('Live status API Error:', error);
    return NextResponse.json({ status: { type: 'closed', message: 'خطأ في جلب البيانات' }, classes: [] }, { status: 500 });
  }
}
