import styled from 'styled-components'
import type { ChatMessage } from '@/types/chat'

type Props = {
  message: ChatMessage
}

export default function MessageItem({ message }: Props) {
  return (
    <MessageWrapper role={message.role}>
      <MessageContent>
        {message.role === 'bot' && (
          <IconWrapper>
            <BotIcon aria-hidden>💼</BotIcon>
          </IconWrapper>
        )}
        <MessageText role={message.role}>{message.text}</MessageText>
      </MessageContent>
    </MessageWrapper>
  )
}

const MessageWrapper = styled.div<{ role: 'bot' | 'user' }>`
  width: 100%;
  display: flex;
  justify-content: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
  padding: 8px 0;
`;

const MessageContent = styled.div`
  display: flex;
  gap: 12px;
  max-width: 80%;
  align-items: flex-start;
`;

const IconWrapper = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4169e1;
  border-radius: 8px;
  margin-top: 2px;
`;

const BotIcon = styled.span`
  font-size: 18px;
  line-height: 1;
  filter: grayscale(1) brightness(2);
`;

const MessageText = styled.div<{ role: 'bot' | 'user' }>`
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 15px;
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
  
  ${props => props.role === 'bot' ? `
    background: #f7f7f8;
    color: #202123;
    border-bottom-left-radius: 4px;
  ` : `
    background: #4169e1;
    color: #ffffff;
    border-bottom-right-radius: 4px;
  `}
`;
