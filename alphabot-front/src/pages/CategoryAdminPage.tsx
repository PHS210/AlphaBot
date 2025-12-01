/**
 * @file src/features/category/CategoryAdminPage.tsx
 * @description 카테고리 관리 페이지 (CRUD, 검색, 페이지네이션)
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCategories } from '@/hooks/useCategories';
import { CategoryList } from '@/components/category/CategoryList';
import { CategoryForm } from '@/components/category/CategoryForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import type { Category, CategoryQuery } from '@/components/category/category.types';
import type { AxiosError } from 'axios';
import Button from '@/components/Button/Button'; //  2. 공통 버튼 가져오기

// --- Styled Components ---

// 페이지 전체 배경 (이미지 참고)
const PageWrapper = styled.div`
  background-color: #f8f9fa;
  min-height: 100vh;
  padding: 32px;
`;

/**
 * 3. 뒤로가기 버튼과 컨텐츠 영역의 가로폭을 맞추기 위한 래퍼
 */
const PageLayoutLimiter = styled.div`
  max-width: 900px;
  margin: 0 auto;
`;

/**
 * 4.  뒤로가기 버튼을 담는 컨테이너
 */
const HeaderContainer = styled.div`
  margin-bottom: 16px; // 버튼과 흰색 박스 사이 간격
  display: flex;
`;

// 메인 컨텐츠 영역 (흰색 박스)
const ContentContainer = styled.div`
  /* max-width, margin: 0 auto는 PageLayoutLimiter로 이동 */
  background-color: white;
  border-radius: 8px;
  border: 1px solid #eee;
  padding: 24px;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin: 0;
  color: #333; /* 글자색 진하게 */
`;

// --- Component ---

export const CategoryAdminPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [query, setQuery] = useState<CategoryQuery>({ page: 1, page_size: 10, search: '' });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showForm, setShowForm] = useState(false);

  const isAuthenticated =
    typeof window !== 'undefined' && Boolean(localStorage.getItem('authToken'));

  const { data, isLoading, isError, error } = useCategories(query, {
    enabled: isAuthenticated,
  });

  // (이하 핸들러 함수들은 이전과 동일)
  const handleSearch = (term: string) => {
    setQuery({ ...query, search: term, page: 1 });
  };
  const handlePageChange = (newPage: number) => {
    setQuery({ ...query, page: newPage });
  };
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };
  const handleCreateNew = () => {
    setEditingCategory(null);
    setShowForm(true);
  };
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
  };
  const isAxiosError = (e: any): e is AxiosError => {
    return e && typeof e === 'object' && e.isAxiosError === true;
  };
  if (!isAuthenticated) {
    return (
      <PageWrapper>
        <PageLayoutLimiter>
          <HeaderContainer>
            <Button
              as={Link}
              to="/chat"
              variant="ghost"
              size="small"
            >
              <span>←</span>
              <span>뒤로가기</span>
            </Button>
          </HeaderContainer>

          <ContentContainer>
            <PageHeader>
              <PageTitle>카테고리 관리</PageTitle>
            </PageHeader>
            <p style={{ color: '#555', marginBottom: '24px' }}>
              카테고리 목록을 보려면 먼저 로그인하세요.
            </p>
            <Button as={Link} to="/login" variant="primary" size="small">
              로그인 페이지로 이동
            </Button>
          </ContentContainer>
        </PageLayoutLimiter>
      </PageWrapper>
    );
  }

  if (isLoading && !data) return <LoadingSpinner />;
  if (isError && isAxiosError(error)) {
    const statusCode = error.response?.status;
    if (statusCode === 404) {
      return <div>데이터를 찾을 수 없습니다. 목록을 갱신해 주세요.</div>;
    }
    return <div>오류가 발생했습니다: [Status: {statusCode}] {error.message}</div>;
  }
  
  return (
    <PageWrapper>
      <PageLayoutLimiter> 
        
        {/* 5.  뒤로가기 버튼 (as={Link} 사용) */}
        <HeaderContainer>
          <Button
            as={Link}       //  <Button>을 <Link> 컴포넌트처럼 작동시킴
            to="/chat"           //  홈(WelcomePage)으로 이동
            variant="ghost"  //  ButtonStyle.ts에 정의된 스타일
            size="small"
          >
            <span>←</span> {/*  아이콘 (실제 아이콘 라이브러리 사용 권장) */}
            <span>뒤로가기</span>
          </Button>
        </HeaderContainer>

        <ContentContainer>
          <PageHeader>
            <PageTitle>카테고리 관리</PageTitle>
            {isAdmin && (
              <Button 
                variant="primary"
                size="small"
                onClick={handleCreateNew} 
              >
                + 새 카테고리 생성
              </Button>
            )}
          </PageHeader>
        
          {!isAdmin && (
            <p style={{ color: 'gray', fontStyle: 'italic' }}>
              알림: 카테고리 관리는 관리자만 가능합니다. (403 UI 처리)
            </p>
          )}

          {showForm && isAdmin && (
            <CategoryForm categoryToEdit={editingCategory} onClose={handleCloseForm} />
          )}

          <CategoryList
            categories={data?.categories ?? []}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onSearch={handleSearch}
            onPageChange={handlePageChange}
            page={data?.page ?? query.page}
            total={data?.total ?? 0}
            pageSize={data?.page_size ?? query.page_size}
          />
        </ContentContainer>
      </PageLayoutLimiter>
    </PageWrapper>
  );
};