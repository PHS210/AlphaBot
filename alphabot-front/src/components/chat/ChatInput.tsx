import type { FormEvent } from 'react'
import styled from 'styled-components'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
}

export default function ChatInput({ value, onChange, onSubmit, disabled }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!disabled) {
      onSubmit()
    }
  }

  return (
    <Form onSubmit={handleSubmit}>
      <InputContainer>
        <Input
          aria-label="메시지 입력"
          placeholder={disabled ? "종목을 먼저 선택해주세요..." : "메시지를 입력하세요..."}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
        <SendButton 
          type="submit" 
          title="Send" 
          aria-label="메시지 보내기"
          disabled={disabled || !value.trim()}
        >
          <SendIcon>➤</SendIcon>
        </SendButton>
      </InputContainer>
    </Form>
  )
}

const Form = styled.form`
  width: 100%;
`;

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #d9d9e3;
  border-radius: 12px;
  box-shadow: 0 0 0 0 rgba(65, 105, 225, 0);
  transition: all 0.2s;

  &:focus-within {
    border-color: #4169e1;
    box-shadow: 0 0 0 3px rgba(65, 105, 225, 0.1);
  }
`;

const Input = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #202123;
  font-size: 15px;
  font-family: inherit;
  line-height: 1.5;

  &::placeholder {
    color: #8e8ea0;
  }

  &:disabled {
    color: #c5c5d2;
    cursor: not-allowed;
  }
`;

const SendButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #4169e1;
  color: #ffffff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #3558b8;
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const SendIcon = styled.span`
  display: block;
  transform: translateX(1px);
`;
