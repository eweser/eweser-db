import type { LoginData, Database } from '@eweser/db';
import { useEffect, useState } from 'react';
import { styles } from './styles';

export interface Props {
  handleLogin: (loginData: LoginData) => void;
  handleSignup: (loginData: LoginData) => void;
  db: Database;
  DEV_PASSWORD?: string;
  DEV_USERNAME?: string;
  MATRIX_SERVER?: string;
  showSignup?: boolean;
}

type FormField = keyof LoginData;
export const LoginForm = ({
  handleLogin,
  handleSignup,
  db,
  MATRIX_SERVER = 'https://matrix.org',
  DEV_PASSWORD,
  DEV_USERNAME,
  showSignup,
}: Props) => {
  const initialLoginData: LoginData = {
    baseUrl: MATRIX_SERVER,
    userId: DEV_USERNAME, // these will be empty in prod. This speeds up dev time by prefilling the login form
    password: DEV_PASSWORD,
  };
  const [loginStatus, setLoginStatus] = useState(db.loginStatus || 'initial');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    db.on('login-status', ({ data, event, message }) => {
      // this will be called during db.login() or db.signup() but not db.load()
      if (data?.loginStatus) setLoginStatus(data.loginStatus);
      if (event === 'startFailed') {
        // this will also include 'load' failures
        setErrorMessage(message || '');
      }
    });
    return () => {
      db.off('login-status');
    };
  }, [db]);

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
    <>
      <h1>{isSignup ? 'Sign up' : 'Log In'}</h1>
      <form onSubmit={(e) => e.preventDefault()} style={styles.login}>
        <label htmlFor="server-input">Homeserver:</label>
        <input
          id="server-input"
          placeholder="Where your matrix account was created, e.g. 'https://matrix.org'"
          value={loginData.baseUrl}
          onChange={(e) => handleChange('baseUrl', e.target.value)}
        />

        <label htmlFor="user-input">Matrix user id: *</label>
        <input
          name="username"
          autoComplete="username"
          placeholder="e.g. 'jacob' if your full username is '@jacob:matrix.org'"
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
          <p style={{ color: 'red' }}>Login failed: {loginStatus.toString()}</p>
        )}
        {errorMessage && loginStatus === 'failed' && (
          <p style={{ color: 'red' }}>{errorMessage}</p>
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
          <>
            <p>
              {`* No matrix account? `}
              {showSignup && (
                <>
                  <button onClick={() => setIsSignup(!isSignup)}>
                    Sign up
                  </button>
                  {` with our homeserver ${MATRIX_SERVER}`}
                </>
              )}
            </p>
            {/* <p style={{ margin: 0 }}>or</p> */}
            <p>
              {`Sign up at `}
              <a href="https://app.element.io/">element.io</a> with the username
              and password option
            </p>
          </>
        )}
      </form>
    </>
  );
};
