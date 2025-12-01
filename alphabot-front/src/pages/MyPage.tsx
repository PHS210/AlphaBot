import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FaUser, FaLock, FaArrowLeft } from 'react-icons/fa';
import { AxiosError } from 'axios';

// API 함수들 import
import { getMe, updateProfile, changePassword } from '@/api/userClient';

const MyPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  
  // --- 사용자 정보 상태 ---
  const [userInfo, setUserInfo] = useState({
    loginId: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- 프로필 수정 상태 ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');

  // --- 비밀번호 변경 상태 ---
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirm: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{[key: string]: string}>({});

  // 1. 페이지 로드 시 내 정보 가져오기
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getMe();
        setUserInfo({
          loginId: data.login_id,
          username: data.username
        });
        setEditedName(data.username); // 수정 모드용 초기값 설정
      } catch (error) {
        console.error('Failed to fetch user info', error);
        alert('로그인 정보가 만료되었거나 불러올 수 없습니다.');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [navigate]);

  // 2. 프로필 수정 핸들러
  const handleProfileEdit = () => {
    setEditedName(userInfo.username); // 현재 이름으로 리셋
    setIsEditMode(true);
  };

  const handleProfileSave = async () => {
    if (!editedName.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }
    
    try {
      const updatedUser = await updateProfile({ username: editedName });
      setUserInfo({ ...userInfo, username: updatedUser.username }); // 화면 업데이트
      setIsEditMode(false);
      alert('프로필 정보가 성공적으로 변경되었습니다.');
    } catch (error) {
      console.error(error);
      alert('프로필 수정에 실패했습니다.');
    }
  };

  const handleProfileCancel = () => {
    setEditedName(userInfo.username);
    setIsEditMode(false);
  };

  // 3. 비밀번호 입력 핸들러
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // 에러 메시지 초기화
    if (passwordErrors[name]) {
      setPasswordErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // 4. 비밀번호 변경 요청 핸들러
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {[key: string]: string} = {};

    // 클라이언트 측 유효성 검사
    if (!passwordData.currentPassword) {
      errors.currentPassword = '현재 비밀번호를 입력하세요.';
    }
    if (!passwordData.newPassword) {
      errors.newPassword = '새 비밀번호를 입력하세요.';
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = '비밀번호는 8자 이상이어야 합니다.';
    }
    if (passwordData.newPassword !== passwordData.newPasswordConfirm) {
      errors.newPasswordConfirm = '새 비밀번호가 일치하지 않습니다.';
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      await changePassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        new_password_confirm: passwordData.newPasswordConfirm
      });

      alert('비밀번호가 성공적으로 변경되었습니다.');
      // 폼 초기화
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        newPasswordConfirm: ''
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data?.detail) {
        // 백엔드에서 보낸 에러 메시지 표시 (예: 현재 비밀번호 불일치)
        const detail = error.response.data.detail;
        if (detail.includes('비밀번호')) {
           // 상황에 따라 적절한 필드에 에러 표시, 여기선 현재 비밀번호 에러로 간주
           setPasswordErrors({ currentPassword: detail });
        } else {
           alert(detail);
        }
      } else {
        alert('비밀번호 변경 중 오류가 발생했습니다.');
      }
    }
  };

  if (isLoading) {
    return <div style={{ padding: '20px', color: 'white' }}>로딩 중...</div>;
  }

  return (
    <Container>
      <Content>
        <Header>
          <BackButton onClick={() => navigate('/chat')}>
            <FaArrowLeft /> 뒤로가기
          </BackButton>
          <Title>마이페이지</Title>
        </Header>

        <TabContainer>
          <Tab $active={activeTab === 'profile'} onClick={() => setActiveTab('profile')}>
            <FaUser /> 프로필 수정
          </Tab>
          <Tab $active={activeTab === 'password'} onClick={() => setActiveTab('password')}>
            <FaLock /> 비밀번호 변경
          </Tab>
        </TabContainer>

        {activeTab === 'profile' && (
          <Section>
            <SectionTitle>프로필 정보</SectionTitle>
            <InfoGroup>
              <Label>아이디</Label>
              <ReadOnlyInput value={userInfo.loginId} readOnly />
              <HelperText>아이디는 변경할 수 없습니다.</HelperText>
            </InfoGroup>
            
            <InfoGroup>
              <Label>이름</Label>
              {isEditMode ? (
                <Input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              ) : (
                <ReadOnlyInput value={userInfo.username} readOnly />
              )}
            </InfoGroup>

            <ButtonGroup>
              {isEditMode ? (
                <>
                  <SaveButton onClick={handleProfileSave}>저장</SaveButton>
                  <CancelButton onClick={handleProfileCancel}>취소</CancelButton>
                </>
              ) : (
                <EditButton onClick={handleProfileEdit}>수정하기</EditButton>
              )}
            </ButtonGroup>
          </Section>
        )}

        {activeTab === 'password' && (
          <Section>
            <SectionTitle>비밀번호 변경</SectionTitle>
            <Form onSubmit={handlePasswordSubmit}>
              <InfoGroup>
                <Label>현재 비밀번호 *</Label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  placeholder="현재 비밀번호를 입력하세요"
                  error={!!passwordErrors.currentPassword}
                />
                {passwordErrors.currentPassword && (
                  <ErrorText>{passwordErrors.currentPassword}</ErrorText>
                )}
              </InfoGroup>

              <InfoGroup>
                <Label>새 비밀번호 *</Label>
                <Input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="새 비밀번호를 입력하세요"
                  error={!!passwordErrors.newPassword}
                />
                {passwordErrors.newPassword && (
                  <ErrorText>{passwordErrors.newPassword}</ErrorText>
                )}
              </InfoGroup>

              <InfoGroup>
                <Label>새 비밀번호 확인 *</Label>
                <Input
                  type="password"
                  name="newPasswordConfirm"
                  value={passwordData.newPasswordConfirm}
                  onChange={handlePasswordChange}
                  placeholder="새 비밀번호를 다시 입력하세요"
                  error={!!passwordErrors.newPasswordConfirm}
                />
                {passwordErrors.newPasswordConfirm && (
                  <ErrorText>{passwordErrors.newPasswordConfirm}</ErrorText>
                )}
              </InfoGroup>

              <SubmitButton type="submit">변경하기</SubmitButton>
            </Form>
          </Section>
        )}
      </Content>
    </Container>
  );
};

// --- Styled Components (기존과 동일, 그대로 두세요) ---
const Container = styled.div`
  min-height: 100vh;
  background: #f5f5f5;
  padding: 20px;
`;

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #555;
  transition: all 0.2s;

  &:hover {
    background: #f8f8f8;
    border-color: #bbb;
  }
`;

const Title = styled.h1`
  font-size: 28px;
  color: #333;
`;

const TabContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  border-bottom: 2px solid #e0e0e0;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: ${props => props.$active ? 'white' : 'transparent'};
  border: none;
  border-bottom: 3px solid ${props => props.$active ? '#667eea' : 'transparent'};
  color: ${props => props.$active ? '#667eea' : '#999'};
  font-size: 16px;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    color: #667eea;
  }
`;

const Section = styled.div`
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const SectionTitle = styled.h2`
  font-size: 20px;
  color: #333;
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InfoGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 14px;
  font-weight: 500;
  color: #555;
`;

const Input = styled.input<{ error?: boolean }>`
  padding: 12px 16px;
  border: 2px solid ${props => props.error ? '#e74c3c' : '#e0e0e0'};
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: ${props => props.error ? '#e74c3c' : '#667eea'};
  }
`;

const ReadOnlyInput = styled.input`
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: #f9f9f9;
  color: #999;
`;

const HelperText = styled.span`
  font-size: 12px;
  color: #999;
  margin-top: -4px;
`;

const ErrorText = styled.span`
  font-size: 12px;
  color: #e74c3c;
  margin-top: -4px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const EditButton = styled.button`
  padding: 12px 24px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #5568d3;
    transform: translateY(-2px);
  }
`;

const SaveButton = styled.button`
  padding: 12px 24px;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #229954;
    transform: translateY(-2px);
  }
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #7f8c8d;
    transform: translateY(-2px);
  }
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
  transition: all 0.2s;
  margin-top: 10px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
  }
`;

export default MyPage;