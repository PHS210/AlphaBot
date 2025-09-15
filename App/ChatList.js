import React from 'react';

function ChatList({ chats, activeChatId, onSelectChat }) {
  return (
    <aside className="chat-list-container">
      <button className="new-chat-button">
        + 새 채팅
      </button>
      <ul>
        {chats.map(chat => (
          <li
            key={chat.id}
            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <h4 className="chat-name">{chat.name}</h4>
            <span className="chat-date">{chat.date}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default ChatList;