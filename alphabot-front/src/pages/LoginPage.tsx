import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
    const [login_id, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        const formData = new URLSearchParams();
        formData.append('username', login_id);
        formData.append('password', password);

        try {
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '로그인에 실패했습니다.');
            }

            const data = await response.json();
            
            console.log('로그인 성공! 받은 토큰:', data.access_token);
            
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('access_token', data.access_token);
            
            navigate('/chat');

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('알 수 없는 오류가 발생했습니다.');
            }
        }
    };

    // --- 스타일 객체들 ---
    const pageStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'center', // 가로 중앙 정렬
        alignItems: 'center',     // 세로 중앙 정렬
        height: '100vh',          // 화면 전체 높이 사용
        backgroundColor: '#1a1a1a', // 어두운 배경색
        color: 'white',           // 기본 글자색
    };

    const formStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column', // 아이템들을 세로로 나열
        gap: '20px',             // 아이템들 사이의 간격
        padding: '40px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        width: '350px',
    };
    
    const inputGroupStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    };

    const inputStyle: React.CSSProperties = {
        padding: '10px',
        borderRadius: '4px',
        border: '1px solid #555',
        backgroundColor: '#333',
        color: 'white',
        fontSize: '16px',
    };

    const buttonStyle: React.CSSProperties = {
        padding: '12px',
        borderRadius: '4px',
        border: 'none',
        backgroundColor: '#5e5ce6',
        color: 'white',
        fontSize: '16px',
        cursor: 'pointer',
        marginTop: '10px',
    };

    const errorStyle: React.CSSProperties = {
        color: '#ff4d4d',
        textAlign: 'center',
    };
    
    // --- JSX 렌더링 부분 ---
    return (
        <div style={pageStyle}>
            <form onSubmit={handleSubmit} style={formStyle}>
                <h2 style={{ textAlign: 'center', margin: 0 }}>로그인</h2>
                <div style={inputGroupStyle}>
                    <label>아이디:</label>
                    <input
                        type="text"
                        value={login_id}
                        onChange={(e) => setLoginId(e.target.value)}
                        required
                        style={inputStyle}
                    />
                </div>
                <div style={inputGroupStyle}>
                    <label>비밀번호:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={inputStyle}
                    />
                </div>
                {error && <p style={errorStyle}>{error}</p>}
                <button type="submit" style={buttonStyle}>로그인</button>
            </form>
        </div>
    );
};

export default LoginPage;