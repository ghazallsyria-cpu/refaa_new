import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    let { userId, newPassword } = await request.json();

    // 1. تنظيف كلمة المرور من أي مسافة منسوخة بالخطأ
    if (newPassword) {
      newPassword = newPassword.trim();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'إعدادات النظام غير مكتملة' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. جلب الرقم المدني الصحيح من قاعدة البيانات لضمان التطابق
    const { data: userRecord } = await supabaseAdmin
      .from('users')
      .select('national_id, email, full_name')
      .eq('id', userId)
      .single();

    if (!userRecord) {
       return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // 3. تجهيز الإيميل الإجباري ليكون متطابقاً مع الرقم المدني
    const guaranteedEmail = userRecord.email || `${userRecord.national_id}@alrefaa.edu`;

    // 4. التوليد التلقائي إذا كانت الكلمة فارغة
    if (!newPassword || newPassword === '') {
      newPassword = userRecord.national_id ? `${userRecord.national_id}123` : 'User@123456';
    }

    // التحقق من صلاحيات المدير (أمان)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);
    
    if (authCheckError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (adminData?.role !== 'admin' && adminData?.role !== 'management') {
      return NextResponse.json({ error: `Forbidden.` }, { status: 403 });
    }

    // 5. 🚀 التحديث المزدوج (كلمة المرور + توحيد الإيميل) لضمان الدخول!
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
      email: guaranteedEmail, // 👈 هذه الإضافة ستجبر النظام على قبول الدخول
      email_confirm: true
    });
    
    if (authError) {
      // إذا كان الحساب المخفي محذوفاً، نقوم بخلقه من جديد
      if (authError.message.toLowerCase().includes('not found') || authError.message.toLowerCase().includes('error loading user')) {
         await supabaseAdmin.auth.admin.createUser({
            id: userId,
            email: guaranteedEmail,
            password: newPassword,
            email_confirm: true,
            user_metadata: { full_name: userRecord.full_name }
         });
      } else {
         return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 500 });
      }
    }

    // 6. فك قفل تغيير كلمة المرور ووضع الإيميل الموحد
    await supabaseAdmin.from('users').update({ 
      must_reset_password: false, 
      email: guaranteedEmail 
    }).eq('id', userId);

    return NextResponse.json({ message: 'Password reset successfully', newPassword });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
