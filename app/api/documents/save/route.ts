import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // 🚀 لاحظ أننا أضفنا target_role هنا لكي يتم استلامه وحفظه!
    const { id, title, description, file_url, category, target_role } = body;

    if (!title || !file_url || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      title,
      description,
      file_url,
      category,
      target_role: target_role || 'all', // 🚀 حفظه كـ all كافتراضي
    };

    let result;

    if (id) {
      // Update existing document
      const { data, error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new document
      const { data, error } = await supabase
        .from('documents')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Save document error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
