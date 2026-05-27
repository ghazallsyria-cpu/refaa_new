// lib/queue/config.ts
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// تأكد من إضافة رابط سيرفر Redis في ملف .env الخاص بك (مثلاً REDIS_URL=redis://localhost:6379)
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

export const whatsappQueue = new Queue('whatsapp-messages', { 
  connection: redisConnection 
});
