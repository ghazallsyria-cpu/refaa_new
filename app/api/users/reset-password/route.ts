import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    let { userId, newPassword } = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('Missing Supabase credentials: URL or Service Role Key');
      return NextResponse.json({ 
        error: 'إعدادات النظام غير مكتملة: يرجى إضافة SUPABASE_SERVICE_ROLE_KEY' 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // التوليد التلقائي الذي كان يعمل في نظامك القديم
    if (!newPassword || newPassword.trim() === '') {
      const { data: studentData } = await supabaseAdmin.from('students').select('national_id').eq('id', userId).maybeSingle();
      const { data: teacherData } = await supabaseAdmin.from('teachers').select('national_id').eq('id', userId).maybeSingle();
      const { data: parentData } = await supabaseAdmin.from('parents').select('national_id').eq('id', userId).maybeSingle();
      
      const nationalId = studentData?.national_id || teacherData?.national_id || parentData?.national_id;
      
      if (nationalId) {
        newPassword = `${nationalId}123`;
      } else {
        newPassword = 'User@123456'; // Fallback
      }
    } else {
      // حماية من المسافات المنسوخة بالخطأ
      newPassword = newPassword.trim();
    }

    // Verify Admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);
    
    if (authCheckError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    
    if (userData?.role !== 'admin' && userData?.role !== 'management') {
      return NextResponse.json({ error: `Forbidden: Only admins can reset passwords.` }, { status: 403 });
    }

    // 1. Update password in auth (تحديث كلمة السر كما في كودك الأصلي)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    
    if (authError) {
      if (authError.message.toLowerCase().includes('database error loading user') || authError.message.toLowerCase().includes('not found')) {
        const { data: targetUser } = await supabaseAdmin.from('users').select('email, full_name').eq('id', userId).single();
          
        if (targetUser && targetUser.email) {
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            id: userId,
            email: targetUser.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: { full_name: targetUser.full_name }
          });
          if (createError) {
            return NextResponse.json({ error: `فشل في إعاد الإنشاء: ${createError.message}` }, { status: 500 });
          }
        } else {
          return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 500 });
      }
    }

    // 2. Update must_reset_password flag (إرجاعها إلى true كما كانت في نظامك)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ must_reset_password: true })
      .eq('id', userId);
      
    if (userError) {
      return NextResponse.json({ error: `Database Error: ${userError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password reset successfully', newPassword });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
