// @ts-nocheck
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// إنشاء اتصال بصلاحيات عليا لقراءة الجداول للعامة (Bypass RLS for public display)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  try {
    // 1️⃣ حساب توقيت الكويت الدقيق (السيرفرات السحابية تعمل بـ UTC)
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const kwtTime = new Date(utc + (3 * 3600000)); // Kuwait is UTC+3
    
    const currentDayOfWeek = kwtTime.getDay() + 1; // الأحد = 1، الاثنين = 2...
    const currentHour = kwtTime.getHours();
    const currentMinute = kwtTime.getMinutes();
    const timeInMinutes = currentHour * 60 + currentMinute;

    // 2️⃣ 🌟 السحر هنا: التحقق من النظام المعتمد في المدرسة (يدوي أم ذكاء اصطناعي)
    const { data: settings } = await supabase
      .from('school_settings')
      .select('active_schedule_system')
      .eq('id', 1)
      .maybeSingle();

    const activeSystem = settings?.active_schedule_system || 'manual';
    
    // تحديد الجدول واسم العمود بناءً على النظام الفعال
    const scheduleTable = activeSystem === 'auto' ? 'approved_schedules' : 'schedule';
    const periodColumn = activeSystem === 'auto' ? 'period_number' : 'period';

    // 3️⃣ جلب أوقات الحصص الرسمية
    const { data: periods, error: periodsError } = await supabase
      .from('periods')
      .select('*')
      .order('period_number', { ascending: true });

    if (periodsError || !periods || periods.length === 0) {
      return NextResponse.json({ 
        status: { type: 'closed', message: 'نظام الأوقات غير مهيأ' }, classes: [] 
      });
    }

    // 4️⃣ تحديد حالة المدرسة الآن (في حصة أم استراحة أم مغلقة)
    let activePeriodNum = null;
    let timeStatus: any = null;

    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      const [startH, startM] = p.start_time.split(':').map(Number);
      const [endH, endM] = p.end_time.split(':').map(Number);
      
      const startMins = startH * 60 + startM;
      const endMins = endH * 60 + endM;

      // هل نحن داخل وقت هذه الحصة؟
      if (timeInMinutes >= startMins && timeInMinutes <= endMins) {
        activePeriodNum = p.period_number;
        timeStatus = { type: 'class', period: activePeriodNum };
        break;
      }

      // هل نحن في استراحة (بين هذه الحصة والتي تليها)؟
      if (i < periods.length - 1) {
        const nextP = periods[i + 1];
        const [nextStartH, nextStartM] = nextP.start_time.split(':').map(Number);
        const nextStartMins = nextStartH * 60 + nextStartM;

        if (timeInMinutes > endMins && timeInMinutes < nextStartMins) {
           timeStatus = { 
             type: 'break', 
             name: 'وقت الاستراحة (الفرصة)', 
             start: p.end_time.substring(0, 5), 
             end: nextP.start_time.substring(0, 5) 
           };
           break;
        }
      }
    }

    // إذا لم نكن في حصة أو استراحة (انتهى الدوام أو لم يبدأ)
    if (!timeStatus) {
      const firstStart = periods[0].start_time.split(':').map(Number);
      
      if (timeInMinutes < (firstStart[0] * 60 + firstStart[1])) {
        timeStatus = { type: 'closed', message: 'لم يبدأ الدوام المدرسي بعد' };
      } else {
        timeStatus = { type: 'closed', message: 'انتهى الدوام المدرسي لهذا اليوم' };
      }
    }

    // 5️⃣ جلب الحصص النشطة من الجدول الصحيح (حسب مفتاح التحكم)
    let activeClasses = [];
    if (activePeriodNum !== null) {
      const { data: scheduleData, error: scheduleError } = await supabase
        .from(scheduleTable)
        .select(`
          id,
          subjects (name),
          sections (name, classes(name)),
          teachers (zoom_link, users(full_name))
        `)
        .eq('day_of_week', currentDayOfWeek)
        .eq(periodColumn, activePeriodNum);

      if (!scheduleError && scheduleData) {
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

    // 6️⃣ إرسال البيانات النهائية
    return NextResponse.json({
      status: timeStatus,
      classes: activeClasses
    });

  } catch (error: any) {
    console.error('Live status API Error:', error);
    return NextResponse.json({ 
      status: { type: 'closed', message: 'خطأ في جلب البيانات' }, classes: [] 
    }, { status: 500 });
  }
}
