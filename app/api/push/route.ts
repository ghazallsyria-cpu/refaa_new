import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import webpush from 'web-push';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:ghazallsyria@gmail.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: Request) {
  try {
    const { action, userId, subscription, payload } = await req.json();

    if (action === 'subscribe') {
      if (!userId || !subscription) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { error } = await adminSupabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          subscription: JSON.stringify(subscription),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'send') {
      if (!userId || !payload) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { data: subs, error: subsError } = await adminSupabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', userId);

      if (subsError) throw subsError;

      const notifications = subs.map(async (s) => {
        try {
          const sub = JSON.parse(s.subscription);
          return webpush.sendNotification(sub, JSON.stringify(payload));
        } catch (err) {
          console.error('Error sending push notification:', err);
          // If subscription is invalid, delete it
          if ((err as any).statusCode === 410 || (err as any).statusCode === 404) {
            await adminSupabase
              .from('push_subscriptions')
              .delete()
              .eq('subscription', s.subscription);
          }
        }
      });

      await Promise.all(notifications);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Push API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
