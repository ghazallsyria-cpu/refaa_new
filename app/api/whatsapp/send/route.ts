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
    const { data: campaign, error: campaignError } = await supabase
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

    if (campaignError) throw new Error(`Database error: ${campaignError.message}`);

    // 2. جلب أرقام الهواتف (الربط مع جدول users)
    let query = supabase.from('users').select('id, phone');
    
    if (audienceType === 'teachers') {
      query = query.eq('role', 'teacher');
    } else if (audienceType === 'students') {
      query = query.eq('role', 'student');
      if (classId) {
         // نفلتر الطلاب بناءً على class_id من جدول students
         const { data: studentIds } = await supabase.from('students').select('id').eq('section_id', classId);
         const ids = studentIds?.map(s => s.id) || [];
         query = query.in('id', ids);
      }
    }

    const { data: recipients, error: fetchError } = await query;
    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);

    // 3. إدراج السجلات في whatsapp_logs (تعبئة الجدول)
    const validRecipients = recipients?.filter(r => r.phone); // استبعاد من لا يملك رقم هاتف

    if (validRecipients && validRecipients.length > 0) {
      const logs = validRecipients.map((r: any) => ({
        campaign_id: campaign.id,
        user_id: r.id,
        phone: r.phone,
        status: 'pending'
      }));

      const { error: logError } = await supabase.from('whatsapp_logs').insert(logs);
      if (logError) throw new Error(`Log insertion error: ${logError.message}`);
    } else {
      return NextResponse.json({ error: 'لم يتم العثور على أرقام هواتف' }, { status: 404 });
    }

    // 4. تسليم المهمة للطابور
    const job = await whatsappQueue.add('send-campaign', {
      campaignId: campaign.id,
      message,
    }, { 
      removeOnComplete: true,
    });

    return NextResponse.json({ success: true, campaignId: campaign.id, recipientsCount: validRecipients.length });

  } catch (error: any) {
    console.error('WhatsApp API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
