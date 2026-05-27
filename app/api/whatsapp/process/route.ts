import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendWhatsAppMessage } from '@/lib/whatsapp/evolution'; // تأكد أن المسار صحيح عندك

export async function GET() {
  try {
    console.log("--- بدء عملية معالجة الرسائل ---");

    // 1. البحث عن حملة واحدة (Pending أو Processing)
    const { data: campaign, error: campaignError } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!campaign) {
      return NextResponse.json({ message: 'لا توجد حملات بانتظار الإرسال' });
    }

    // 2. تحديث الحملة إلى Processing
    if (campaign.status === 'pending') {
      await supabase.from('whatsapp_campaigns').update({ status: 'processing' }).eq('id', campaign.id);
    }

    // 3. جلب الأرقام (الرسائل) التي لم تُرسل بعد لهذه الحملة (بحد أقصى 5 رسائل لكل دقيقة)
    const { data: logs, error: logsError } = await supabase
      .from('whatsapp_logs')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .limit(5);

    if (logsError) throw new Error(`خطأ في جلب السجلات: ${logsError.message}`);

    // 4. إذا لم نجد أرقاماً، يعني أن الحملة انتهت
    if (!logs || logs.length === 0) {
      await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaign.id);
      console.log(`تم إتمام الحملة ${campaign.id} بنجاح.`);
      return NextResponse.json({ message: 'تم إتمام الحملة بنجاح' });
    }

    console.log(`جارٍ إرسال ${logs.length} رسالة للحملة: ${campaign.id}`);

    // 5. إرسال الرسائل
    for (const log of logs) {
      try {
        console.log(`محاولة إرسال إلى: ${log.phone}`);
        
        const result = await sendWhatsAppMessage(log.phone, campaign.message);
        
        console.log(`✅ تم الإرسال بنجاح إلى ${log.phone}:`, result);

        await supabase.from('whatsapp_logs')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', log.id);
          
      } catch (err: any) {
        console.error(`❌ فشل الإرسال إلى ${log.phone}:`, err.message);
        
        await supabase.from('whatsapp_logs')
          .update({ status: 'failed', error_response: err.message })
          .eq('id', log.id);
      }
    }

    return NextResponse.json({ message: `تمت معالجة ${logs.length} رسالة بنجاح` });

  } catch (error: any) {
    console.error('--- خطأ جسيم في المعالجة ---:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
