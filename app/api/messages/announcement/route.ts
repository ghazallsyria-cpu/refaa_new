import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { title, content, targetRole, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { error } = await adminSupabase
      .from('announcements')
      .insert([{
        author_id: userId,
        title,
        content,
        target_role: targetRole === 'all' ? null : targetRole
      }]);

    if (error) throw error;
    
    try {
      let usersQuery = adminSupabase.from('users').select('id');
      if (targetRole !== 'all') {
        usersQuery = usersQuery.eq('role', targetRole);
      }
      const { data: targetUsers } = await usersQuery;

      if (targetUsers && targetUsers.length > 0) {
        const notifications = targetUsers.map(u => ({
          user_id: u.id,
          type: 'announcement',
          title: 'إعلان جديد',
          content: `تم نشر إعلان جديد: ${title}`,
          link: '/messages',
          is_read: false
        }));
        
        await adminSupabase.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.error('Error sending announcement notifications:', notifErr);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Announcement Send Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
