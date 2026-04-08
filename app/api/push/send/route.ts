import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    // 🚀 1. نقلنا إعدادات VAPID إلى داخل الدالة لضمان قراءة Netlify للمتغيرات في كل مرة
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      console.error('تنبيه: مفاتيح VAPID مفقودة في إعدادات Netlify!');
      return NextResponse.json({ error: 'إعدادات الإشعارات غير مكتملة' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:admin@alrefaa.edu',
      publicKey,
      privateKey
    );

    const { userIds, title, body, url } = await request.json();

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'لم يتم تحديد مستخدمين' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // التحقق من صلاحيات المُرسِل
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized - مفقود توكن المصادقة' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized - توكن غير صالح' }, { status: 401 });

    const { data: senderData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'management', 'teacher'].includes(senderData?.role)) {
      return NextResponse.json({ error: 'Forbidden - لا تملك صلاحية الإرسال' }, { status: 403 });
    }

    // جلب اشتراكات المستخدمين المحددين
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'المستخدمون المحددون لم يفعلوا الإشعارات على أجهزتهم', sent: 0 });
    }

    // 🚀 2. تجهيز البيانات للإرسال
    const payload = JSON.stringify({ 
      title: title || 'إشعار جديد', 
      body: body || '', 
      url: url || '/' 
    });

    // إرسال الإشعارات بشكل متوازٍ
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    );

    // حذف الاشتراكات المنتهية (الأجهزة التي ألغت الاشتراك أو تغيرت متصفحاتها)
    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const err = result.reason as any;
        console.error('فشل إرسال إشعار لجهاز:', err?.statusCode);
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(subscriptions[index].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return NextResponse.json({ message: 'تمت معالجة الإرسال', sent, total: subscriptions.length });

  } catch (error: any) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
