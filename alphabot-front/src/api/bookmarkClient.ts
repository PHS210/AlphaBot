import { apiFetch } from '@/api/client';
import type { SavedMessage } from '@/components/bookmark/bookmark.types';

const API_BASE_URL = '/api/bookmarks';

type BookmarkListResponse = {
  bookmarks: Array<{
    bookmark_id: number;
    messages_id: number;
    category_id: number | null;
    created_at: string;
    message?: {
      content: string;
      created_at: string;
    };
  }>;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};

const normalizeBookmark = (bookmark: BookmarkListResponse['bookmarks'][number]): SavedMessage => ({
  id: bookmark.bookmark_id,
  content: bookmark.message?.content ?? '',
  chatTitle: `메시지 #${bookmark.messages_id}`,
  createdAt: bookmark.message?.created_at ?? bookmark.created_at,
  categoryId: bookmark.category_id ?? 0,
});

export const listSavedMessages = async (categoryId: number): Promise<SavedMessage[]> => {
  const query =
    categoryId !== 0 ? `?categoryId=${encodeURIComponent(String(categoryId))}` : '';
  const response = await apiFetch<BookmarkListResponse>(`${API_BASE_URL}${query}`, {
    method: 'GET',
  });
  return response.bookmarks.map(normalizeBookmark);
};

export const deleteSavedMessage = async (id: number): Promise<void> => {
  await apiFetch<void>(`${API_BASE_URL}/${id}`, { method: 'DELETE' });
};

export const createBookmark = async (messageId: number, categoryId?: number): Promise<SavedMessage> => {
  const response = await apiFetch<BookmarkListResponse['bookmarks'][number]>(API_BASE_URL, {
    method: 'POST',
    body: JSON.stringify({ messages_id: messageId, category_id: categoryId }),
  });
  return normalizeBookmark(response);
};

export const updateBookmark = async (bookmarkId: number, categoryId: number | null): Promise<SavedMessage> => {
  const response = await apiFetch<BookmarkListResponse['bookmarks'][number]>(`${API_BASE_URL}/${bookmarkId}`, {
    method: 'PUT',
    body: JSON.stringify({ category_id: categoryId }),
  });
  return normalizeBookmark(response);
};