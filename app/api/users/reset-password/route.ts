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
        error: 'إعدادات النظام غير مكتملة: يرجى إضافة SUPABASE_SERVICE_ROLE_KEY في إعدادات المنصة (Settings -> Secrets)' 
      }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // If newPassword is not provided, generate one based on national_id
    if (!newPassword) {
      // Try to find national_id from students, teachers, or parents
      const { data: studentData } = await supabaseAdmin.from('students').select('national_id').eq('id', userId).maybeSingle();
      const { data: teacherData } = await supabaseAdmin.from('teachers').select('national_id').eq('id', userId).maybeSingle();
      const { data: parentData } = await supabaseAdmin.from('parents').select('national_id').eq('id', userId).maybeSingle();
      
      const nationalId = studentData?.national_id || teacherData?.national_id || parentData?.national_id;
      
      if (nationalId) {
        newPassword = `${nationalId}123`;
      } else {
        newPassword = 'User@123456'; // Fallback
      }
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
    console.log('Admin check - User role:', userData?.role);
    
    if (userData?.role !== 'admin' && userData?.role !== 'management') {
      return NextResponse.json({ error: `Forbidden: Only admins can reset passwords. Your role: ${userData?.role}` }, { status: 403 });
    }

    // 1. Update password in auth
    console.log('Updating auth password for user:', userId);
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    
    if (authError) {
      console.error('Auth update error:', authError);
      
      // If the user doesn't exist in auth.users (e.g., "Database error loading user" or "User not found")
      if (authError.message.toLowerCase().includes('database error loading user') || authError.message.toLowerCase().includes('not found')) {
        console.log('User not found in auth.users. Attempting to recreate...');
        
        // Get user details from public.users
        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single();
          
        if (targetUser && targetUser.email) {
          // Recreate the user in auth.users with the exact same ID
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            id: userId,
            email: targetUser.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              full_name: targetUser.full_name
            }
          });
          
          if (createError) {
            console.error('Failed to recreate user in auth.users:', createError);
            return NextResponse.json({ error: `فشل في إعادة إنشاء حساب المستخدم: ${createError.message}` }, { status: 500 });
          }
          
          console.log('Successfully recreated user in auth.users');
        } else {
          return NextResponse.json({ error: `Auth Error: ${authError.message} (User email not found in public.users)` }, { status: 500 });
        }
      } else {
        return NextResponse.json({ error: `Auth Error: ${authError.message}` }, { status: 500 });
      }
    }

    // 2. Update must_reset_password flag
    console.log('Updating public.users flag for user:', userId);
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({ must_reset_password: true })
      .eq('id', userId);
    if (userError) {
      console.error('Database update error:', userError);
      return NextResponse.json({ error: `Database Error: ${userError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password reset successfully', newPassword });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
