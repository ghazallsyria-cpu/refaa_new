import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    // إنشاء عميل بصلاحيات الآدمن المطلقة متجاوزاً الـ RLS
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const body = await req.json();
    const { email, password, role, full_name, national_id, phone, department_id, specialization } = body;

    // 1. إنشاء الحساب في نظام المصادقة (Auth)
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. إدراج البيانات في جدول المستخدمين الأساسي
    const { error: userError } = await adminSupabase.from('users').insert({
      id: userId,
      email,
      full_name,
      national_id,
      phone,
      role,
      must_reset_password: true // إجبار المستخدم على تغيير كلمة المرور عند أول دخول
    });

    if (userError) throw userError;

    // 3. توزيع المستخدم على جدوله الخاص حسب الصلاحية
    if (role === 'student') {
      await adminSupabase.from('students').insert({ id: userId, national_id });
    } else if (role === 'teacher') {
      await adminSupabase.from('teachers').insert({ 
        id: userId, 
        national_id, 
        department_id: department_id || null, 
        specialization: specialization || null 
      });
    } else if (role === 'parent') {
      await adminSupabase.from('parents').insert({ id: userId, national_id });
    }

    return NextResponse.json({ success: true, user: authData.user, password });

  } catch (error: any) {
    console.error('Create User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
