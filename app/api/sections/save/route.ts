import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveSectionRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveSectionRequestSchema);
    const { id, name, classId } = validatedData;

    if (id) {
      // Update
      const { error } = await adminSupabase
        .from('sections')
        .update({ name })
        .eq('id', id);

      if (error) throw error;
    } else {
      // Insert
      if (!classId) throw new Error('Class ID is required for new sections');
      const { error } = await adminSupabase
        .from('sections')
        .insert([{ name, class_id: classId }]);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, 'Save Section');
  }
}
