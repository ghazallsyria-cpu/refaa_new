// whatsapp-worker.ts
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendWhatsAppMessage } from './lib/whatsapp/evolution';
import { resolveAudience } from './lib/whatsapp/resolver';
import { supabase } from './lib/supabase'; 
// تنبيه: تأكد أن supabase client هنا يستخدم SERVICE_ROLE_KEY ليتمكن من الكتابة والقراءة بصلاحيات كاملة في الخلفية

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

console.log('👷 WhatsApp Worker is running and waiting for jobs...');

const worker = new Worker('whatsapp-messages', async (job: Job) => {
  // البيانات التي سنرسلها من واجهة المدير لاحقاً
  const { campaignId, message, audienceType, classId } = job.data;
  console.log(`[Job ${job.id}] Starting campaign: ${campaignId}`);

  try {
    // 1. تحديث حالة الحملة إلى "جاري المعالجة"
    await supabase.from('whatsapp_campaigns').update({ status: 'processing' }).eq('id', campaignId);

    // 2. جلب الأرقام المستهدفة عبر المُحلل الذكي الذي برمجناه
    const targets = await resolveAudience(audienceType, classId);
    console.log(`[Job ${job.id}] Found ${targets.length} targets.`);

    if (targets.length === 0) {
      await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaignId);
      return;
    }

    // 3. حلقة الإرسال مع Rate Limiting (نقطة الأمان القصوى)
    for (const target of targets) {
      try {
        await sendWhatsAppMessage(target.phone, message);
        
        // تسجيل النجاح في الـ Logs
        await supabase.from('whatsapp_logs').insert({
          campaign_id: campaignId,
          user_id: target.id,
          phone: target.phone,
          status: 'sent',
          sent_at: new Date().toISOString()
        });
        console.log(`[Job ${job.id}] ✅ Sent to ${target.phone}`);
        
      } catch (error: any) {
        // تسجيل الفشل في الـ Logs لمعرفة السبب لاحقاً من لوحة التحكم
        await supabase.from('whatsapp_logs').insert({
          campaign_id: campaignId,
          user_id: target.id,
          phone: target.phone,
          status: 'failed',
          error_response: error.message
        });
        console.log(`[Job ${job.id}] ❌ Failed for ${target.phone}: ${error.message}`);
      }

      // ⏱️ تأخير 3 ثوانٍ بين كل رسالة لتجنب الحظر من واتساب
      await delay(3000); 
    }

    // 4. تحديث حالة الحملة إلى "مكتملة"
    await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaignId);
    console.log(`[Job ${job.id}] Campaign completed successfully.`);

  } catch (error: any) {
    console.error(`[Job ${job.id}] Critical Error:`, error);
    // في حال حدوث خطأ كارثي (انقطاع قاعدة البيانات مثلاً)
    await supabase.from('whatsapp_campaigns').update({ status: 'failed' }).eq('id', campaignId);
    throw error;
  }

}, { 
  connection, 
  concurrency: 1 // قيمة 1 تضمن أننا لن نرسل أكثر من رسالة واحدة في نفس اللحظة
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed with error: ${err.message}`);
});
