import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { userId, settings } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updateData: any = {
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    // 🚀🚀 هنا كان الفخ! أضفنا logo_url للقائمة المسموحة
    const fields = [
      'is_open', 'message', 'school_name', 'academic_year', 
      'semester', 'address', 'phone', 'email', 'logo_url' 
    ];

    fields.forEach(field => {
      if (settings[field] !== undefined) {
        updateData[field] = settings[field];
      }
    });

    // Convert dates to ISO if they exist, or null if empty string
    if (settings.open_date !== undefined) {
      try {
        updateData.open_date = (settings.open_date && settings.open_date.trim() !== "") 
          ? new Date(settings.open_date).toISOString() 
          : null;
      } catch (e) {
        updateData.open_date = null;
      }
    }

    if (settings.close_date !== undefined) {
      try {
        updateData.close_date = (settings.close_date && settings.close_date.trim() !== "") 
          ? new Date(settings.close_date).toISOString() 
          : null;
      } catch (e) {
        updateData.close_date = null;
      }
    }

    if (settings.id) {
      const { error } = await adminSupabase
        .from('platform_settings')
        .update(updateData)
        .eq('id', settings.id);
      if (error) throw error;
    } else {
      const { error } = await adminSupabase
        .from('platform_settings')
        .insert([updateData]);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Update Platform Settings Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
