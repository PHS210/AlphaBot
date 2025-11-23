import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createCategory, updateCategory, deleteCategory } from '@/api/categoryClient';
import { CATEGORY_QUERY_KEYS } from './useCategories';
// 👇 타입 파일 경로를 정확히 확인하세요 (components/category/...)
import type { CategoryCreateUpdateDTO } from '@/components/category/category.types'; 

export const useCategoryMutations = () => {
  const queryClient = useQueryClient();

  // [핵심 수정] 목록 갱신 함수
  const invalidateLists = () => {
    // 'categories'라는 키를 가진 모든 데이터를 무효화하여 강제로 다시 불러오게 합니다.
    // await를 사용하여 갱신이 완료될 때까지 기다리는 것이 안전합니다.
    return queryClient.invalidateQueries({ queryKey: CATEGORY_QUERY_KEYS.all });
  };

  // 1. 생성 (POST)
  const createMutation = useMutation({
    mutationFn: (data: CategoryCreateUpdateDTO) => createCategory(data),
    onSuccess: async () => {
      // 생성 성공 시 목록 새로고침
      await invalidateLists(); 
    },
  });

  // 2. 수정 (PUT)
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CategoryCreateUpdateDTO }) =>
      updateCategory(id, data),
    onSuccess: async () => {
      await invalidateLists();
    },
  });

  // 3. 삭제 (DELETE)
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCategory(id),
    onSuccess: async () => {
      await invalidateLists();
    },
  });

  return { createMutation, updateMutation, deleteMutation };
};