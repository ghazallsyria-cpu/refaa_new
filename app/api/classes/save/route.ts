import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveClassRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveClassRequestSchema);
    const { id, name, level } = validatedData;

    if (id) {
      // Update
      const { error } = await adminSupabase
        .from('classes')
        .update({ name, level })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Insert
      const { error } = await adminSupabase
        .from('classes')
        .insert([{ name, level }]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, 'Save Class');
  }
}
