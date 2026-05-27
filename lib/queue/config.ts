import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// إذا لم تحدد REDIS_URL سيعمل على الإعداد الافتراضي
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const whatsappQueue = new Queue('whatsapp-messages', { 
  connection: redisConnection 
});
