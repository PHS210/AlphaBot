import { FormEvent } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export default function ChatInput({ value, onChange, onSubmit }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <form className="input-area" onSubmit={handleSubmit}>
      <input
        aria-label="메시지 입력"
        placeholder="메시지를 입력하세요..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="send-btn" type="submit" title="Send" aria-label="메시지 보내기">
        ➤
      </button>
    </form>
  )
}
