import { apiFetch } from '@/api/client';

// 사용자 정보 타입
export interface User {
  user_id: number;
  login_id: string;
  username: string;
}

// 프로필 수정 요청 데이터 타입
export interface UserUpdatePayload {
  username: string;
}

// 비밀번호 변경 요청 데이터 타입
export interface PasswordChangePayload {
  current_password: string;
  new_password: string;
  new_password_confirm: string;
}

// 1. 내 정보 가져오기
export const getMe = async (): Promise<User> => {
  return apiFetch<User>('/api/users/me', { method: 'GET' });
};

// 2. 프로필 수정하기
export const updateProfile = async (payload: UserUpdatePayload): Promise<User> => {
  return apiFetch<User>('/api/users/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
};

// 3. 비밀번호 변경하기
export const changePassword = async (
  payload: PasswordChangePayload,
): Promise<{ message: string }> => {
  return apiFetch<{ message: string }>('/api/users/me/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};