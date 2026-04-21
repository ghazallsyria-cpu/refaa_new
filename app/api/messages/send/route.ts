import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SendMessageRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // إنشاء عميل بصلاحيات مطلقة
  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SendMessageRequestSchema);
    const { receiverId, subject, content, userId } = validatedData;

    // 🧱 جدار الرفعة الناري (الخرسانة المسلحة) - التحقق من الصلاحيات
    
    // 1. جلب رتبة المرسل والمستلم من قاعدة البيانات الموثوقة
    const { data: users, error: usersError } = await adminSupabase
      .from('users')
      .select('id, role')
      .in('id', [userId, receiverId]);

    if (usersError || !users || users.length !== 2) {
      throw new Error('محاولة غير صالحة: بيانات المرسل أو المستلم غير متطابقة.');
    }

    const sender = users.find(u => u.id === userId);
    const receiver = users.find(u => u.id === receiverId);

    if (!sender || !receiver) {
      throw new Error('حدث خطأ في النظام: لم يتم العثور على الأطراف المحددة.');
    }

    // 2. تطبيق قوانين دستور الرفعة بصرامة تامة
    if (sender.role === 'parent') {
      // ولي الأمر ممنوع من مراسلة الطلاب أو أولياء الأمور الآخرين
      if (receiver.role === 'student' || receiver.role === 'parent') {
        throw new Error('دستور الرفعة (أمن وحماية): غير مصرح لك بمراسلة هذه الفئة.');
      }
    } else if (sender.role === 'student') {
      // الطالب ممنوع من مراسلة الطلاب الآخرين أو أولياء الأمور
      if (receiver.role === 'student' || receiver.role === 'parent') {
        throw new Error('دستور الرفعة (أمن وحماية): التواصل مقتصر على المعلمين والإدارة فقط.');
      }
    }

    // 3. الإدراج الآمن بعد اجتياز الفحص الأمني
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

    // 4. إرسال الإشعار اللحظي
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
