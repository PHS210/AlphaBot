import React from 'react';
import Message from './Message';
import MessageInput from './MessageInput';

function ChatWindow({ messages, onSendMessage }) {
  return (
    <main className="chat-window-container">
      <header className="chat-header">
        <h2 className="chat-title">Alpha Bot</h2>
      </header>
      <div className="messages-container">
        {messages.map(message => (
          <Message
            key={message.id}
            text={message.text}
            isUserMessage={message.sender === 'user'}
          />
        ))}
      </div>
      <MessageInput onSendMessage={onSendMessage} />
    </main>
  );
}

export default ChatWindow;
