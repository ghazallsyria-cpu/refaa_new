import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    let { userId, newPassword } = await request.json();

    // تنظيف كلمة المرور من أي مسافات منسوخة بالخطأ
    if (newPassword) {
      newPassword = newPassword.trim();
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'إعدادات النظام غير مكتملة.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. توليد كلمة مرور تلقائية من الرقم المدني إذا ترك المدير الحقل فارغاً
    if (!newPassword || newPassword === '') {
      const { data: userRecord } = await supabaseAdmin
        .from('users')
        .select('national_id')
        .eq('id', userId)
        .single();
        
      if (userRecord?.national_id) {
        newPassword = `${userRecord.national_id}123`;
      } else {
        newPassword = 'User@123456';
      }
    }

    // التحقق من صلاحيات الإدارة
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);
    
    if (authCheckError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: adminData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (adminData?.role !== 'admin' && adminData?.role !== 'management') {
      return NextResponse.json({ error: `Forbidden.` }, { status: 403 });
    }

    // 2. 🚀 التحديث الآمن: تحديث كلمة المرور **فقط** دون المساس بالإيميل
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword
    });
    
    if (authError) {
      return NextResponse.json({ error: `خطأ في نظام المصادقة: ${authError.message}` }, { status: 500 });
    }

    // 3. فك قفل تغيير كلمة المرور لكي لا يدخل المعلم في حلقة مفرغة عند تسجيل الدخول
    await supabaseAdmin.from('users').update({ must_reset_password: false }).eq('id', userId);

    return NextResponse.json({ message: 'Password reset successfully', newPassword });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
