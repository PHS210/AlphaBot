/**
 * @file src/components/Button/Button.tsx
 * @description ButtonStyle.ts에서 정의한 스타일을 적용하는 공통 버튼 컴포넌트입니다.
 */

import React from 'react';
import { StyledButton } from './ButtonStyle'; // 👈 ButtonStyle.ts 임포트

/**
 * @interface ButtonProps
 * @description 공통 버튼 컴포넌트가 받을 props 타입 정의
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'ghost';
  size: 'small' | 'medium' | 'large';
  children: React.ReactNode;
  as?: React.ElementType; 
  to?: string;
}

/**
 * @component Button
 */
const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', // 기본값
  size = 'medium',   // 기본값
  as,
  ...rest // 👈 onClick, type, disabled, 'to' 등 나머지 모든 HTML 속성
}) => {
  return (
    <StyledButton 
      // 👇 [수정] Transient Props($)로 전달
      $variant={variant} 
      $size={size} 
      as={as} 
      {...rest} 
    >
      {children}
    </StyledButton>
  );
};

export default Button;