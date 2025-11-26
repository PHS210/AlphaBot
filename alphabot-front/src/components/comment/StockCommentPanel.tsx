import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import styled, { css } from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { getMe } from '@/api/userClient'
import type { ApiError } from '@/api/client'
import type { CommentRead } from '@/types/comment'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useComments'

type PanelVariant = 'default' | 'sidebar' | 'page'

type Props = {
  stockCode?: string | null
  stockName?: string | null
  variant?: PanelVariant
}

const PAGE_SIZE = 5
const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const formatDate = (value: string) => {
  try {
    return DATE_FORMATTER.format(new Date(value))
  } catch {
    return value
  }
}

export default function StockCommentPanel({ stockCode, stockName, variant = 'default' }: Props) {
  const [page, setPage] = useState(1)
  const [newContent, setNewContent] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [localMessage, setLocalMessage] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
    setNewContent('')
    setEditingId(null)
    setEditingContent('')
    setLocalMessage(null)
  }, [stockCode])

  const queryParams = useMemo(
    () => ({
      stock_code: stockCode ?? undefined,
      page,
      page_size: PAGE_SIZE,
    }),
    [stockCode, page],
  )

  const commentsQuery = useComments(queryParams, { enabled: Boolean(stockCode) })

  const { data: currentUser, error: meError } = useQuery({
    queryKey: ['me'],
    queryFn: getMe,
    enabled: Boolean(stockCode),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      const apiError = error as ApiError | undefined
      if (apiError?.status === 401) {
        return false
      }
      return failureCount < 2
    },
  })

  const isUnauthorized = (meError as ApiError | undefined)?.status === 401

  const createMutation = useCreateComment()
  const updateMutation = useUpdateComment()
  const deleteMutation = useDeleteComment()

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stockCode) {
      return
    }
    const trimmed = newContent.trim()
    if (!trimmed) {
      setLocalMessage('댓글 내용을 입력하세요.')
      return
    }
    setLocalMessage(null)
    createMutation.mutate(
      { stock_code: stockCode, content: trimmed },
      {
        onSuccess: () => {
          setNewContent('')
          setPage(1)
        },
        onError: (error) => {
          const apiError = error as ApiError | undefined
          if (apiError?.status === 401) {
            setLocalMessage('로그인이 필요합니다.')
          } else {
            setLocalMessage('댓글을 등록하지 못했습니다. 다시 시도해 주세요.')
          }
        },
      },
    )
  }

  const startEditing = (comment: CommentRead) => {
    setEditingId(comment.comment_id)
    setEditingContent(comment.content)
    setLocalMessage(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingContent('')
  }

  const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingId) {
      return
    }
    const trimmed = editingContent.trim()
    if (!trimmed) {
      setLocalMessage('수정할 내용을 입력하세요.')
      return
    }
    updateMutation.mutate(
      { commentId: editingId, payload: { content: trimmed } },
      {
        onSuccess: () => {
          cancelEditing()
        },
        onError: (error) => {
          const apiError = error as ApiError | undefined
          if (apiError?.status === 401) {
            setLocalMessage('본인 댓글만 수정할 수 있습니다.')
          } else {
            setLocalMessage('댓글을 수정하지 못했습니다. 다시 시도해 주세요.')
          }
        },
      },
    )
  }

  const handleDelete = (commentId: number) => {
    if (!window.confirm('이 댓글을 삭제하시겠습니까?')) {
      return
    }
    deleteMutation.mutate(commentId, {
      onError: (error) => {
        const apiError = error as ApiError | undefined
        if (apiError?.status === 401) {
          setLocalMessage('본인 댓글만 삭제할 수 있습니다.')
        } else {
          setLocalMessage('댓글을 삭제하지 못했습니다. 다시 시도해 주세요.')
        }
      },
    })
  }

  const comments = commentsQuery.data?.comments ?? []
  const totalPages = commentsQuery.data?.total_pages ?? 1
  const canPrev = page > 1
  const canNext = page < totalPages

  const isLoadingList = commentsQuery.isFetching && !commentsQuery.isFetched

  if (!stockCode) {
    return (
      <Panel $variant={variant}>
        <PanelHeader>
          <PanelTitle>종목 토론</PanelTitle>
        </PanelHeader>
        <Placeholder>종목을 선택하면 댓글을 볼 수 있습니다.</Placeholder>
      </Panel>
    )
  }

  return (
    <Panel $variant={variant}>
      <PanelHeader>
        <PanelTitle>종목 토론</PanelTitle>
        <StockBadge>
          <BadgeCode>{stockCode}</BadgeCode>
          {stockName && <BadgeName>{stockName}</BadgeName>}
        </StockBadge>
      </PanelHeader>

      <FormWrapper onSubmit={editingId ? handleEditSubmit : handleCreate}>
        <Textarea
          $variant={variant}
          value={editingId ? editingContent : newContent}
          onChange={(event) =>
            editingId ? setEditingContent(event.target.value) : setNewContent(event.target.value)
          }
          placeholder={
            isUnauthorized
              ? '로그인 후 댓글을 작성할 수 있습니다.'
              : editingId
                ? '댓글 내용을 수정하세요.'
                : '새 댓글을 입력하세요.'
          }
          disabled={
            isUnauthorized ||
            createMutation.isPending ||
            updateMutation.isPending ||
            deleteMutation.isPending
          }
          rows={3}
        />
        <FormActions>
          {editingId ? (
            <>
              <SecondaryButton type="button" onClick={cancelEditing}>
                취소
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? '저장 중...' : '수정 저장'}
              </PrimaryButton>
            </>
          ) : (
            <PrimaryButton
              type="submit"
              disabled={
                createMutation.isPending || isUnauthorized || newContent.trim().length === 0
              }
            >
              {createMutation.isPending ? '등록 중...' : '댓글 등록'}
            </PrimaryButton>
          )}
        </FormActions>
      </FormWrapper>

      {localMessage && <HelperMessage role="status">{localMessage}</HelperMessage>}
      {commentsQuery.isError && (
        <HelperMessage role="alert">댓글을 불러오지 못했습니다. 새로고침해 주세요.</HelperMessage>
      )}

      <CommentList $variant={variant}>
        {isLoadingList && <Placeholder>불러오는 중...</Placeholder>}
        {!isLoadingList && comments.length === 0 && (
          <Placeholder>등록된 댓글이 없습니다. 첫 댓글을 남겨보세요.</Placeholder>
        )}
        {comments.map((comment) => {
          const isMine = comment.user.user_id === currentUser?.user_id
          const isEditing = editingId === comment.comment_id
          return (
            <CommentCard key={comment.comment_id} data-editing={isEditing}>
              <CommentMeta>
                <Author>{comment.user.username}</Author>
                <Timestamp>{formatDate(comment.created_at)}</Timestamp>
              </CommentMeta>
              <CommentContent>{comment.content}</CommentContent>
              {isMine && !isEditing && (
                <CommentActions>
                  <ActionButton type="button" onClick={() => startEditing(comment)}>
                    수정
                  </ActionButton>
                  <ActionButton type="button" onClick={() => handleDelete(comment.comment_id)}>
                    삭제
                  </ActionButton>
                </CommentActions>
              )}
            </CommentCard>
          )
        })}
      </CommentList>

      {totalPages > 1 && (
        <Pagination>
          <PageButton
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={!canPrev || commentsQuery.isFetching}
          >
            이전
          </PageButton>
          <PageInfo>
            {page} / {totalPages}
          </PageInfo>
          <PageButton
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={!canNext || commentsQuery.isFetching}
          >
            다음
          </PageButton>
        </Pagination>
      )}
    </Panel>
  )
}

const Panel = styled.section<{ $variant: PanelVariant }>`
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  ${(props) => {
    if (props.$variant === 'sidebar') {
      return css`
        padding: 12px;
        margin-top: 0;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
      `
    } else if (props.$variant === 'page') {
      return css`
        padding: 24px;
        margin-top: 0;
        background: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      `
    } else {
      return css`
        padding: 16px;
        margin-top: 16px;
        background: #fdfdfd;
      `
    }
  }}
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const PanelTitle = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #202123;
`

const StockBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f0f7ff;
  border: 1px solid #d0e7ff;
`

const BadgeCode = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: #3558b8;
`

const BadgeName = styled.span`
  font-size: 12px;
  color: #4a4d55;
`

const Placeholder = styled.div`
  padding: 16px;
  border-radius: 10px;
  background: #f7f7f8;
  color: #8e8ea0;
  text-align: center;
  font-size: 13px;
`

const FormWrapper = styled.form`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Textarea = styled.textarea<{ $variant: PanelVariant }>`
  width: 100%;
  border-radius: 10px;
  border: 1px solid #dcdfe4;
  padding: ${({ $variant }) => ($variant === 'sidebar' ? '8px 10px' : '10px 12px')};
  font-size: ${({ $variant }) => ($variant === 'sidebar' ? '12px' : '13px')};
  resize: none;
  font-family: inherit;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4169e1;
    box-shadow: 0 0 0 2px rgba(65, 105, 225, 0.1);
  }

  &:disabled {
    background: #f3f3f4;
    cursor: not-allowed;
  }
`

const FormActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const PrimaryButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: #4169e1;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #3554c8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SecondaryButton = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #d0d3da;
  background: #ffffff;
  color: #4a4d55;
  font-size: 13px;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f7f7f8;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const HelperMessage = styled.p`
  margin: 0;
  font-size: 12px;
  color: #b74141;
  background: #fff5f5;
  border-left: 3px solid #e25c5c;
  padding: 8px 10px;
  border-radius: 6px;
`

const CommentList = styled.div<{ $variant: PanelVariant }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: ${({ $variant }) => 
    $variant === 'sidebar' ? '220px' : $variant === 'page' ? '600px' : '320px'};
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: #d9d9e3;
    border-radius: 3px;
  }
`

const CommentCard = styled.article`
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e5e5e8;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &[data-editing='true'] {
    border-color: #4169e1;
    box-shadow: 0 0 0 2px rgba(65, 105, 225, 0.1);
  }
`

const CommentMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #6b6f77;
`

const Author = styled.span`
  font-weight: 600;
  color: #202123;
`

const Timestamp = styled.time`
  color: #8e8ea0;
`

const CommentContent = styled.p`
  margin: 0;
  color: #2d2f34;
  font-size: 13px;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
`

const CommentActions = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const ActionButton = styled.button`
  border: none;
  background: transparent;
  color: #4169e1;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;

  &:hover {
    text-decoration: underline;
  }
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
`

const PageButton = styled.button`
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid #d0d3da;
  background: #fff;
  font-size: 12px;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const PageInfo = styled.span`
  font-size: 12px;
  color: #4a4d55;
`

