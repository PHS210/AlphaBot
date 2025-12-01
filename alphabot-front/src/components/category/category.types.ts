/**
 * (GET) /api/categories/{id} 응답
 * (POST, PUT) /api/categories 응답
 */
export interface Category {
  id: number;
  title: string;
  item_count: number;
  created_at: string;
  color?: string; 
  // 백엔드에서 category_id로 줄 수도 있으므로 선택적 속성 추가
  category_id?: number;
}

/**
 * (GET) /api/categories 응답 (목록 조회)
 * [수정] 백엔드 응답인 'categories' 키를 추가했습니다.
 */
export interface CategoryList {
  categories: Category[]; // 👈 [핵심 수정] 실제 API 응답 키
  items?: Category[];     // (호환성을 위해 남겨둠)
  total: number;
  page: number;
  page_size: number;
}

export interface CategoryCreateUpdateDTO {
  title: string;
}

export interface CategoryQuery {
  page: number;
  page_size: number;
  search?: string;
}