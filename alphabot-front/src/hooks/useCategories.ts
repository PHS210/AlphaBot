import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { listCategories } from '@/api/categoryClient';
import type { CategoryQuery } from '@/components/category/category.types';

// 쿼리 키
export const CATEGORY_QUERY_KEYS = {
  all: ['categories'] as const,
  lists: () => [...CATEGORY_QUERY_KEYS.all, 'list'] as const,
  list: (query: CategoryQuery) => [...CATEGORY_QUERY_KEYS.lists(), query] as const,
};

type UseCategoriesOptions = {
  enabled?: boolean;
};

export const useCategories = (query: CategoryQuery, options?: UseCategoriesOptions) => {
  return useQuery({
    queryKey: CATEGORY_QUERY_KEYS.list(query),
    queryFn: () => listCategories(query),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
    retry: (failureCount, error) => {
      const axiosError = error as AxiosError | undefined;
      if (axiosError?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};