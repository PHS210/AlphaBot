import React from 'react';
import styles from './LoginScreen.module.css'; // CSS 모듈 파일을 불러옵니다.

const LoginScreen: React.FC = () => {
  return (
    // 최상위 div에 container 스타일을 적용합니다.
    <div className={styles.container}>
      
      {/* 알파 로고 */}
      <div className={styles.logo}>
        α
      </div>
      
      {/* 버튼들을 담는 컨테이너 */}
      <div className={styles.buttonContainer}>
        <button className={styles.button}>로그인</button>
        <button className={styles.button}>회원가입</button>
      </div>

    </div>
  );
};

export default LoginScreen;