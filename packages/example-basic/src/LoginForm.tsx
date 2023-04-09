import type { LoginData, ConnectStatus } from '@eweser/db';
import { useState } from 'react';
import { DEV_PASSWORD, DEV_USERNAME, MATRIX_SERVER } from './config';
import { styles } from './styles';

const initialLoginData: LoginData = {
  baseUrl: MATRIX_SERVER,
  userId: DEV_USERNAME, // these will be empty in prod. This speeds up dev time
  password: DEV_PASSWORD,
};

export interface Props {
  handleLogin: (loginData: LoginData) => void;
  handleSignup: (loginData: LoginData) => void;
  loginStatus: ConnectStatus;
}

type FormField = keyof LoginData;

const LoginForm = ({ handleLogin, handleSignup, loginStatus }: Props) => {
  const [loginData, setLoginData] = useState(initialLoginData);
  const [isSignup, setIsSignup] = useState(false);
  const handleChange = (field: FormField, value: string) => {
    const loginDataChange = {
      ...loginData,
      [field]: value,
    };
    setLoginData(loginDataChange);
  };
  const login = () => handleLogin(loginData);
  const signup = () => handleSignup(loginData);

  return (
    <div style={styles.flexColCenter}>
      <h1>{isSignup ? 'Sign up' : 'Log In'}</h1>
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
        />

        <label htmlFor="password-input">Password:</label>
        <input
          autoComplete="current-password"
          id="password-input"
          type="password"
          onChange={(e) => handleChange('password', e.target.value)}
          value={loginData.password}
        />
        {loginStatus === 'failed' && (
          // TODO: show error
          <p>Login failed</p>
        )}

        <button
          style={{ margin: '1rem' }}
          disabled={loginStatus !== 'initial' && loginStatus !== 'failed'}
          onClick={isSignup ? signup : login}
        >
          {isSignup ? 'Sign up' : 'Log in'}
        </button>

        {isSignup ? (
          <p>
            Already have an account?{' '}
            <button onClick={() => setIsSignup(!isSignup)}> Log in </button>
          </p>
        ) : (
          <p>
            No matrix account?{' '}
            <button onClick={() => setIsSignup(!isSignup)}> Sign up </button>{' '}
            with our homeserver ({MATRIX_SERVER}) <hr />
            or
            <hr />
            {`Sign up at `}
            <a href="https://app.element.io/">element.io</a> with the username
            and password option
          </p>
        )}
      </form>
    </div>
  );
};

export default LoginForm;
