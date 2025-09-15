import React from 'react';

const SignupPage: React.FC = () => {
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
        <div>
          <label htmlFor="pw-confirm">pw: </label>
          <input type="password" id="pw-confirm" />
        </div>
        <button type="submit">회원가입</button>
      </form>
    </div>
  );
};
export default SignupPage;