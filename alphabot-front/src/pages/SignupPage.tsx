import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { AxiosError } from 'axios';
import { signup as signupRequest } from '@/api/authClient';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    loginId: '',
    username: '',
    password: '',
    passwordConfirm: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // 입력 시 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (submitError) {
      setSubmitError(null);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!formData.loginId.trim()) {
      newErrors.loginId = '아이디는 필수 입력 항목입니다.';
    }
    if (!formData.username.trim()) {
      newErrors.username = '이름은 필수 입력 항목입니다.';
    }
    if (!formData.password) {
      newErrors.password = '비밀번호는 필수 입력 항목입니다.';
    }
    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인은 필수 입력 항목입니다.';
    }
    if (formData.password && formData.passwordConfirm && formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.';
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signupRequest({
        login_id: formData.loginId,
        username: formData.username,
        password: formData.password,
      });

      alert('회원가입이 완료되었습니다.');
      navigate('/login');
    } catch (error) {
      let message = '회원가입 중 오류가 발생했습니다.';
      if (error instanceof AxiosError) {
        const data = error.response?.data;
        
        // FastAPI validation error (422)
        if (error.response?.status === 422 && data?.detail) {
          if (Array.isArray(data.detail)) {
            // Pydantic validation errors
            const errors = data.detail.map((err: any) => 
              `${err.loc?.join(' > ') || 'Field'}: ${err.msg}`
            ).join(', ');
            message = `입력 오류: ${errors}`;
          } else if (typeof data.detail === 'string') {
            message = data.detail;
          }
        }
        // Bad request (400)
        else if (error.response?.status === 400) {
          if (typeof data === 'string') {
            message = data;
          } else if (typeof data?.detail === 'string') {
            message = data.detail;
          }
          
          if (message.includes('아이디')) {
            setErrors(prev => ({
              ...prev,
              loginId: message,
            }));
            setIsSubmitting(false);
            return;
          }
        }
        // Other errors
        else if (typeof data === 'string') {
          message = data;
        } else if (typeof data?.detail === 'string') {
          message = data.detail;
        }
      }
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Container>
      <SignupBox>
        <Title>회원가입</Title>
        <Form onSubmit={handleSubmit}>
          <InputGroup>
            <Label>아이디 *</Label>
            <Input
              type="text"
              name="loginId"
              value={formData.loginId}
              onChange={handleChange}
              placeholder="아이디를 입력하세요"
              $error={!!errors.loginId}
            />
            {errors.loginId && <ErrorText>{errors.loginId}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>이름 *</Label>
            <Input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="이름을 입력하세요"
              $error={!!errors.username}
            />
            {errors.username && <ErrorText>{errors.username}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>비밀번호 *</Label>
            <Input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="비밀번호를 입력하세요"
              $error={!!errors.password}
            />
            {errors.password && <ErrorText>{errors.password}</ErrorText>}
          </InputGroup>

          <InputGroup>
            <Label>비밀번호 확인 *</Label>
            <Input
              type="password"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              placeholder="비밀번호를 다시 입력하세요"
              $error={!!errors.passwordConfirm}
            />
            {errors.passwordConfirm && <ErrorText>{errors.passwordConfirm}</ErrorText>}
          </InputGroup>

          {submitError && <GlobalError>{submitError}</GlobalError>}
          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '가입하기'}
          </SubmitButton>
        </Form>
        
        <Footer>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </Footer>
      </SignupBox>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const SignupBox = styled.div`
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 450px;
`;

const Title = styled.h1`
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  font-size: 28px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #555;
`;

const Input = styled.input<{ $error?: boolean }>`
  padding: 12px 16px;
  border: 2px solid ${props => props.$error ? '#e74c3c' : '#e0e0e0'};
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: ${props => props.$error ? '#e74c3c' : '#667eea'};
  }

  &::placeholder {
    color: #aaa;
  }
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #e74c3c;
  margin-top: -4px;
`;

const SubmitButton = styled.button`
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 10px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const Footer = styled.div`
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #666;

  a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const GlobalError = styled.div`
  text-align: center;
  color: #e74c3c;
  font-size: 14px;
`;

export default SignupPage;

