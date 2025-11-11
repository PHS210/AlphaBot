import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaTrash, FaUndo, FaTrashRestore } from 'react-icons/fa';

interface TrashItem {
  id: number;
  type: 'chat' | 'bookmark';
  title: string;
  content?: string;
  deletedAt: string;
}

const TrashPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [trashedItems, setTrashedItems] = useState<TrashItem[]>([
    {
      id: 1,
      type: 'chat',
      title: 'MSFT 관련된 내용 질문',
      deletedAt: '2024-09-15'
    },
    {
      id: 2,
      type: 'bookmark',
      title: 'AAPL 투자 전략',
      content: '장기 투자 관점에서 AAPL은 여전히 매력적인 종목입니다...',
      deletedAt: '2024-09-14'
    },
    {
      id: 3,
      type: 'chat',
      title: 'NVDA 주가 분석',
      deletedAt: '2024-09-13'
    },
    {
      id: 4,
      type: 'bookmark',
      title: 'S&P 500 시장 전망',
      content: '2024년 하반기 시장 전망에 대한 분석입니다...',
      deletedAt: '2024-09-12'
    },
  ]);

  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === trashedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(trashedItems.map(item => item.id));
    }
  };

  const handleRestore = (id: number) => {
    if (window.confirm('이 항목을 복원하시겠습니까?')) {
      setTrashedItems(prev => prev.filter(item => item.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      alert('항목이 성공적으로 복원되었습니다.');
    }
  };

  const handleRestoreSelected = () => {
    if (selectedItems.length === 0) {
      alert('복원할 항목을 선택해주세요.');
      return;
    }
    
    if (window.confirm(`선택한 ${selectedItems.length}개의 항목을 복원하시겠습니까?`)) {
      setTrashedItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      alert('선택한 항목이 복원되었습니다.');
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm('이 항목을 영구적으로 삭제하시겠습니까?\n삭제된 항목은 복구할 수 없습니다.')) {
      setTrashedItems(prev => prev.filter(item => item.id !== id));
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
      alert('항목이 영구적으로 삭제되었습니다.');
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      alert('삭제할 항목을 선택해주세요.');
      return;
    }
    
    if (window.confirm(`선택한 ${selectedItems.length}개의 항목을 영구적으로 삭제하시겠습니까?\n삭제된 항목은 복구할 수 없습니다.`)) {
      setTrashedItems(prev => prev.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      alert('선택한 항목이 영구적으로 삭제되었습니다.');
    }
  };

  const handleEmptyTrash = () => {
    if (trashedItems.length === 0) {
      alert('휴지통이 이미 비어있습니다.');
      return;
    }

    if (window.confirm('휴지통을 비우시겠습니까?\n모든 항목이 영구적으로 삭제되며 복구할 수 없습니다.')) {
      setTrashedItems([]);
      setSelectedItems([]);
      alert('휴지통이 비워졌습니다.');
    }
  };

  return (
    <Container>
      <Content>
        <Header>
          <BackButton onClick={() => navigate('/chat')}>
            <FaArrowLeft /> 뒤로가기
          </BackButton>
          <TitleSection>
            <Title><FaTrash /> 휴지통</Title>
            <ItemCount>{trashedItems.length}개의 항목</ItemCount>
          </TitleSection>
        </Header>

        {trashedItems.length > 0 && (
          <ActionBar>
            <LeftActions>
              <Checkbox
                type="checkbox"
                checked={selectedItems.length === trashedItems.length && trashedItems.length > 0}
                onChange={handleSelectAll}
              />
              <SelectAllText onClick={handleSelectAll}>
                전체 선택 {selectedItems.length > 0 && `(${selectedItems.length})`}
              </SelectAllText>
            </LeftActions>
            <RightActions>
              <ActionButton disabled={selectedItems.length === 0} onClick={handleRestoreSelected}>
                <FaUndo /> 선택 복원
              </ActionButton>
              <ActionButton danger disabled={selectedItems.length === 0} onClick={handleDeleteSelected}>
                <FaTrash /> 선택 삭제
              </ActionButton>
              <ActionButton danger onClick={handleEmptyTrash}>
                <FaTrash /> 휴지통 비우기
              </ActionButton>
            </RightActions>
          </ActionBar>
        )}

        {trashedItems.length === 0 ? (
          <EmptyState>
            <FaTrash size={64} color="#ddd" />
            <EmptyText>휴지통이 비어있습니다.</EmptyText>
            <EmptySubText>삭제된 항목이 여기에 표시됩니다.</EmptySubText>
          </EmptyState>
        ) : (
          <ItemList>
            {trashedItems.map(item => (
              <ItemCard key={item.id} selected={selectedItems.includes(item.id)}>
                <ItemHeader>
                  <Checkbox
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={() => handleSelectItem(item.id)}
                  />
                  <ItemInfo>
                    <ItemType type={item.type}>
                      {item.type === 'chat' ? '채팅방' : '북마크'}
                    </ItemType>
                    <ItemTitle>{item.title}</ItemTitle>
                    <DeletedDate>삭제일: {item.deletedAt}</DeletedDate>
                  </ItemInfo>
                </ItemHeader>
                {item.content && (
                  <ItemContent>{item.content}</ItemContent>
                )}
                <ItemActions>
                  <RestoreButton onClick={() => handleRestore(item.id)}>
                    <FaTrashRestore /> 복원
                  </RestoreButton>
                  <DeleteButton onClick={() => handleDelete(item.id)}>
                    <FaTrash /> 영구 삭제
                  </DeleteButton>
                </ItemActions>
              </ItemCard>
            ))}
          </ItemList>
        )}
      </Content>
    </Container>
  );
};

const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
`;

const Content = styled.div`
  max-width: 1200px;
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

const TitleSection = styled.div`
  flex: 1;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 28px;
  color: #333;
  margin-bottom: 4px;
`;

const ItemCount = styled.p`
  font-size: 14px;
  color: #999;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const LeftActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const RightActions = styled.div`
  display: flex;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const SelectAllText = styled.span`
  font-size: 14px;
  color: #555;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #667eea;
  }
`;

const ActionButton = styled.button<{ danger?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: ${props => props.danger ? '#ffe5e5' : '#e8f0fe'};
  color: ${props => props.danger ? '#e74c3c' : '#667eea'};
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: ${props => props.danger ? '#fdd' : '#d0e1fd'};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ItemList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const ItemCard = styled.div<{ selected: boolean }>`
  background: white;
  padding: 20px;
  border-radius: 12px;
  border: 2px solid ${props => props.selected ? '#667eea' : 'transparent'};
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }
`;

const ItemHeader = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
`;

const ItemInfo = styled.div`
  flex: 1;
`;

const ItemType = styled.span<{ type: string }>`
  display: inline-block;
  padding: 4px 10px;
  background: ${props => props.type === 'chat' ? '#e8f0fe' : '#fff3e0'};
  color: ${props => props.type === 'chat' ? '#667eea' : '#f39c12'};
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const ItemTitle = styled.h3`
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
`;

const DeletedDate = styled.p`
  font-size: 12px;
  color: #999;
`;

const ItemContent = styled.p`
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-left: 33px;
  margin-bottom: 12px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
`;

const ItemActions = styled.div`
  display: flex;
  gap: 10px;
  justify-content: flex-end;
`;

const RestoreButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #e8f5e9;
  color: #27ae60;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #c8e6c9;
  }
`;

const DeleteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #ffe5e5;
  color: #e74c3c;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #fdd;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const EmptyText = styled.p`
  margin-top: 20px;
  font-size: 18px;
  color: #666;
  font-weight: 600;
`;

const EmptySubText = styled.p`
  margin-top: 8px;
  font-size: 14px;
  color: #999;
`;

export default TrashPage;

