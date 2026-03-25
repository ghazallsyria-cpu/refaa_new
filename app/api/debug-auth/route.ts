import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // 1. Get all users from public.users
    const { data: publicUsers, error: puError } = await supabaseAdmin.from('users').select('id');
    
    if (puError) {
      return NextResponse.json({ error: 'Error listing public users', details: puError }, { status: 500 });
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // 2. Update password for all users to 123456
    for (const pu of publicUsers) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(pu.id, {
        password: '123456'
      });
      
      if (updateError) {
        errorCount++;
        errors.push({ id: pu.id, error: updateError });
      } else {
        successCount++;
      }
    }
    
    // 3. Set must_reset_password to true for all users in public.users
    const { error: resetError } = await supabaseAdmin
      .from('users')
      .update({ must_reset_password: true })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
      
    return NextResponse.json({
      message: 'Password update complete',
      successCount,
      errorCount,
      errors,
      resetError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
