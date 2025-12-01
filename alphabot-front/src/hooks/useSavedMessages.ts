import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listSavedMessages, deleteSavedMessage } from '@/api/bookmarkClient';

// 쿼리 키 정의
export const MESSAGE_QUERY_KEYS = {
  all: ['savedMessages'] as const,
  lists: () => [...MESSAGE_QUERY_KEYS.all, 'list'] as const,
  list: (categoryId: number) => [...MESSAGE_QUERY_KEYS.lists(), categoryId] as const,
};

/**
 * 저장된 메시지 목록을 조회하는 훅
 * @param categoryId - 필터링할 카테고리 ID (0 = "전체")
 */
export const useSavedMessages = (categoryId: number) => {
  return useQuery({
    queryKey: MESSAGE_QUERY_KEYS.list(categoryId),
    queryFn: () => listSavedMessages(categoryId),
  });
};

/**
 * 북마크 삭제를 위한 훅
 */
export const useBookmarkMutations = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSavedMessage(id),
    onSuccess: () => {
      // 성공 시 모든 북마크 관련 쿼리(모든 카테고리 포함)를 무효화
      queryClient.invalidateQueries({ queryKey: MESSAGE_QUERY_KEYS.all });
      // 카테고리 목록의 'item_count'도 변경되었을 수 있으므로
      // 카테고리 쿼리도 무효화합니다. (중요)
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  return { deleteMutation };
};