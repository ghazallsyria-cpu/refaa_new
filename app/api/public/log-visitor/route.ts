import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { visitorName, visitorRole, className, teacherName, subjectName } = await req.json();

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!, 
      process.env.SUPABASE_SERVICE_ROLE_KEY!, 
      { auth: { persistSession: false } }
    );

    // البحث عن مدراء النظام لإرسال الإشعار لهم
    const { data: admins } = await adminSupabase.from('users').select('id').in('role', ['admin', 'management']);

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        title: 'زيارة إشرافية للحصص الحية 👑',
        content: `قام (${visitorRole}) الأستاذ: ${visitorName} بالدخول إلى حصة [${subjectName}] لمعلم المادة: ${teacherName} في فصل: ${className}.`,
        type: 'system',
        link: '/admin/live-monitor'
      }));

      await adminSupabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Visitor Logging Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
