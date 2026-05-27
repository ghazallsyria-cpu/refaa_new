import { NextResponse } from 'next/server';
import { whatsappQueue } from '@/lib/queue/config';
import { supabase } from '@/lib/supabase'; // تأكد من استخدام SERVICE_ROLE_KEY هنا إن أمكن لضمان الإدراج

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, audienceType, classId, scheduledAt, userId } = body;

    // 1. التحقق من البيانات الأساسية
    if (!message || !audienceType || !userId) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    // 2. تسجيل الحملة في قاعدة البيانات بحالة 'pending'
    const { data: campaign, error } = await supabase
      .from('whatsapp_campaigns')
      .insert([{ 
        message, 
        audience_type: audienceType, 
        class_id: classId || null, 
        scheduled_at: scheduledAt || null, 
        created_by: userId 
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    // 3. حساب وقت الجدولة (التأخير بالمللي ثانية) إن وجد
    let delayMs = 0;
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt).getTime();
      delayMs = Math.max(0, scheduledTime - Date.now());
    }

    // 4. تسليم المهمة للطابور (BullMQ) ليقوم الـ Worker باستلامها
    await whatsappQueue.add('send-campaign', {
      campaignId: campaign.id,
      message,
      audienceType,
      classId
    }, { 
      delay: delayMs,
      removeOnComplete: true, // اختياري: لتنظيف الـ Redis بعد النجاح
    });

    return NextResponse.json({ success: true, campaignId: campaign.id });

  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
