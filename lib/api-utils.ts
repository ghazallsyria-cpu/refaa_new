import { NextResponse } from 'next/server';
import { z } from 'zod';

export function validateRequest<T>(schema: z.Schema<T>, data: unknown): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    console.error('Validation Error:', result.error.format());
    return {
      success: false,
      response: NextResponse.json(
        { 
          error: 'Validation failed', 
          details: result.error.format() 
        }, 
        { status: 400 }
      ),
    };
  }

  return { success: true, data: result.data };
}

export function handleApiError(error: unknown, context: string) {
  console.error(`${context} Error:`, error);
  const message = error instanceof Error ? error.message : 'Unknown error';
  return NextResponse.json({ error: message }, { status: 500 });
}
