import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import styled from 'styled-components'
import { FaTrash } from 'react-icons/fa'
import * as chatApi from '@/api/chat'

interface StockLike {
  code: string
  name: string
  exchange: string
  currentPrice: number
  change: number
  changePercent: number
}

type Props = {
  selectedStockCode?: string | null
  onSelectStock?: (stock: StockLike) => void
}

export default function LeftSidebar({ selectedStockCode, onSelectStock }: Props) {
  const [chats, setChats] = useState<chatApi.BackendChat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newStockCode, setNewStockCode] = useState('')
  const [newChatTitle, setNewChatTitle] = useState('')
  const [renamingChatId, setRenamingChatId] = useState<number | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renaming, setRenaming] = useState(false)

  const fetchChats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await chatApi.listChats()
      setChats(data)
    } catch (err: any) {
      console.error(err)
      setError('채팅방 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchChats()
  }, [fetchChats])

  const visibleChats = useMemo(
    () =>
      chats.filter((chat) => chat.trash_can !== 'in' && chat.stock_code),
    [chats],
  )

  const handleSelectChat = (chat: chatApi.BackendChat) => {
    if (!chat.stock_code) {
      return
    }
    onSelectStock?.({
      code: chat.stock_code,
      name: chat.title || chat.stock_code,
      exchange: '',
      currentPrice: 0,
      change: 0,
      changePercent: 0,
    })
  }

  const resetNewChatForm = () => {
    setNewStockCode('')
    setNewChatTitle('')
  }

  const handleCreateChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const normalizedCode = newStockCode.trim().toUpperCase()
    const normalizedTitle = newChatTitle.trim()
    if (!normalizedCode) {
      setError('종목 코드를 입력해주세요.')
      return
    }
    try {
      setCreating(true)
      const resp = await chatApi.upsertRoomByStock(normalizedCode, normalizedTitle || undefined)
      await fetchChats()
      resetNewChatForm()
      onSelectStock?.({
        code: resp.stock_code,
        name: resp.title,
        exchange: '',
        currentPrice: 0,
        change: 0,
        changePercent: 0,
      })
    } catch (err: any) {
      console.error(err)
      const message =
        err?.status === 400
          ? '유효한 종목 코드를 입력해주세요.'
          : '새 채팅방을 만들지 못했습니다.'
      setError(message)
      alert(message)
    } finally {
      setCreating(false)
    }
  }

  const startRenaming = (chat: chatApi.BackendChat) => {
    setRenamingChatId(chat.chat_id)
    setRenameTitle(chat.title || chat.stock_code || '')
  }

  const cancelRenaming = () => {
    setRenamingChatId(null)
    setRenameTitle('')
  }

  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setError(null)
    if (renamingChatId === null) {
      return
    }
    const trimmed = renameTitle.trim()
    if (!trimmed) {
      setError('제목을 입력해주세요.')
      return
    }
    try {
      setRenaming(true)
      await chatApi.updateChat(renamingChatId, { title: trimmed })
      await fetchChats()
      cancelRenaming()
    } catch (err: any) {
      console.error(err)
      setError('채팅방 제목을 수정하지 못했습니다.')
    } finally {
      setRenaming(false)
    }
  }

  const handleMoveToTrash = async (chatId: number) => {
    if (!window.confirm('이 채팅방을 휴지통으로 이동하시겠습니까?')) {
      return
    }
    try {
      await chatApi.updateChat(chatId, { trash_can: 'in' })
      await fetchChats()
    } catch (err: any) {
      console.error(err)
      alert('채팅방을 휴지통으로 이동하지 못했습니다.')
    }
  }

  const handleCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    chat: chatApi.BackendChat,
    disabled: boolean,
  ) => {
    if (disabled) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSelectChat(chat)
    }
  }

  return (
    <Sidebar>
      <NewChatCard onSubmit={handleCreateChat}>
        <Field>
          <FieldLabel htmlFor="new-chat-stock">종목 코드</FieldLabel>
          <TextInput
            id="new-chat-stock"
            type="text"
            placeholder="예) AAPL"
            value={newStockCode}
            onChange={(event) => setNewStockCode(event.target.value)}
            disabled={creating}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="new-chat-title">채팅방 제목</FieldLabel>
          <TextInput
            id="new-chat-title"
            type="text"
            placeholder="예) 애플 실적 분석"
            value={newChatTitle}
            onChange={(event) => setNewChatTitle(event.target.value)}
            disabled={creating}
          />
        </Field>
        <FormActions>
          <NewChatButton type="submit" disabled={creating}>
            {creating ? '생성 중...' : '+ 새 채팅'}
          </NewChatButton>
          <SecondaryButton type="button" onClick={resetNewChatForm} disabled={creating}>
            초기화
          </SecondaryButton>
        </FormActions>
      </NewChatCard>
      {loading && <Placeholder>채팅방을 불러오는 중...</Placeholder>}
      {error && <ErrorBanner role="alert">{error}</ErrorBanner>}
      {!loading && visibleChats.length === 0 && (
        <Placeholder>진행 중인 채팅이 없습니다.</Placeholder>
      )}
      {visibleChats.map((chat) => (
        <ChatCard
          key={chat.chat_id}
          role="button"
          tabIndex={0}
          onClick={() => renamingChatId !== chat.chat_id && handleSelectChat(chat)}
          onKeyDown={(event) => handleCardKeyDown(event, chat, renamingChatId === chat.chat_id)}
          data-selected={
            chat.stock_code &&
            chat.stock_code.toUpperCase() === selectedStockCode?.toUpperCase()
          }
        >
          {renamingChatId === chat.chat_id ? (
            <RenameForm onSubmit={handleRenameSubmit} onClick={(event) => event.stopPropagation()}>
              <RenameInput
                autoFocus
                value={renameTitle}
                onChange={(event) => setRenameTitle(event.target.value)}
                placeholder="새 제목을 입력하세요"
                disabled={renaming}
              />
              <RenameActions>
                <RenameSaveButton type="submit" disabled={renaming}>
                  {renaming ? '저장 중...' : '저장'}
                </RenameSaveButton>
                <RenameCancelButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    cancelRenaming()
                  }}
                  disabled={renaming}
                >
                  취소
                </RenameCancelButton>
              </RenameActions>
            </RenameForm>
          ) : (
            <>
              <ChatTitle>{chat.title || chat.stock_code}</ChatTitle>
              <ChatMeta>{chat.stock_code}</ChatMeta>
              <CardActions>
                <EditButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    startRenaming(chat)
                  }}
                >
                  제목 수정
                </EditButton>
                <DeleteButton
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    handleMoveToTrash(chat.chat_id)
                  }}
                >
                  <FaTrash />
                </DeleteButton>
              </CardActions>
            </>
          )}
        </ChatCard>
      ))}
      <TrashLink onClick={() => window.location.href = '/trash'}>
        <FaTrash /> 휴지통
      </TrashLink>
    </Sidebar>
  )
}

const TrashLink = styled.button`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: #ef4444;
  }
`;

const Sidebar = styled.aside`
  width: 280px;
  background: linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%);
  border-right: 1px solid #e0e4e8;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.03);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    margin: 8px 0;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #c5cad1 0%, #b0b7c0 100%);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: padding-box;
    
    &:hover {
      background: linear-gradient(180deg, #a8b0ba 0%, #9ba3ad 100%);
      background-clip: padding-box;
    }
  }
`;

const NewChatCard = styled.form`
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fb 100%);
  border: 1px solid #d8dce3;
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    border-color: #c5cad1;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FieldLabel = styled.label`
  font-size: 12px;
  color: #4a5568;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  background: #ffffff;
  border: 2px solid #e2e6eb;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: #2d3748;
  transition: all 0.2s ease;

  &:hover {
    border-color: #cbd2db;
  }

  &:focus {
    outline: none;
    border-color: #4169e1;
    background: #fafbfc;
    box-shadow: 0 0 0 3px rgba(65, 105, 225, 0.1);
  }

  &::placeholder {
    color: #a0aec0;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 4px;
`;

const NewChatButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #4169e1 0%, #3554c8 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 14px 20px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  box-shadow: 0 4px 12px rgba(65, 105, 225, 0.25);
  position: relative;
  overflow: hidden;
  min-width: 0;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #3558b8 0%, #2a46a0 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(65, 105, 225, 0.35);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(65, 105, 225, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
`;

const SecondaryButton = styled.button`
  background: #ffffff;
  color: #64748b;
  border: 2px solid #e2e6eb;
  border-radius: 10px;
  padding: 14px 18px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
  flex-shrink: 0;
  white-space: nowrap;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd2db;
    color: #475569;
  }

  &:active {
    background: #e9ecef;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ChatCard = styled.div`
  background: #ffffff;
  border: 2px solid #e8ecf0;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #4169e1;
    transform: scaleY(0);
    transition: transform 0.25s ease;
  }

  &:hover {
    background: #f8f9fb;
    border-color: #cbd2db;
    transform: translateX(4px);
    box-shadow: -2px 4px 12px rgba(0, 0, 0, 0.06);
    
    &::before {
      transform: scaleY(1);
    }
  }

  &[data-selected='true'] {
    border-color: #4169e1;
    background: linear-gradient(135deg, #eaf0ff 0%, #f0f5ff 100%);
    box-shadow: 0 2px 8px rgba(65, 105, 225, 0.15);
    
    &::before {
      transform: scaleY(1);
    }
  }

  &:active {
    transform: translateX(2px);
  }
`;

const Placeholder = styled.div`
  padding: 24px 16px;
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  line-height: 1.6;
  font-weight: 500;
`;

const ErrorBanner = styled.div`
  padding: 14px 16px;
  background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
  color: #dc2626;
  border-radius: 10px;
  font-size: 13px;
  border: 1px solid #fecaca;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
`;

const ChatMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ChatTitle = styled.p`
  margin: 0;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.5;
  font-weight: 600;
`;

const CardActions = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
`;

const EditButton = styled.button`
  background: transparent;
  border: none;
  color: #4169e1;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 12px;
  font-weight: 700;
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(65, 105, 225, 0.1);
    color: #2f4fb5;
  }

  &:active {
    background: rgba(65, 105, 225, 0.2);
  }
`;

const DeleteButton = styled.button`
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;

  &:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
  }

  &:active {
    background: rgba(239, 68, 68, 0.2);
  }
`;

const RenameForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const RenameInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 2px solid #cbd2db;
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  font-weight: 600;
  color: #1e293b;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #4169e1;
    background: #fafbfc;
    box-shadow: 0 0 0 3px rgba(65, 105, 225, 0.1);
  }
`;

const RenameActions = styled.div`
  display: flex;
  gap: 8px;
`;

const RenameSaveButton = styled.button`
  flex: 1;
  background: linear-gradient(135deg, #10a37f 0%, #0d8a6a 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(16, 163, 127, 0.25);

  &:hover {
    background: linear-gradient(135deg, #0e8a6a 0%, #0b7456 100%);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 163, 127, 0.35);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const RenameCancelButton = styled.button`
  flex: 1;
  background: #ffffff;
  color: #64748b;
  border: 2px solid #e2e6eb;
  border-radius: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd2db;
    color: #475569;
  }

  &:active {
    background: #e9ecef;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;