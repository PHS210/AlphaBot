import { apiFetch } from '@/api/client'

export type BackendMessage = {
  messages_id: number
  content: string
  user_id: number
  chat_id: number
  role: string
  created_at: string
}

export type BackendChat = {
  chat_id: number
  title: string
  stock_code?: string | null
  created_at: string
  lastchat_at?: string | null
  trash_can: string
}

export type ChatUpsertResponse = {
  chat_id: number
  title: string
  stock_code: string
  existed: boolean
}

export type ChatCompletionResponse = {
  user_message: BackendMessage
  assistant_message: BackendMessage
}

export async function upsertRoomByStock(stockCode: string, title?: string): Promise<ChatUpsertResponse> {
  const query = title ? `?${new URLSearchParams({ title })}` : ''
  return apiFetch<ChatUpsertResponse>(`/api/v1/chats/by-stock/${encodeURIComponent(stockCode)}${query}`, {
    method: 'PUT',
  })
}

export async function updateChat(
  chatId: number,
  payload: Partial<Pick<BackendChat, 'title' | 'trash_can'>>,
): Promise<BackendChat> {
  return apiFetch<BackendChat>(`/api/rooms/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function getMessages(
  roomId: number,
  lastMessageId?: number,
): Promise<BackendMessage[]> {
  const qs = lastMessageId ? `?last_message_id=${lastMessageId}` : ''
  return apiFetch<BackendMessage[]>(`/api/rooms/${roomId}/messages${qs}`, {
    method: 'GET',
  })
}

export async function createChatCompletion(
  roomId: number,
  params: { content: string; system_prompt?: string },
): Promise<ChatCompletionResponse> {
  return apiFetch<ChatCompletionResponse>(`/api/rooms/${roomId}/chat-completions`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function listChats(): Promise<BackendChat[]> {
  return apiFetch<BackendChat[]>(`/api/rooms`, {
    method: 'GET',
  })
}

