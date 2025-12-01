export type CommentUser = {
  user_id: number
  username: string
}

export type CommentRead = {
  comment_id: number
  content: string
  created_at: string
  user: CommentUser
}

export type CommentListResponse = {
  comments: CommentRead[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type CommentListParams = {
  stock_code?: string
  page?: number
  page_size?: number
}

export type CommentCreatePayload = {
  stock_code: string
  content: string
}

export type CommentUpdatePayload = {
  content: string
}

