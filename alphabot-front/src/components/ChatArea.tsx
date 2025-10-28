import { useState } from 'react'
import type { ChatMessage } from '@/types/chat'
import MessageItem from '@/components/chat/MessageItem'
import ChatInput from '@/components/chat/ChatInput'

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    role: 'bot',
    text: '안녕하세요! 주식 관련 궁금한 것이 있으시면 언제든 물어보세요.',
  },
  { id: 'm2', role: 'user', text: '안녕하세요! AAPL 주식에 대해 알려주세요.' },
  {
    id: 'm3',
    role: 'bot',
    text: '애플(AAPL)은 현재 기술 섹터의 대표 주식 중 하나입니다.\n\n최근 실적:\n• 매출: 전년 대비 성장세 유지\n• 아이폰 판매량: 안정적인 수요\n• 서비스 사업: 꾸준한 성장',
  },
]

export default function ChatArea() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')

  const send = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', text: trimmed },
    ])
    setInput('')
  }

  return (
    <section className="chat-area">
      <div
        className="messages"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((m) => (
          <MessageItem key={m.id} message={m} />
        ))}
      </div>
      <ChatInput value={input} onChange={setInput} onSubmit={send} />
    </section>
  )
}

