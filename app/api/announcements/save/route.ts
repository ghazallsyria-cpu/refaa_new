import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { id, title, content, target_role, image_url } = await req.json();

    const payload = {
      title,
      content,
      target_role: target_role === 'all' ? null : target_role,
      image_url: image_url || null,
    };

    if (id) {
      // Update
      const { error: updateError } = await adminSupabase
        .from('announcements')
        .update(payload)
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      return NextResponse.json({ success: true });
    } else {
      // Insert
      const { data: newAnn, error: insertError } = await adminSupabase
        .from('announcements')
        .insert([payload])
        .select()
        .single();
        
      if (insertError) throw insertError;

      // Send Notifications to target audience
      try {
        let usersQuery = adminSupabase.from('users').select('id');
        if (payload.target_role) {
          usersQuery = usersQuery.eq('role', payload.target_role);
        }
        const { data: targetUsers } = await usersQuery;

        if (targetUsers && targetUsers.length > 0) {
          const notificationPayloads = targetUsers.map(user => ({
            user_id: user.id,
            title: 'إعلان جديد',
            content: payload.title,
            type: 'announcement',
            link: '/announcements'
          }));
          await adminSupabase.from('notifications').insert(notificationPayloads);
        }
      } catch (notifErr) {
        console.error('Error sending announcement notifications:', notifErr);
      }
      
      return NextResponse.json({ success: true, data: newAnn });
    }
  } catch (error: any) {
    console.error('Save Announcement Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
