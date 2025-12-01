import { apiFetch } from '@/api/client'
import type {
  CommentListParams,
  CommentListResponse,
  CommentCreatePayload,
  CommentRead,
  CommentUpdatePayload,
} from '@/types/comment'

const BASE_PATH = '/api/comments'

const buildQueryString = (params: CommentListParams) => {
  const search = new URLSearchParams()
  if (params.stock_code) {
    search.set('stock_code', params.stock_code)
  }
  if (typeof params.page === 'number') {
    search.set('page', String(params.page))
  }
  if (typeof params.page_size === 'number') {
    search.set('page_size', String(params.page_size))
  }
  const query = search.toString()
  return query ? `?${query}` : ''
}

export const listComments = async (
  params: CommentListParams,
): Promise<CommentListResponse> => {
  return apiFetch<CommentListResponse>(`${BASE_PATH}${buildQueryString(params)}`, {
    method: 'GET',
  })
}

export const createComment = async (
  payload: CommentCreatePayload,
): Promise<CommentRead> => {
  return apiFetch<CommentRead>(BASE_PATH, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export const updateComment = async (
  commentId: number,
  payload: CommentUpdatePayload,
): Promise<CommentRead> => {
  return apiFetch<CommentRead>(`${BASE_PATH}/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export const deleteComment = async (commentId: number): Promise<void> => {
  await apiFetch<void>(`${BASE_PATH}/${commentId}`, {
    method: 'DELETE',
  })
}

