import { NextResponse } from 'next/server';
import { z } from 'zod';

export async function validateRequest<T>(req: Request, schema: z.Schema<T>): Promise<T> {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    throw new Error('Invalid JSON body');
  }
  
  const result = schema.safeParse(body);
  if (!result.success) {
    throw result.error;
  }
  
  return result.data;
}

export function handleApiError(error: unknown, context: string) {
  console.error(`${context} Error:`, error);
  
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        details: error.format() 
      }, 
      { status: 400 }
    );
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  
  if (message === 'Invalid JSON body') {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
