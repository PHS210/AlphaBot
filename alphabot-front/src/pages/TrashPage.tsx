import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaTrash, FaUndo, FaTrashRestore } from 'react-icons/fa';
import * as chatApi from '@/api/chat';

const TrashPage: React.FC = () => {
  const navigate = useNavigate();
  const [trashedChats, setTrashedChats] = useState<chatApi.BackendChat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const fetchTrashedChats = useCallback(async () => {
    setLoading(true);
    try {
      const allChats = await chatApi.listChats();
      // trash_can이 'in'인 채팅방만 필터링
      const trashed = allChats.filter(chat => chat.trash_can === 'in');
      setTrashedChats(trashed);
    } catch (error) {
      console.error('Failed to fetch trashed chats:', error);
      alert('휴지통 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrashedChats();
  }, [fetchTrashedChats]);

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev =>
      prev.includes(id)
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === trashedChats.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(trashedChats.map(chat => chat.chat_id));
    }
  };

  const handleRestore = async (chatId: number) => {
    if (!window.confirm('이 채팅방을 복원하시겠습니까?')) {
      return;
    }
    try {
      await chatApi.updateChat(chatId, { trash_can: 'out' });
      await fetchTrashedChats();
      setSelectedItems(prev => prev.filter(id => id !== chatId));
      alert('채팅방이 복원되었습니다.');
    } catch (error) {
      console.error('Failed to restore chat:', error);
      alert('채팅방을 복원하지 못했습니다.');
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedItems.length === 0) {
      alert('복원할 항목을 선택해주세요.');
      return;
    }

    if (!window.confirm(`선택한 ${selectedItems.length}개의 채팅방을 복원하시겠습니까?`)) {
      return;
    }

    try {
      // 병렬로 복원 요청 처리
      await Promise.all(selectedItems.map(chatId =>
        chatApi.updateChat(chatId, { trash_can: 'out' })
      ));
      await fetchTrashedChats();
      setSelectedItems([]);
      alert('선택한 항목이 복원되었습니다.');
    } catch (error) {
      console.error('Failed to restore selected chats:', error);
      alert('일부 항목을 복원하지 못했습니다.');
    }
  };

  // 백엔드에서 영구 삭제를 지원하지 않으므로 UI에서 숨김 처리
  /*
  const handleDelete = (id: number) => {
    if (window.confirm('이 항목을 영구적으로 삭제하시겠습니까?\n삭제된 항목은 복구할 수 없습니다.')) {
      // API call to delete permanently
    }
  };
  */

  return (
    <Container>
      <Content>
        <Header>
          <BackButton onClick={() => navigate('/chat')}>
            <FaArrowLeft /> 뒤로가기
          </BackButton>
          <TitleSection>
            <Title><FaTrash /> 휴지통</Title>
            <ItemCount>{trashedChats.length}개의 항목</ItemCount>
          </TitleSection>
        </Header>

        {trashedChats.length > 0 && (
          <ActionBar>
            <LeftActions>
              <Checkbox
                type="checkbox"
                checked={selectedItems.length === trashedChats.length && trashedChats.length > 0}
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
              {/* 영구 삭제 기능 미지원으로 숨김 */}
              {/* 
              <ActionButton danger disabled={selectedItems.length === 0} onClick={handleDeleteSelected}>
                <FaTrash /> 선택 삭제
              </ActionButton>
              <ActionButton danger onClick={handleEmptyTrash}>
                <FaTrash /> 휴지통 비우기
              </ActionButton> 
              */}
            </RightActions>
          </ActionBar>
        )}

        {loading ? (
          <EmptyState>
            <EmptyText>로딩 중...</EmptyText>
          </EmptyState>
        ) : trashedChats.length === 0 ? (
          <EmptyState>
            <FaTrash size={64} color="#ddd" />
            <EmptyText>휴지통이 비어있습니다.</EmptyText>
            <EmptySubText>삭제된 채팅방이 여기에 표시됩니다.</EmptySubText>
          </EmptyState>
        ) : (
          <ItemList>
            {trashedChats.map(chat => (
              <ItemCard key={chat.chat_id} selected={selectedItems.includes(chat.chat_id)}>
                <ItemHeader>
                  <Checkbox
                    type="checkbox"
                    checked={selectedItems.includes(chat.chat_id)}
                    onChange={() => handleSelectItem(chat.chat_id)}
                  />
                  <ItemInfo>
                    <ItemType type="chat">채팅방</ItemType>
                    <ItemTitle>{chat.title || chat.stock_code}</ItemTitle>
                    <DeletedDate>종목코드: {chat.stock_code}</DeletedDate>
                  </ItemInfo>
                </ItemHeader>
                <ItemActions>
                  <RestoreButton onClick={() => handleRestore(chat.chat_id)}>
                    <FaTrashRestore /> 복원
                  </RestoreButton>
                  {/* 영구 삭제 버튼 숨김 */}
                  {/* 
                  <DeleteButton onClick={() => handleDelete(chat.chat_id)}>
                    <FaTrash /> 영구 삭제
                  </DeleteButton> 
                  */}
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

/*
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
*/

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

