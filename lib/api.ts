import { supabase } from '@/lib/supabase';

export async function fetchScopedData(
  table: string,
  filters: Record<string, any>,
  page: number = 1,
  limit: number = 20
) {
  let query = supabase
    .from(table)
    .select('*', { count: 'exact' })
    .range((page - 1) * limit, page * limit - 1);

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query = query.eq(key, value);
    }
  });

  const { data, error, count } = await query;
  if (error) throw error;
  return { data, count };
}
