import type { ChatMessage } from '@/types/chat'

type Props = {
  message: ChatMessage
}

export default function MessageItem({ message }: Props) {
  return (
    <div className={`message ${message.role}`}>
      {message.role === 'bot' && (
        <span className="bot-icon" aria-hidden>
          💼
        </span>
      )}
      <div className="message-text">{message.text}</div>
    </div>
  )
}

