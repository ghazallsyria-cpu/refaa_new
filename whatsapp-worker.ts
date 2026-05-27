// @ts-nocheck
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { sendWhatsAppMessage } from './lib/whatsapp/evolution';
import { resolveAudience } from './lib/whatsapp/resolver';
import { supabase } from './lib/supabase'; 

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null, // خيار إلزامي لعمل BullMQ بدون أخطاء
});

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

console.log('👷 WhatsApp Worker is running and waiting for jobs...');

const worker = new Worker('whatsapp-messages', async (job: Job) => {
  const { campaignId, message, audienceType, classId } = job.data;
  console.log(`[Job ${job.id}] Starting campaign: ${campaignId}`);

  try {
    // 1. تحديث الحالة
    await supabase.from('whatsapp_campaigns').update({ status: 'processing' }).eq('id', campaignId);

    // 2. جلب الأرقام
    const targets = await resolveAudience(audienceType, classId);
    console.log(`[Job ${job.id}] Found ${targets.length} targets.`);

    if (targets.length === 0) {
      await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaignId);
      return;
    }

    // 3. حلقة الإرسال مع Rate Limiting 
    for (const target of targets) {
      try {
        await sendWhatsAppMessage(target.phone, message);
        await supabase.from('whatsapp_logs').insert({
          campaign_id: campaignId, user_id: target.id, phone: target.phone, status: 'sent', sent_at: new Date().toISOString()
        });
        console.log(`✅ Sent to ${target.phone}`);
      } catch (error: any) {
        await supabase.from('whatsapp_logs').insert({
          campaign_id: campaignId, user_id: target.id, phone: target.phone, status: 'failed', error_response: error.message
        });
        console.log(`❌ Failed for ${target.phone}`);
      }
      // ⏱️ تأخير 3 ثوانٍ لحماية الرقم من الحظر
      await delay(3000); 
    }

    // 4. إتمام المهمة
    await supabase.from('whatsapp_campaigns').update({ status: 'completed' }).eq('id', campaignId);
    console.log(`[Job ${job.id}] Campaign completed successfully.`);

  } catch (error: any) {
    console.error(`[Job ${job.id}] Critical Error:`, error);
    await supabase.from('whatsapp_campaigns').update({ status: 'failed' }).eq('id', campaignId);
    throw error;
  }
}, { 
  connection: connection as any, // 🚀 الحل الجذري لتخطي خطأ الأنواع
  concurrency: 1 
});

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed with error: ${err.message}`);
});
