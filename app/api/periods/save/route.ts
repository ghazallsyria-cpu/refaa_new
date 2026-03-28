import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { SavePeriodRequestSchema } from '@/lib/validations';
import { validateRequest, handleApiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const validation = validateRequest(SavePeriodRequestSchema, body);
    if (!validation.success) return validation.response;

    const { data, error } = await adminSupabase
      .from('class_periods')
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);

  } catch (error: unknown) {
    return handleApiError(error, 'Save Period');
  }
}
