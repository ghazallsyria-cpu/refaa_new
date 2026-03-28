import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SendMessageRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validation = validateRequest(SendMessageRequestSchema, body);
    if (!validation.success) return validation.response;

    const { receiverId, subject, content, userId } = validation.data;

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

  } catch (error: unknown) {
    return handleApiError(error, 'Send Message');
  }
}
