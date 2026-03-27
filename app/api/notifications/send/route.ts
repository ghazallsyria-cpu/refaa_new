import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      const { error } = await adminSupabase
        .from('notifications')
        .insert(body.map(n => ({
          user_id: n.user_id,
          title: n.title,
          content: n.content,
          type: n.type || 'system',
          link: n.link || null,
          is_read: false
        })));

      if (error) throw error;
    } else {
      const { user_id, title, content, type, link } = body;

      const { error } = await adminSupabase
        .from('notifications')
        .insert({
          user_id,
          title,
          content,
          type: type || 'system',
          link: link || null,
          is_read: false
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Send Notification Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
