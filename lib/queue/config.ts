// lib/queue/config.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// إذا لم يتم تحديد الرابط، سيتم استخدام الرابط الافتراضي للتطوير
const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// نقوم بإنشاء الاتصال
const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // خيار إلزامي يُنصح به مع BullMQ لتجنب توقف المهام
});

// نستخدم @ts-ignore أو as any لتخطي خطأ التوافق الوهمي في Typescript بين ioredis و bullmq
export const whatsappQueue = new Queue('whatsapp-messages', { 
  connection: redisConnection as any 
});
