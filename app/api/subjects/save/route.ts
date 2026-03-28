import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveSubjectRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validation = validateRequest(SaveSubjectRequestSchema, body);
    if (!validation.success) return validation.response;

    const { id, name, code } = validation.data;

    if (id) {
      // Update
      const { error } = await adminSupabase
        .from('subjects')
        .update({ name, code })
        .eq('id', id);

      if (error) throw error;
      return NextResponse.json({ success: true });
    } else {
      // Insert
      const { data, error } = await adminSupabase
        .from('subjects')
        .insert([{ name, code }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

  } catch (error: unknown) {
    return handleApiError(error, 'Save Subject');
  }
}
