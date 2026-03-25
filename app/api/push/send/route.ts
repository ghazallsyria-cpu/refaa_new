// app/api/push/send/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

// إعداد VAPID keys (توليدها مرة واحدة بـ: npx web-push generate-vapid-keys)
webpush.setVapidDetails(
  'mailto:admin@alrefaa.edu',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userIds, title, body, url } = await request.json();

    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'لم يتم تحديد مستخدمين' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // التحقق من أن المُرسِل معلم أو مدير
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: senderData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!['admin', 'management', 'teacher'].includes(senderData?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // جلب اشتراكات المستخدمين المحددين
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) throw subError;
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'لا يوجد اشتراكات لهذه الأجهزة', sent: 0 });
    }

    const payload = JSON.stringify({ title, body, url: url || '/attendance' });

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

    // حذف الاشتراكات المنتهية (410 Gone)
    const expiredEndpoints: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const err = result.reason as any;
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
    return NextResponse.json({ message: 'تم الإرسال', sent });

  } catch (error: any) {
    console.error('Push send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
