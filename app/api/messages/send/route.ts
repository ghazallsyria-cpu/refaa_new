import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { receiverId, subject, content, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from('messages')
      .insert([{
        sender_id: userId,
        receiver_id: receiverId,
        subject,
        content,
        is_read: false
      }]);
      
    if (error) throw error;

    await adminSupabase.from('notifications').insert([{
      user_id: receiverId,
      type: 'message',
      title: 'رسالة جديدة',
      content: `لديك رسالة جديدة: ${subject}`,
      link: '/messages',
      is_read: false
    }]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Message Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
