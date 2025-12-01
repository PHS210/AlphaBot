// Category 타입은 API 응답 규격에 맞게 수정이 필요할 수 있습니다.
interface CategoryReference {
  id: number;
  title: string;
}

/**
 * 저장된 메시지 (북마크) 타입
 * (API 응답 규격에 맞게 수정하세요)
 */
export interface SavedMessage {
  id: number;
  content: string;
  chatTitle: string;  // (API에 이 필드가 없다면 다른 필드로 대체)
  createdAt: string;
  categoryId: number;
  category?: CategoryReference; // (API가 카테고리 정보를 포함하는 경우)
}