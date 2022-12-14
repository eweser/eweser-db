import { LoginData, ConnectStatus } from '@eweser/db';
import { useState } from 'react';
import { DEV_PASSWORD, DEV_USERNAME, MATRIX_SERVER } from 'config';
import { styles } from 'styles';

const initialLoginData: LoginData = {
  baseUrl: MATRIX_SERVER,
  userId: DEV_USERNAME, // these will be empty in prod. This speeds up dev time
  password: DEV_PASSWORD,
};

export interface Props {
  handleLogin: (loginData: LoginData) => void;
  loginStatus: ConnectStatus;
}

type FormField = keyof LoginData;

const LoginForm = ({ handleLogin, loginStatus }: Props) => {
  const [loginData, setLoginData] = useState(initialLoginData);

  const handleChange = (field: FormField, value: string) => {
    const loginDataChange = {
      ...loginData,
      [field]: value,
    };
    setLoginData(loginDataChange);
  };
  const login = () => handleLogin(loginData);

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} style={styles.login}>
        <label htmlFor="server-input">Homeserver:</label>
        <input
          id="server-input"
          value={loginData.baseUrl}
          onChange={(e) => handleChange('baseUrl', e.target.value)}
        />

        <label htmlFor="user-input">Matrix user id: *</label>
        <input
          autoComplete="username"
          placeholder="e.g.: @jacob:matrix.org"
          id="user-input"
          onChange={(e) => handleChange('userId', e.target.value)}
          value={loginData.userId}
        ></input>

        <label htmlFor="password-input">Password:</label>
        <input
          autoComplete="current-password"
          id="password-input"
          type="password"
          onChange={(e) => handleChange('password', e.target.value)}
          value={loginData.password}
        ></input>
        {loginStatus === 'failed' && (
          // TODO: show error
          <p>Login failed</p>
        )}

        <button disabled={loginStatus === 'loading'} onClick={login}>
          Login
        </button>
        <p>
          {`* Sign up at `}
          <a href="https://app.element.io/">element.io</a> with the username and password option
        </p>
      </form>
    </div>
  );
};

export default LoginForm;
