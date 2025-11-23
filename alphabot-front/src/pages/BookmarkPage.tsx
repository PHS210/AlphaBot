/**
 * @file src/pages/BookmarkPage.tsx
 * @description 저장된 메시지 (북마크) 페이지.
 * [최종 수정] 400 Bad Request 에러 감지 로직 강화 (status 추출 방식 개선)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaArrowLeft, FaBookmark, FaTrash, FaFolder, FaPlus, FaSyncAlt } from 'react-icons/fa';
import { AxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';

// --- API 훅 및 타입 임포트 ---
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import { useSavedMessages, useBookmarkMutations } from '@/hooks/useSavedMessages'; 
import { LoadingSpinner } from '@/components/common/LoadingSpinner'; 
import type { SavedMessage } from '@/components/bookmark/bookmark.types'; 
import type { Category } from '@/components/category/category.types';

// ----------------------------------------------------------------------
// 1. BookmarkList 컴포넌트
// ----------------------------------------------------------------------
interface BookmarkListProps {
  bookmarks: SavedMessage[];
  categories: Category[];
  onDelete: (id: number) => void;
  isDeleting: boolean;
  deletingId: number | null;
}

const BookmarkList: React.FC<BookmarkListProps> = ({ 
  bookmarks, categories, onDelete, isDeleting, deletingId 
}) => {
  if (!bookmarks || bookmarks.length === 0) {
    return (
      <EmptyState>
        <FaBookmark size={48} color="#ddd" />
        <EmptyText>저장된 메시지가 없습니다.</EmptyText>
      </EmptyState>
    );
  }

  return (
    <ListWrapper>
      {bookmarks.map(bookmark => {
        const matchedCategory = categories.find(c => c.id === bookmark.categoryId);
        
        return (
          <BookmarkCard key={bookmark.id}>
            <CardHeader>
              <ChatInfo>
                <ChatTitle>{bookmark.chatTitle}</ChatTitle>
                <DateText>{bookmark.createdAt}</DateText>
              </ChatInfo>
              <DeleteButton 
                onClick={() => onDelete(bookmark.id)}
                disabled={isDeleting && deletingId === bookmark.id}
              >
                <FaTrash />
              </DeleteButton>
            </CardHeader>
            <MessageContent>{bookmark.content}</MessageContent>
            
            <CategoryBadge color={matchedCategory?.color || '#999'}>
              {matchedCategory?.title || '미분류'}
            </CategoryBadge>
          </BookmarkCard>
        );
      })}
    </ListWrapper>
  );
};

// ----------------------------------------------------------------------
// 2. 메인 페이지 컴포넌트
// ----------------------------------------------------------------------

export const BookmarkPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth(); 
  const queryClient = useQueryClient();
  
  const [selectedCategory, setSelectedCategory] = useState(0); 
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null); 

  // --- 데이터 조회 ---
  const { 
    data: categoriesData, 
    isLoading: categoriesLoading, 
    isError: categoriesError,
    error: categoriesErrorObject
  } = useCategories({
    page: 1,
    page_size: 99, 
    search: undefined, 
  });

  useEffect(() => {
    if (categoriesData) {
      console.log('✅ Categories Data Loaded:', categoriesData);
    }
  }, [categoriesData]);

  const { 
    data: bookmarksData, 
    isLoading: bookmarksLoading, 
    isError: bookmarksError,
    error: bookmarksErrorObject
  } = useSavedMessages(selectedCategory);
  
  const bookmarks = bookmarksData || [];
  const { createMutation, deleteMutation: deleteBookmarkMutation } = useCategoryMutations();

  // --- 핸들러 함수 ---
  const handleRefreshCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

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

  // 👇 [핵심 수정] 에러 처리 로직 강화
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
      // alert('새 카테고리가 추가되었습니다.'); 
    } catch (err) {
      // 콘솔에 에러 전체 출력 (디버깅용)
      console.error('카테고리 생성 에러:', err);

      const error = err as any; // any로 변환하여 유연하게 속성 접근
      
      // 1. axios 표준: error.response.status
      // 2. 일부 커스텀 클라이언트: error.status
      const status = error.response?.status || error.status;

      if (status === 400 || status === 409) {
        setModalError('이미 존재하는 카테고리 이름입니다.');
      } else if (status === 403) {
        setModalError('관리자 권한이 필요합니다.');
      } else {
        // status 코드가 무엇인지 보이도록 수정
        setModalError(`생성에 실패했습니다. (오류 코드: ${status || 'Unknown'})`);
      }
    }
  };

  // --- 렌더링 준비 ---
  const isAxiosError = (err: unknown): err is AxiosError => {
    return (err as AxiosError)?.isAxiosError === true;
  };
  
  if (categoriesLoading || bookmarksLoading) {
    return (
      <Container style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner />
      </Container>
    );
  }

  if (categoriesError || bookmarksError) {
    return (
        <Container style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 50 }}>
            <div style={{ color: 'red', marginBottom: 20 }}>데이터 로딩 중 오류가 발생했습니다.</div>
            <BackButton onClick={() => window.location.reload()}>새로고침</BackButton>
        </Container>
    );
  }

  // 데이터 구조 유연하게 처리
  let apiItems: any[] = []; 
  if (categoriesData) {
    if (Array.isArray(categoriesData.categories)) {
        apiItems = categoriesData.categories;
    } else if (Array.isArray(categoriesData.items)) {
        apiItems = categoriesData.items;
    } else if (Array.isArray(categoriesData)) {
        apiItems = categoriesData;
    }
  }

  const categories: Category[] = [
    { 
      id: 0, 
      title: '전체', 
      color: '#667eea', 
      item_count: bookmarks.length, 
      created_at: '' 
    },
    ...apiItems.map(cat => ({
        ...cat,
        id: cat.id ?? cat.category_id ?? Math.floor(Math.random() * 100000), 
        title: cat.title || '이름 없음',
        color: cat.color || '#9b59b6', 
        item_count: cat.item_count || 0 
    }))
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
          <Sidebar>
            <SidebarHeader>
                <SidebarTitle style={{ marginBottom: 0 }}>카테고리</SidebarTitle>
                <RefreshButton onClick={handleRefreshCategories} title="목록 새로고침">
                    <FaSyncAlt />
                </RefreshButton>
            </SidebarHeader>

            {categories.map(cat => (
              <CategoryItem
                key={cat.id}
                $active={selectedCategory === cat.id}
                $color={cat.color || '#999'}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <FaFolder /> {cat.title}
                {cat.id === 0 
                 ? ` (${bookmarksData ? bookmarksData.length : 0})` 
                 : ` (${cat.item_count})`
                }
              </CategoryItem>
            ))}
            
            {isAdmin && (
              <AddCategoryButton onClick={() => setShowNewCategoryModal(true)}>
                <FaPlus /> 새 카테고리
              </AddCategoryButton>
            )}
          </Sidebar>

          <BookmarkList 
            bookmarks={bookmarks} 
            categories={categories} 
            onDelete={handleDeleteBookmark}
            isDeleting={deleteBookmarkMutation.isPending}
            deletingId={deleteBookmarkMutation.variables as number}
          />
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
              autoFocus
            />
            
            {modalError && <p style={{ color: 'red', fontSize: '14px', marginBottom: '15px' }}>{modalError}</p>}
            
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

// --- Styled Components (기존 유지) ---
const Container = styled.div` min-height: 100vh; background: #f5f5f5; `;
const Content = styled.div` max-width: 1400px; margin: 0 auto; padding: 20px; `;
const Header = styled.div` display: flex; align-items: center; gap: 20px; margin-bottom: 30px; `;
const BackButton = styled.button` display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: white; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-size: 14px; color: #555; transition: all 0.2s; &:hover { background: #f8f8f8; border-color: #bbb; } `;
const Title = styled.h1` display: flex; align-items: center; gap: 12px; font-size: 28px; color: #333; `;
const MainContent = styled.div` display: grid; grid-template-columns: 250px 1fr; gap: 20px; `;
const Sidebar = styled.div` background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); height: fit-content; `;
const SidebarHeader = styled.div` display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0; `;
const SidebarTitle = styled.h3` font-size: 16px; color: #333; margin: 0; `;
const RefreshButton = styled.button` background: transparent; border: none; color: #999; cursor: pointer; padding: 5px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s; &:hover { background-color: #f0f0f0; color: #667eea; } `;
const CategoryItem = styled.button<{ $active: boolean; $color: string }>` display: flex; align-items: center; gap: 10px; width: 100%; padding: 12px; background: ${props => props.$active ? `${props.$color}15` : 'transparent'}; border: none; border-left: 3px solid ${props => props.$active ? props.$color : 'transparent'}; color: ${props => props.$active ? props.$color : '#666'}; font-size: 14px; font-weight: ${props => props.$active ? '600' : '400'}; cursor: pointer; transition: all 0.2s; text-align: left; &:hover { background: ${props => `${props.$color}10`}; } `;
const AddCategoryButton = styled.button` display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px; background: transparent; border: 2px dashed #ddd; border-radius: 8px; color: #999; font-size: 14px; cursor: pointer; margin-top: 15px; transition: all 0.2s; &:hover { border-color: #667eea; color: #667eea; } `;
const ListWrapper = styled.div` display: flex; flex-direction: column; gap: 15px; `;
const BookmarkCard = styled.div` background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05); transition: all 0.2s; &:hover { box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1); transform: translateY(-2px); } `;
const CardHeader = styled.div` display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; `;
const ChatInfo = styled.div` flex: 1; `;
const ChatTitle = styled.h3` font-size: 14px; color: #667eea; margin-bottom: 4px; `;
const DateText = styled.span` font-size: 12px; color: #999; `;
const DeleteButton = styled.button` padding: 8px; background: transparent; border: none; color: #e74c3c; cursor: pointer; border-radius: 6px; transition: all 0.2s; &:hover { background: #ffe5e5; } `;
const MessageContent = styled.p` font-size: 14px; line-height: 1.6; color: #333; margin-bottom: 12px; `;
const CategoryBadge = styled.span<{ color: string }>` display: inline-block; padding: 4px 12px; background: ${props => `${props.color}15`}; color: ${props => props.color}; border-radius: 12px; font-size: 12px; font-weight: 500; `;
const EmptyState = styled.div` display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 20px; background: white; border-radius: 12px; `;
const EmptyText = styled.p` margin-top: 16px; font-size: 16px; color: #999; `;
const Modal = styled.div` position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; `;
const ModalContent = styled.div` background: white; padding: 30px; border-radius: 12px; width: 400px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2); `;
const ModalTitle = styled.h2` font-size: 20px; color: #333; margin-bottom: 20px; `;
const ModalInput = styled.input` width: 100%; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; margin-bottom: 20px; &:focus { outline: none; border-color: #667eea; } `;
const ModalButtons = styled.div` display: flex; gap: 10px; justify-content: flex-end; `;
const ModalButton = styled.button<{ $primary?: boolean }>` padding: 10px 20px; background: ${props => props.$primary ? '#667eea' : '#e0e0e0'}; color: ${props => props.$primary ? 'white' : '#666'}; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; &:hover { background: ${props => props.$primary ? '#5568d3' : '#d0d0d0'}; } `;

export default BookmarkPage;