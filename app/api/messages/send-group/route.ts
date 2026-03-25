import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('API Request Body:', body);
    const { sectionId, subject, content, senderId } = body;

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 2. Fetch students in the section
    console.log('Fetching students for section:', sectionId);
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id')
      .eq('section_id', sectionId);

    if (studentsError) {
      console.error('Supabase students error:', studentsError);
      throw studentsError;
    }
    
    console.log('Students found:', students?.length);
    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'لا يوجد طلاب في هذا الصف' }, { status: 400 });
    }

    // 3. Prepare messages
    const messagesToInsert = students.map(student => ({
      sender_id: senderId,
      receiver_id: student.id,
      section_id: sectionId,
      subject,
      content,
      is_read: false
    }));

    // 4. Insert messages
    console.log('Inserting messages:', messagesToInsert.length);
    const { error: insertError } = await supabase
      .from('messages')
      .insert(messagesToInsert);

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw insertError;
    }

    // 5. Send notifications
    const notifications = students.map(student => ({
      user_id: student.id,
      type: 'message',
      title: 'رسالة جماعية جديدة',
      content: `لديك رسالة جماعية جديدة: ${subject}`,
      link: '/messages',
      is_read: false
    }));

    await supabase.from('notifications').insert(notifications);

    console.log('Messages and notifications inserted successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in send-group API:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
