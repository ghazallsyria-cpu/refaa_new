import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push'; 

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    
    // توحيد البيانات لتصبح مصفوفة دائماً لتسهيل التعامل معها
    const notificationsToProcess = Array.isArray(body) ? body : [body];

    // 1️⃣ حفظ الإشعارات في قاعدة البيانات (In-App Notifications)
    const { error: dbError } = await adminSupabase
      .from('notifications')
      .insert(notificationsToProcess.map(n => ({
        user_id: n.user_id || n.userId, 
        title: n.title,
        content: n.content || n.body,
        type: n.type || 'system',
        link: n.link || n.url || null,
        is_read: false
      })));

    if (dbError) throw dbError;

    // 🚀 نقلنا إعداد المفاتيح إلى داخل الدالة لتجنب أخطاء البناء (Build Time)
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    // 2️⃣ إرسال إشعارات الدفع (Push Notifications) فقط إذا كانت المفاتيح موجودة
    if (publicKey && privateKey) {
      webpush.setVapidDetails(
        'ehabg84@gmail.com', // يفضل تغيير هذا لبريد المدرسة
        publicKey,
        privateKey
      );

      const pushPromises = notificationsToProcess.map(async (n) => {
        const targetUserId = n.user_id || n.userId;
        
        const { data: subscriptions, error: subError } = await adminSupabase
          .from('push_subscriptions')
          .select('*') 
          .eq('user_id', targetUserId);

        if (!subError && subscriptions && subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: n.title,
            body: n.content || n.body || '',
            url: n.link || n.url || '/'
          });

          // إرسال الإشعار لكل جهاز يملكه هذا الطالب
          const sendToDevices = subscriptions.map(async (sub) => {
            try {
              await webpush.sendNotification({
                endpoint: sub.endpoint,
                keys: { auth: sub.auth, p256dh: sub.p256dh }
              }, payload);
            } catch (err: any) {
              // إذا قام الطالب بمسح بيانات المتصفح، نقوم بحذف الجهاز القديم
              if (err.statusCode === 404 || err.statusCode === 410) {
                await adminSupabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
              }
            }
          });
          
          await Promise.all(sendToDevices);
        }
      });

      await Promise.all(pushPromises);
    } else {
      console.warn("⚠️ لم يتم العثور على مفاتيح VAPID في إعدادات البيئة. تم حفظ الإشعار داخلياً فقط.");
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
