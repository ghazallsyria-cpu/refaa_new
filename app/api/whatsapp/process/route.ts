import { NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/evolution';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // 1. جلب أول حملة قيد الانتظار أو المعالجة
    const { data: campaign } = await supabase
      .from('whatsapp_campaigns')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!campaign) return NextResponse.json({ message: 'لا توجد مهام' });

    // 2. تحديث الحالة
    await supabase.from('whatsapp_campaigns').update({ status: 'processing' }).eq('id', campaign.id);

    // 3. جلب الأرقام التي لم تُرسل بعد لهذه الحملة (بحد أقصى 5 لضمان عدم تجاوز وقت Netlify)
    const { data: logs } = await supabase
      .from('whatsapp_logs')
      .select('phone, user_id')
      .eq('campaign_id', campaign.id)
      .eq('status', 'pending')
      .limit(5);

    if (!logs || logs.length === 0) {
      await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaign.id);
      return NextResponse.json({ message: 'تم إتمام الحملة' });
    }

    // 4. إرسال الدفعة (5 رسائل فقط)
    for (const log of logs) {
      try {
        await sendWhatsAppMessage(log.phone, campaign.message);
        await supabase.from('whatsapp_logs').update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('campaign_id', campaign.id).eq('phone', log.phone);
      } catch (err) {
        await supabase.from('whatsapp_logs').update({ status: 'failed', error_response: 'error' })
          .eq('campaign_id', campaign.id).eq('phone', log.phone);
      }
    }

    return NextResponse.json({ message: `تم إرسال ${logs.length} رسالة` });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ' }, { status: 500 });
  }
}
