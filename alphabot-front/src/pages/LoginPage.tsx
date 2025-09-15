import React from 'react';

const LoginPage: React.FC = () => {
  return (
    <div>
      <form>
        <div>
          <label htmlFor="id">id: </label>
          <input type="text" id="id" />
        </div>
        <div>
          <label htmlFor="pw">pw: </label>
          <input type="password" id="pw" />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
};
export default LoginPage;