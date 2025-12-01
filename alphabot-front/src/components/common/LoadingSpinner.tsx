// src/components/common/LoadingSpinner.tsx
import React, { type CSSProperties } from 'react';

// 스피너 애니메이션 정의 (CSS Keyframes)
// 이 <style> 태그는 컴포넌트가 렌더링될 때 <head>에 주입됩니다.
const keyframes = `
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// 인라인 스타일 객체
const spinnerStyle: CSSProperties = {
  border: '4px solid rgba(0, 0, 0, 0.1)',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  borderLeftColor: '#09f', // 로딩 색상
  animation: 'spin 1s ease infinite',
  margin: '20px auto', // 중앙 정렬 (필요시 조절)
};

export const LoadingSpinner: React.FC = () => {
  return (
    <>
      <style>{keyframes}</style>
      <div style={spinnerStyle}></div>
    </>
  );
};