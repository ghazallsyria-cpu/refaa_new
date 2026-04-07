import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// تهيئة مفاتيح الدفع (يجب إضافتها في ملف .env)
webpush.setVapidDetails(
  'mailto:ehabg84@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

// يجب استخدام الـ Service Role لتخطي قواعد الأمان وجلب بيانات المشتركين
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { userId, title, body, url } = await req.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // جلب جميع الأجهزة المسجلة للطالب (قد يكون مسجلاً من هاتف وكمبيوتر معاً)
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .eq('user_id', userId);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'User has no active push subscriptions' });
    }

    const payload = JSON.stringify({
      title: title,
      body: body,
      url: url || '/'
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.auth,
          p256dh: sub.p256dh
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err: any) {
        // إذا قام الطالب بمسح الكاش أو إغلاق الإشعارات من الإعدادات، نزيله من القاعدة
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, sentTo: subscriptions.length });

  } catch (error) {
    console.error('Push API Error:', error);
    return NextResponse.json({ error: 'Failed to send push notification' }, { status: 500 });
  }
}
