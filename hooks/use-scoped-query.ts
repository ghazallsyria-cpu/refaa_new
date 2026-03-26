import { useQuery } from '@tanstack/react-query';
import { fetchScopedData } from '@/lib/api';

export function useScopedQuery(table: string, filters: Record<string, any>, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: [table, filters, page, limit],
    queryFn: () => fetchScopedData(table, filters, page, limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
