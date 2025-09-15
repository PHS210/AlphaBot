import React, { useState } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import './App.css'; // 순수 CSS 파일 불러오기

const DUMMY_CHATS = [
  { id: 1, name: 'MSFT 전망에 대해 알려주라...', date: '2023.9.6', active: true },
  { id: 2, name: '새 채팅', date: '2023.9.15', active: false },
  // ...더미 데이터 추가
];

const DUMMY_MESSAGES = [
  { id: 1, text: 'MSFT 전망에 대해 알려주라...', sender: 'user' },
  { id: 2, text: '안녕하세요! Microsoft에 대한 최근 동향과 전망에 대해 알려드릴까요?', sender: 'other' },
  // ...더미 데이터 추가
];

function App() {
  const [chats, setChats] = useState(DUMMY_CHATS);
  const [messages, setMessages] = useState(DUMMY_MESSAGES);
  const [activeChatId, setActiveChatId] = useState(1);

  const handleSendMessage = (text) => {
    const newMessage = {
      id: messages.length + 1,
      text,
      sender: 'user',
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={setActiveChatId}
        />
        <ChatWindow
          messages={messages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

export default App;
