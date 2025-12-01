import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
} from '@/api/commentClient'
import type {
  CommentCreatePayload,
  CommentListParams,
  CommentListResponse,
  CommentUpdatePayload,
} from '@/types/comment'

export const COMMENT_QUERY_KEYS = {
  all: ['comments'] as const,
  lists: () => [...COMMENT_QUERY_KEYS.all, 'list'] as const,
  list: (params: CommentListParams) => [...COMMENT_QUERY_KEYS.lists(), params] as const,
}

type UseCommentsOptions = {
  enabled?: boolean
}

export const useComments = (
  params: CommentListParams,
  options?: UseCommentsOptions,
) => {
  return useQuery<CommentListResponse>({
    queryKey: COMMENT_QUERY_KEYS.list(params),
    queryFn: () => listComments(params),
    placeholderData: keepPreviousData,
    enabled: options?.enabled ?? true,
  })
}

export const useCreateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CommentCreatePayload) => createComment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.all })
    },
  })
}

export const useUpdateComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { commentId: number; payload: CommentUpdatePayload }) =>
      updateComment(variables.commentId, variables.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.all })
    },
  })
}

export const useDeleteComment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: number) => deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.all })
    },
  })
}

