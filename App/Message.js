import React from 'react';

function Message({ text, isUserMessage }) {
  const messageClass = isUserMessage ? 'user-message-bubble' : 'other-message-bubble';
  return (
    <div className={`message-bubble ${messageClass}`}>
      <p>{text}</p>
    </div>
  );
}

export default Message;
