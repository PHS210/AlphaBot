import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaBookmark, FaTrash, FaFolder, FaPlus } from 'react-icons/fa';

interface BookmarkedMessage {
  id: number;
  content: string;
  chatTitle: string;
  createdAt: string;
  categoryId: number;
}

interface Category {
  id: number;
  title: string;
  color: string;
}

const BookmarkPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Mock 카테고리
  const [categories, setCategories] = useState<Category[]>([
    { id: 0, title: '전체', color: '#667eea' },
    { id: 1, title: '투자 전략', color: '#e74c3c' },
    { id: 2, title: '재무제표 분석', color: '#27ae60' },
    { id: 3, title: '시장 동향', color: '#f39c12' },
  ]);

  const [selectedCategory, setSelectedCategory] = useState(0);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Mock 북마크된 메시지
  const [bookmarks] = useState<BookmarkedMessage[]>([
    {
      id: 1,
      content: 'AAPL의 2024년 3분기 실적은 전년 대비 8% 성장했으며, 특히 서비스 부문의 성장이 두드러졌습니다.',
      chatTitle: 'AAPL 주식 분석',
      createdAt: '2024-09-15',
      categoryId: 2
    },
    {
      id: 2,
      content: '현재 시장 상황에서는 방어적인 포지션을 유지하면서 점진적으로 매수하는 전략이 유효할 것으로 보입니다.',
      chatTitle: '투자 전략 상담',
      createdAt: '2024-09-14',
      categoryId: 1
    },
    {
      id: 3,
      content: 'NVDA는 AI 칩 시장에서 독보적인 위치를 차지하고 있으며, 향후 5년간 연평균 25% 이상의 성장이 예상됩니다.',
      chatTitle: 'NVDA 분석 요청',
      createdAt: '2024-09-13',
      categoryId: 3
    },
    {
      id: 4,
      content: 'P/E Ratio가 업계 평균보다 낮고, ROE가 높아 저평가되어 있다고 판단됩니다.',
      chatTitle: 'MSFT 재무제표',
      createdAt: '2024-09-12',
      categoryId: 2
    },
  ]);

  const filteredBookmarks = selectedCategory === 0 
    ? bookmarks 
    : bookmarks.filter(b => b.categoryId === selectedCategory);

  const handleDeleteBookmark = (id: number) => {
    if (window.confirm('이 메시지를 북마크에서 삭제하시겠습니까?')) {
      alert('북마크가 삭제되었습니다.');
      // 실제로는 여기서 상태 업데이트
    }
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      alert('카테고리 이름을 입력하세요.');
      return;
    }
    
    const colors = ['#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
    const newCategory: Category = {
      id: categories.length,
      title: newCategoryName,
      color: colors[Math.floor(Math.random() * colors.length)]
    };
    
    setCategories([...categories, newCategory]);
    setNewCategoryName('');
    setShowNewCategoryModal(false);
    alert('새 카테고리가 추가되었습니다.');
  };

  return (
    <Container>
      <Content>
        <Header>
          <BackButton onClick={() => navigate('/chat')}>
            <FaArrowLeft /> 뒤로가기
          </BackButton>
          <Title><FaBookmark /> 저장된 메시지</Title>
        </Header>

        <MainContent>
          <Sidebar>
            <SidebarTitle>카테고리</SidebarTitle>
            {categories.map(cat => (
              <CategoryItem
                key={cat.id}
                active={selectedCategory === cat.id}
                color={cat.color}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <FaFolder /> {cat.title}
                {cat.id === 0 && ` (${bookmarks.length})`}
                {cat.id !== 0 && ` (${bookmarks.filter(b => b.categoryId === cat.id).length})`}
              </CategoryItem>
            ))}
            <AddCategoryButton onClick={() => setShowNewCategoryModal(true)}>
              <FaPlus /> 새 카테고리
            </AddCategoryButton>
          </Sidebar>

          <BookmarkList>
            {filteredBookmarks.length === 0 ? (
              <EmptyState>
                <FaBookmark size={48} color="#ddd" />
                <EmptyText>저장된 메시지가 없습니다.</EmptyText>
              </EmptyState>
            ) : (
              filteredBookmarks.map(bookmark => (
                <BookmarkCard key={bookmark.id}>
                  <CardHeader>
                    <ChatInfo>
                      <ChatTitle>{bookmark.chatTitle}</ChatTitle>
                      <DateText>{bookmark.createdAt}</DateText>
                    </ChatInfo>
                    <DeleteButton onClick={() => handleDeleteBookmark(bookmark.id)}>
                      <FaTrash />
                    </DeleteButton>
                  </CardHeader>
                  <MessageContent>{bookmark.content}</MessageContent>
                  <CategoryBadge color={categories.find(c => c.id === bookmark.categoryId)?.color || '#999'}>
                    {categories.find(c => c.id === bookmark.categoryId)?.title || '미분류'}
                  </CategoryBadge>
                </BookmarkCard>
              ))
            )}
          </BookmarkList>
        </MainContent>
      </Content>

      {showNewCategoryModal && (
        <Modal onClick={() => setShowNewCategoryModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalTitle>새 카테고리 추가</ModalTitle>
            <ModalInput
              type="text"
              placeholder="카테고리 이름을 입력하세요"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <ModalButtons>
              <ModalButton primary onClick={handleAddCategory}>추가</ModalButton>
              <ModalButton onClick={() => setShowNewCategoryModal(false)}>취소</ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
`;

const Content = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: all 0.2s;

  &:hover {
    background: #f8f8f8;
    border-color: #bbb;
  }
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  color: #333;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
`;

const Sidebar = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  height: fit-content;
`;

const SidebarTitle = styled.h3`
  font-size: 16px;
  color: #333;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f0f0;
`;

const CategoryItem = styled.button<{ active: boolean; color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: ${props => props.active ? `${props.color}15` : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.active ? props.color : 'transparent'};
  color: ${props => props.active ? props.color : '#666'};
  font-size: 14px;
  font-weight: ${props => props.active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: ${props => `${props.color}10`};
  }
`;

const AddCategoryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: 2px dashed #ddd;
  border-radius: 8px;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  margin-top: 15px;
  transition: all 0.2s;

  &:hover {
    border-color: #667eea;
    color: #667eea;
  }
`;

const BookmarkList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const BookmarkCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const ChatInfo = styled.div`
  flex: 1;
`;

const ChatTitle = styled.h3`
  font-size: 14px;
  color: #667eea;
  margin-bottom: 4px;
`;

const DateText = styled.span`
  font-size: 12px;
  color: #999;
`;

const DeleteButton = styled.button`
  padding: 8px;
  background: transparent;
  border: none;
  color: #e74c3c;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #ffe5e5;
  }
`;

const MessageContent = styled.p`
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
`;

const CategoryBadge = styled.span<{ color: string }>`
  display: inline-block;
  padding: 4px 12px;
  background: ${props => `${props.color}15`};
  color: ${props => props.color};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
`;

const EmptyText = styled.p`
  margin-top: 16px;
  font-size: 16px;
  color: #999;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  color: #333;
  margin-bottom: 20px;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 20px;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const ModalButton = styled.button<{ primary?: boolean }>`
  padding: 10px 20px;
  background: ${props => props.primary ? '#667eea' : '#e0e0e0'};
  color: ${props => props.primary ? 'white' : '#666'};
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.primary ? '#5568d3' : '#d0d0d0'};
  }
`;

export default BookmarkPage;

