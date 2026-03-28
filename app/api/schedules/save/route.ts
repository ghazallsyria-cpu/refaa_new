import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SaveScheduleRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const validatedData = await validateRequest(req, SaveScheduleRequestSchema);
    const { id, ...scheduleData } = validatedData;

    if (id) {
      // Update
      const { data, error } = await adminSupabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Insert
      const { data, error } = await adminSupabase
        .from('schedules')
        .insert(scheduleData)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }

  } catch (error: unknown) {
    return handleApiError(error, 'Save Schedule');
  }
}
