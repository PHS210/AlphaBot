// src/hooks/useAuth.ts
import { useState, useMemo } from 'react';

// 실제 앱에서는 Context, Zustand, Recoil 등에서 
// 로그인 상태를 가져와야 합니다.
// 여기서는 테스트를 위한 간단한 가상 훅을 만듭니다.

type UserRole = 'admin' | 'user';

export const useAuth = () => {
  // 'admin' 또는 'user'로 바꿔가며 테스트하세요.
  const [role] = useState<UserRole>('admin'); 

  const user = useMemo(() => ({
    id: 1,
    username: role === 'admin' ? '관리자' : '일반사용자',
    role: role,
  }), [role]);

  const isAdmin = useMemo(() => user.role === 'admin', [user]);

  return {
    user,
    isAdmin,
    isLoading: false, // 실제로는 로그인 상태 로딩
  };
};