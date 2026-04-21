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
    const { email, password, role, full_name, national_id, phone, department_id, specialization, student_ids, job_title, address } = body;

    // 1. إنشاء الحساب في نظام المصادقة (Auth) وتمرير البيانات الوصفية
    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, national_id, role }
    });

    if (authError) throw authError;
    const userId = authData.user.id;

    // 2. إدراج البيانات في جدول المستخدمين (نستخدم upsert لتفادي تعارض أي Triggers)
    const { error: userError } = await adminSupabase.from('users').upsert({
      id: userId,
      email,
      full_name,
      national_id,
      phone: phone || null,
      role,
      must_reset_password: true
    });

    if (userError) throw userError;

    // 3. التوزيع والربط
    if (role === 'student') {
      await adminSupabase.from('students').upsert({ id: userId, national_id });
    } else if (role === 'teacher') {
      await adminSupabase.from('teachers').upsert({ 
        id: userId, 
        national_id, 
        department_id: department_id || null, 
        specialization: specialization || null 
      });
    } else if (role === 'parent') {
      // 🚀 إدخال ولي الأمر بأمان تام
      await adminSupabase.from('parents').upsert({ 
        id: userId, 
        national_id,
        job_title: job_title || null,
        address: address || null
      });
      
      // 🚀 الربط التلقائي للأبناء
      if (student_ids && Array.isArray(student_ids) && student_ids.length > 0) {
        await adminSupabase.from('students').update({ parent_id: userId }).in('id', student_ids);
      }
    }

    return NextResponse.json({ success: true, user: authData.user, password });

  } catch (error: any) {
    console.error('Create User Error:', error);
    let msg = error.message;
    if (msg.includes("Database error saving new user")) {
       msg = "قاعدة البيانات ترفض الإضافة: الرقم المدني أو البريد مسجل مسبقاً في النظام.";
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
