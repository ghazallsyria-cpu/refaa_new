import { NextResponse } from 'next/server';
import { whatsappQueue } from '@/lib/queue/config';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { message, audienceType, classId, scheduledAt, userId } = await req.json();

    if (!message || !audienceType || !userId) {
      return NextResponse.json({ error: 'البيانات المطلوبة غير مكتملة' }, { status: 400 });
    }

    // 1. تسجيل الحملة في قاعدة البيانات
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

    if (error) throw new Error(`Database error: ${error.message}`);

    // 2. حساب تأخير الجدولة الزمنية (إن وجد)
    let delayMs = 0;
    if (scheduledAt) {
      const scheduledTime = new Date(scheduledAt).getTime();
      delayMs = Math.max(0, scheduledTime - Date.now());
    }

    // 3. تسليم المهمة للطابور
    const job = await whatsappQueue.add('send-campaign', {
      campaignId: campaign.id,
      message,
      audienceType,
      classId
    }, { 
      delay: delayMs,
      removeOnComplete: true,
    });

    return NextResponse.json({ success: true, campaignId: campaign.id, jobId: job.id });

  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ غير متوقع' }, { status: 500 });
  }
}
