import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { AxiosError } from 'axios';
import { useCategoryMutations } from '@/hooks/useCategoryMutations';
import Button from '@/components/Button/Button';
import type { Category, CategoryCreateUpdateDTO } from '@/components/category/category.types';

// --- Styled Components (모달 UI) ---
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const FormContainer = styled.form`
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
`;

const ModalTitle = styled.h2`
  font-size: 20px;
  color: #333;
  margin: 0 0 20px 0;
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 14px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  box-sizing: border-box;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #667eea;
  }
`;

const ErrorText = styled.p`
  color: #e53e3e;
  font-size: 13px;
  margin-top: 8px;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
`;

// --- Component ---

interface Props {
  categoryToEdit: Category | null; // null이면 생성 모드, 값이 있으면 수정 모드
  onClose: () => void;
}

export const CategoryForm: React.FC<Props> = ({ categoryToEdit, onClose }) => {
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  // API 훅 사용
  const { createMutation, updateMutation } = useCategoryMutations();
  
  const isEditing = !!categoryToEdit;
  const mutation = isEditing ? updateMutation : createMutation;

  // 수정 모드일 경우 기존 제목 채워넣기
  useEffect(() => {
    if (isEditing && categoryToEdit) {
      setTitle(categoryToEdit.title);
    } else {
      setTitle('');
    }
    setError(null);
  }, [categoryToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('카테고리 이름을 입력해주세요.');
      return;
    }
    setError(null);

    const data: CategoryCreateUpdateDTO = { title };

    try {
      if (isEditing && categoryToEdit) {
        // 수정 (id 사용)
        await updateMutation.mutateAsync({ id: categoryToEdit.id, data });
        alert('수정되었습니다.');
      } else {
        // 생성
        await createMutation.mutateAsync(data);
        alert('새 카테고리가 추가되었습니다.');
      }
      onClose(); // 성공 시 모달 닫기
    } catch (err) {
      const axiosError = err as AxiosError;
      const status = axiosError.response?.status;

      if (status === 409 || status === 400) {
        setError('이미 존재하는 카테고리 이름입니다.');
      } else if (status === 403) {
        setError('권한이 없습니다.');
      } else {
        setError('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <FormContainer onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <ModalTitle>{isEditing ? '카테고리 수정' : '새 카테고리 추가'}</ModalTitle>
        
        <StyledInput
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="카테고리 이름을 입력하세요"
          autoFocus
        />
        
        {error && <ErrorText>{error}</ErrorText>}

        <ButtonContainer>
          <Button
            type="button"
            variant="ghost" 
            size="medium"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </ButtonContainer>
      </FormContainer>
    </ModalOverlay>
  );
};

export default CategoryForm;