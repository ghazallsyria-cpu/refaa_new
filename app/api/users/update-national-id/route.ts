import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, newNationalId } = await request.json();

    if (!userId || !newNationalId) {
      return NextResponse.json({ error: 'userId و newNationalId مطلوبان' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'إعدادات النظام غير مكتملة' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify the requester is admin or management
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);

    if (authCheckError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerData?.role !== 'admin' && callerData?.role !== 'management') {
      return NextResponse.json({ error: 'Forbidden: Only admins can update national ID' }, { status: 403 });
    }

    // Get the current email of the target user
    const { data: targetUser } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    // Derive the new email from the new national_id
    // Only auto-update if current email follows the {national_id}@alrefaa.edu pattern
    const newEmail = `${newNationalId}@alrefaa.edu`;

    // Update Supabase Auth email (this is the key step that was missing)
    const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email: newEmail,
      email_confirm: true,
    });

    if (authUpdateError) {
      console.error('Auth email update error:', authUpdateError);
      return NextResponse.json(
        { error: `فشل تحديث البريد في المصادقة: ${authUpdateError.message}` },
        { status: 500 }
      );
    }

    // Update the email in the public.users table as well
    const { error: userEmailError } = await supabaseAdmin
      .from('users')
      .update({ email: newEmail })
      .eq('id', userId);

    if (userEmailError) {
      console.error('users table email update error:', userEmailError);
      return NextResponse.json(
        { error: `فشل تحديث البريد في قاعدة البيانات: ${userEmailError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'تم تحديث الرقم المدني والبريد الإلكتروني في المصادقة بنجاح',
      newEmail,
    });
  } catch (error: any) {
    console.error('Error updating national ID:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
