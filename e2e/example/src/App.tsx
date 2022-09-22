import { useState } from 'react';
import { LoginData, ConnectStatus } from '@eweser/db';
import { useEweserDB } from '@eweser/hooks';

import LoginForm from 'LoginForm';

import { DEV_PASSWORD, DEV_USERNAME, MATRIX_SERVER } from 'config';

const App = () => {
  const db = useEweserDB();
  const initialLoginData: LoginData = {
    baseUrl: MATRIX_SERVER,
    userId: DEV_USERNAME, // these will be empty in prod. This speeds up dev time
    password: DEV_PASSWORD,
  };
  const [loginData, setLoginData] = useState(initialLoginData);
  const [loginStatus, setLoginStatus] = useState<ConnectStatus>('initial');
  const handleLogin = () => {
    // login(loginData, onSetLoginStatus as any);
  };

  return (
    <div>
      <h1>Login</h1>
      {loginStatus !== 'ok' ? (
        <LoginForm
          handleLogin={handleLogin}
          loginStatus={loginStatus}
          loginData={loginData}
          setLoginData={setLoginData}
        />
      ) : (
        <p>Logged in</p>
      )}
    </div>
  );
};

export default App;
