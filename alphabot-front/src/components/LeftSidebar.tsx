// Mock data for chat history
const chatHistory = [
  {
    id: 1,
    title: '📄 MSFT 관련된 내용 질문하고 싶은데...',
    date: '2024.9.11'
  },
  {
    id: 2,
    title: '📊 AAPL 주식 분석 부탁드립니다',
    date: '2024.9.10'
  },
  {
    id: 3,
    title: '💹 테슬라 투자 전략',
    date: '2024.9.9'
  },
]

export default function LeftSidebar() {
  const handleNewChat = () => {
    console.log('새 채팅 시작')
  }

  return (
    <aside className="sidebar">
      <button className="new-chat-btn" onClick={handleNewChat}>
        + 새 채팅
      </button>
      
      {chatHistory.map((chat) => (
        <div key={chat.id} className="card">
          <p className="stock-item-title">{chat.title}</p>
          <p className="stock-item-date">{chat.date}</p>
        </div>
      ))}
    </aside>
  )
}

