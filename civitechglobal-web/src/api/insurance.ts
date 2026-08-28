import { useQuery } from '@tanstack/react-query';
import { api } from '@/config/api';
import type { InsuranceCategory } from '@/types/leads';

export function useInsuranceCategories() {
  return useQuery({
    queryKey: ['insurance-categories'],
    queryFn: async () => {
      const res = await api.get<InsuranceCategory[]>('/insurance/categories');
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
