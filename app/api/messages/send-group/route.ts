import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// إنشاء عميل بصلاحيات مطلقة لتجاوز الـ RLS في العمليات الإدارية
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sectionId, subject, content, senderId, replyToId } = body;

    // 1. 🛡️ فحص حالة القفل (منع الفوضى)
    const { data: section, error: secError } = await adminSupabase
      .from('sections')
      .select('is_chat_locked, name')
      .eq('id', sectionId)
      .single();

    if (secError) throw new Error('لم يتم العثور على الفصل المحدود');

    // 2. جلب رتبة المرسل للتحقق من الصلاحية
    const { data: sender, error: senderError } = await adminSupabase
      .from('users')
      .select('role')
      .eq('id', senderId)
      .single();

    if (senderError) throw new Error('فشل التحقق من هوية المرسل');

    // إذا كانت الدردشة مقفلة، فقط (admin, management, staff, teacher) يمكنهم الإرسال
    if (section.is_chat_locked && sender.role === 'student') {
      return NextResponse.json({ error: 'عذراً، الدردشة مغلقة حالياً من قبل الإدارة.' }, { status: 403 });
    }

    // 3. 🚀 إدراج رسالة واحدة فقط للفصل بالكامل (Unified Message)
    // بدلاً من إرسال مئات النسخ، نرسل رسالة واحدة مرتبطة بالـ section_id
    const { data: newMessage, error: msgError } = await adminSupabase
      .from('messages')
      .insert([{
        sender_id: senderId,
        section_id: sectionId,
        subject: subject || `نقاش صف: ${section.name}`,
        content,
        reply_to_id: replyToId || null,
        is_read: false // سيتم استخدام جدول message_reads لتتبع القراءة بدقة
      }])
      .select()
      .single();

    if (msgError) throw msgError;

    // 4. 👥 حشد المستلمين (جميع معلمي الصف + طلابه + الإدارة) لإرسال الإشعارات
    // سنجلب كل من يجب أن يصله تنبيه بالرسالة الجديدة
    const [studentsRes, teachersRes, staffRes] = await Promise.all([
      adminSupabase.from('students').select('id').eq('section_id', sectionId),
      adminSupabase.from('teacher_sections').select('teacher_id').eq('section_id', sectionId),
      adminSupabase.from('users').select('id').in('role', ['admin', 'management', 'staff'])
    ]);

    const recipientIds = new Set<string>();
    
    // إضافة الطلاب
    studentsRes.data?.forEach(s => recipientIds.add(s.id));
    // إضافة معلمي الصف
    teachersRes.data?.forEach(t => recipientIds.add(t.teacher_id));
    // إضافة الإدارة والستاف
    staffRes.data?.forEach(u => recipientIds.add(u.id));
    
    // إزالة المرسل من قائمة الإشعارات
    recipientIds.delete(senderId);

    // 5. 🔔 إرسال الإشعارات دفعة واحدة (Bulk Insert)
    if (recipientIds.size > 0) {
      const notifications = Array.from(recipientIds).map(id => ({
        user_id: id,
        type: 'message',
        title: `رسالة في مجلس فصل: ${section.name}`,
        content: `أرسل ${sender.role === 'student' ? 'طالب' : 'معلم'} رسالة جديدة: ${subject || 'بدون عنوان'}`,
        link: `/messages?sectionId=${sectionId}`,
        is_read: false
      }));

      await adminSupabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({ success: true, messageId: newMessage.id });

  } catch (error: any) {
    console.error('Group Message API Error:', error);
    return NextResponse.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
}
