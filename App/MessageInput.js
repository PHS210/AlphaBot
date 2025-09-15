import React, { useState } from 'react';

function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <form className="input-form" onSubmit={handleSubmit}>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="메시지 입력..."
        className="input-field"
      />
      <button type="submit" className="send-button">
        전송
      </button>
    </form>
  );
}

export default MessageInput;
