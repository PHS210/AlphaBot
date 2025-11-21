import { apiFetch } from '@/api/client';
import type {
  Category,
  CategoryList,
  CategoryCreateUpdateDTO,
  CategoryQuery,
} from '@/components/category/category.types';

const API_BASE_URL = '/api/categories';

// 1. 목록/검색/페이지네이션 (GET)
export const listCategories = async (query: CategoryQuery): Promise<CategoryList> => {
  const params = new URLSearchParams({
    page: String(query.page),
    page_size: String(query.page_size),
    search: query.search || '',
  });

  return apiFetch<CategoryList>(`${API_BASE_URL}?${params.toString()}`, { method: 'GET' });
};

// 2. 단일 조회 (GET BY ID)
export const getCategory = async (id: number): Promise<Category> => {
  return apiFetch<Category>(`${API_BASE_URL}/${id}`, { method: 'GET' });
};

// 3. 생성 (POST)
export const createCategory = async (data: CategoryCreateUpdateDTO): Promise<Category> => {
  return apiFetch<Category>(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

// 4. 수정 (PUT)
export const updateCategory = async (
  id: number,
  data: CategoryCreateUpdateDTO,
): Promise<Category> => {
  return apiFetch<Category>(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

// 5. 삭제 (DELETE)
export const deleteCategory = async (id: number): Promise<void> => {
  await apiFetch<void>(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
};