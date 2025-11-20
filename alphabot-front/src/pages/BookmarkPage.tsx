/**
 * @file src/pages/BookmarkPage.tsx
 * @description 저장된 메시지 (북마크) 페이지.
 * [수정] 런타임 오류 방지를 위해 isError 및 데이터 핸들링 강화
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaBookmark, FaTrash, FaFolder, FaPlus } from 'react-icons/fa';
import { AxiosError } from 'axios';

// --- API 훅 및 타입 임포트 ---
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { useSavedMessages, useBookmarkMutations } from '@/hooks/useSavedMessages'; 
import { LoadingSpinner } from '@/components/common/LoadingSpinner'; 
import type { Category } from '@/components/category/category.types';

export const BookmarkPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth(); 
  
  const [selectedCategory, setSelectedCategory] = useState(0); 
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null); 

  // --- React Query 훅 (데이터 로딩) ---
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    isError: categoriesError, // 👈 isError 상태
    error: categoriesErrorObject // 👈 error 객체
  } = useCategories({
    page: 1,
    page_size: 99, 
    search: '',
  });

  const { 
    data: bookmarksData, 
    isLoading: bookmarksLoading,
    isError: bookmarksError, // 👈 isError 상태
    error: bookmarksErrorObject // 👈 error 객체
  } = useSavedMessages(selectedCategory);
  
  const bookmarks = bookmarksData || [];

  const { createMutation } = useCategoryMutations();
  const { deleteMutation: deleteBookmarkMutation } = useBookmarkMutations();

  // --- 핸들러 함수 (API 연동) ---
  // (handleAddCategory, handleDeleteBookmark 함수는 이전과 동일)
  const handleDeleteBookmark = async (bookmarkId: number) => {
    if (window.confirm('이 메시지를 북마크에서 삭제하시겠습니까?')) {
      try {
        await deleteBookmarkMutation.mutateAsync(bookmarkId);
        alert('북마크가 삭제되었습니다.');
      } catch (error) {
        alert('삭제에 실패했습니다.');
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      setModalError('카테고리 이름을 입력하세요.');
      return;
    }
    setModalError(null);
    try {
      await createMutation.mutateAsync({ title: newCategoryName });
      setNewCategoryName('');
      setShowNewCategoryModal(false);
      alert('새 카테고리가 추가되었습니다.');
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 400) {
        setModalError('제목이 중복되거나 유효하지 않습니다.');
      } else {
        setModalError('생성에 실패했습니다. (권한 또는 서버 오류)');
      }
    }
  };


  // --- 렌더링 로직 ---

  // 👇 [수정] 런타임 오류 방지 (Axios 에러인지 확인)
  const isAxiosError = (err: unknown): err is AxiosError => {
    return (err as AxiosError)?.isAxiosError === true;
  };
  
  // [수정] 카테고리 또는 북마크 로딩 중
  if (categoriesLoading || bookmarksLoading) {
    // 💡 [개선] 로딩 스피너를 페이지 중앙에 배치
    return (
      <Container style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner />
      </Container>
    );
  }

  // 👇 [수정] 런타임 오류 방지 (에러 발생 시)
  if (categoriesError || bookmarksError) {
    const errorToShow = categoriesError ? categoriesErrorObject : bookmarksErrorObject;
    let errorMessage = "데이터를 불러오는 중 오류가 발생했습니다.";
    
    if (isAxiosError(errorToShow) && errorToShow.response) {
      if (errorToShow.response.status === 503) {
        errorMessage = `[백엔드 오류] 503 Service Unavailable. 백엔드(alphabot-back-dev)가 실행 중인지 확인하세요. (app/main.py 오류 점검 필요)`;
      } else {
        errorMessage = `오류 코드 ${errorToShow.response.status}: ${errorToShow.message}`;
      }
    } else if (errorToShow instanceof Error) {
      errorMessage = errorToShow.message;
    }
    
    return <div style={{ color: 'red', padding: '20px' }}>{errorMessage}</div>;
  }

  // [수정] 런타임 오류 방지 (데이터 가공)
  const categories: Category[] = [
    { id: 0, title: '전체', color: '#667eea', item_count: bookmarks.length, created_at: '' },
    // 👇 [수정] ?.items?.map 으로 안전하게 접근
    ...(categoriesData?.items?.map(cat => ({ 
        ...cat,
        color: cat.color || '#9b59b6', 
    })) || [])
  ];

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
          {/* 카테고리 사이드바 (데이터 로딩 보장됨) */}
          <Sidebar>
            <SidebarTitle>카테고리</SidebarTitle>
            {categories.map(cat => (
              <CategoryItem
                key={cat.id}
                $active={selectedCategory === cat.id}
                $color={cat.color || '#999'}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <FaFolder /> {cat.title}
                {cat.id === 0 ? ` (${bookmarks.length})` : ` (${cat.item_count})`}
              </CategoryItem>
            ))}
            {isAdmin && (
              <AddCategoryButton onClick={() => setShowNewCategoryModal(true)}>
                <FaPlus /> 새 카테고리
              </AddCategoryButton>
            )}
          </Sidebar>

          {/* 북마크 목록 (데이터 로딩 보장됨) */}
          <BookmarkList>
            {bookmarks.length === 0 ? ( 
              <EmptyState>
                <FaBookmark size={48} color="#ddd" />
                <EmptyText>저장된 메시지가 없습니다.</EmptyText>
              </EmptyState>
            ) : (
              bookmarks.map(bookmark => ( 
                <BookmarkCard key={bookmark.id}>
                  <CardHeader>
                    <ChatInfo>
                      <ChatTitle>{bookmark.chatTitle}</ChatTitle>
                      <DateText>{bookmark.createdAt}</DateText>
                    </ChatInfo>
                    <DeleteButton 
                      onClick={() => handleDeleteBookmark(bookmark.id)}
                      disabled={deleteBookmarkMutation.isPending && deleteBookmarkMutation.variables === bookmark.id}
                    >
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

      {/* 모달 */}
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
            
            {modalError && <p style={{ color: 'red', fontSize: '14px' }}>{modalError}</p>}
            
            <ModalButtons>
              <ModalButton 
                $primary 
                onClick={handleAddCategory}
                disabled={createMutation.isPending} 
              >
                {createMutation.isPending ? '추가 중...' : '추가'}
              </ModalButton>
              <ModalButton onClick={() => setShowNewCategoryModal(false)}>취소</ModalButton>
            </ModalButtons>
          </ModalContent>
        </Modal>
      )}
    </Container>
  );
};

// --- Styled Components (기존 코드와 동일) ---
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

const CategoryItem = styled.button<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  background: ${props => props.$active ? `${props.$color}15` : 'transparent'};
  border: none;
  border-left: 3px solid ${props => props.$active ? props.$color : 'transparent'};
  color: ${props => props.$active ? props.$color : '#666'};
  font-size: 14px;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;

  &:hover {
    background: ${props => `${props.$color}10`};
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

const ModalButton = styled.button<{ $primary?: boolean }>`
  padding: 10px 20px;
  background: ${props => props.$primary ? '#667eea' : '#e0e0e0'};
  color: ${props => props.$primary ? 'white' : '#666'};
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$primary ? '#5568d3' : '#d0d0d0'};
  }
`;

export default BookmarkPage;