import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. حساب الوقت المحلي للمدرسة (الكويت UTC+3)
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const schoolTime = new Date(utcTime + (3 * 3600000));
    
    // JS getDay() 0=Sun, 1=Mon, ..., 6=Sat
    // DB day_of_week 1=Sun, 2=Mon, ..., 5=Thu
    const jsDay = schoolTime.getDay();
    const dbDay = jsDay === 0 ? 1 : jsDay === 1 ? 2 : jsDay === 2 ? 3 :
                  jsDay === 3 ? 4 : jsDay === 4 ? 5 : 0;

    if (dbDay === 0) {
      return NextResponse.json({ 
        classes: [], 
        currentPeriod: null,
        message: 'اليوم عطلة نهاية الأسبوع' 
      });
    }

    const currentTimeStr = schoolTime.getHours().toString().padStart(2, '0') + ':' + 
                           schoolTime.getMinutes().toString().padStart(2, '0');

    // 2. 🚀 استكشاف النظام الفعال (آلي أم يدوي)
    const { data: settings } = await adminSupabase.from('school_settings').select('active_schedule_system').eq('id', 1).maybeSingle();
    const activeSystem = settings?.active_schedule_system || 'manual';

    // 3. 🚀 جلب فترات الحصص (الأوقات) من الجدول الصحيح
    let periods: any[] = [];
    if (activeSystem === 'auto') {
        const { data } = await adminSupabase.from('auto_class_periods').select('*');
        periods = data || [];
    } else {
        const { data } = await adminSupabase.from('class_periods').select('*');
        periods = data || [];
    }

    if (periods.length === 0) {
        return NextResponse.json({ classes: [], currentPeriod: null, message: 'لا توجد أوقات حصص مسجلة في النظام' });
    }

    // ترتيب الأوقات بشكل تصاعدي
    periods.sort((a, b) => a.period_number - b.period_number);

    // 4. 🚀 تحديد الفترات الفعالة "الآن" بدقة
    const activePeriods = periods.filter(p => currentTimeStr >= p.start_time.slice(0,5) && currentTimeStr < p.end_time.slice(0,5));

    // 🚀 كاشف الفراغات الذكي (الاستراحات وانتهاء الدوام)
    if (activePeriods.length === 0) {
        const sortedUnique = [...periods].sort((a, b) => a.start_time.localeCompare(b.start_time));
        const firstStart = sortedUnique[0].start_time.slice(0, 5);
        const lastEnd = sortedUnique[sortedUnique.length - 1].end_time.slice(0, 5);

        if (currentTimeStr < firstStart) {
             return NextResponse.json({ classes: [], currentPeriod: null, message: 'قبل بدء الدوام المدرسي', currentTime: currentTimeStr });
        } else if (currentTimeStr >= lastEnd) {
             return NextResponse.json({ classes: [], currentPeriod: null, message: 'انتهى الدوام المدرسي', currentTime: currentTimeStr });
        } else {
             // نحن الآن في فراغ بين حصتين (استراحة / فرصة)
             const nextPeriod = sortedUnique.find(p => p.start_time.slice(0, 5) > currentTimeStr);
             const prevPeriod = [...sortedUnique].reverse().find(p => p.end_time.slice(0, 5) <= currentTimeStr);

             return NextResponse.json({
                 classes: [],
                 currentPeriod: {
                     period_number: prevPeriod ? prevPeriod.period_number + 0.5 : 0,
                     start_time: prevPeriod ? prevPeriod.end_time.slice(0, 5) : currentTimeStr,
                     end_time: nextPeriod ? nextPeriod.start_time.slice(0, 5) : currentTimeStr,
                     isBreak: true,
                     breakName: 'وقت استراحة (فرصة)'
                 },
                 message: 'استراحة / فرصة',
                 currentTime: currentTimeStr
             });
        }
    }

    // 5. 🚀 جلب الحصص المباشرة بناءً على أرقام الفترات الفعالة
    const activePeriodNumbers = [...new Set(activePeriods.map(p => p.period_number))];
    let activeClasses: any[] = [];

    if (activeSystem === 'auto') {
        const { data: planData } = await adminSupabase.from('auto_schedule_plans').select('id').order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (planData) {
             const { data: autoScheds, error } = await adminSupabase.from('auto_schedules')
                .select(`
                    id, period_number, section_id,
                    sections ( id, name, classes ( id, name ) ),
                    subjects ( id, name ),
                    teachers ( id, specialization, zoom_link, users ( full_name, avatar_url ) )
                `)
                .eq('plan_id', planData.id)
                .eq('day_of_week', dbDay)
                .in('period_number', activePeriodNumbers);
             
             if (!error && autoScheds) {
                 // توحيد الشكل البرمجي ليتطابق مع ما تنتظره الشاشة
                 activeClasses = autoScheds.map(s => ({ ...s, period: s.period_number }));
                 
                 // فلترة دقيقة: التأكد من تطابق مرحلة الفصل مع مرحلة الوقت (لحل تعارض أوقات المتوسط والثانوي)
                 activeClasses = activeClasses.filter(cls => {
                     const className = Array.isArray(cls.sections?.classes) ? cls.sections?.classes[0]?.name : cls.sections?.classes?.name;
                     let stage = 'high';
                     if (/(سادس|سابع|ثامن|تاسع|6|7|8|9)/.test(className || '')) stage = 'middle';
                     return activePeriods.some(ap => ap.period_number === cls.period && ap.stage === stage);
                 });
             }
        }
    } else {
        const { data: scheds, error } = await adminSupabase.from('schedules')
            .select(`
                id, period,
                sections ( id, name, classes ( id, name ) ),
                subjects ( id, name ),
                teachers ( id, specialization, zoom_link, users ( full_name, avatar_url ) )
            `)
            .eq('day_of_week', dbDay)
            .in('period', activePeriodNumbers);
        
        if (!error && scheds) activeClasses = scheds;
    }

    return NextResponse.json({
      classes: activeClasses,
      currentPeriod: {
        period_number: activePeriodNumbers.join(' & '), 
        start_time: activePeriods[0].start_time.slice(0, 5),
        end_time: activePeriods[0].end_time.slice(0, 5),
        isBreak: false
      },
      currentTime: currentTimeStr
    });

  } catch (error: any) {
    console.error('Live API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
