import { useState } from 'react';
import type { LoginData, ConnectStatus } from '@eweser/db/types/types';
import type { IDatabase } from '@eweser/db';

const useLogin = (db: IDatabase) => {
  const [loginStatus, setLoginStatus] = useState<ConnectStatus>('initial');

  const login = async (loginData: LoginData) => {
    try {
      db.login(loginData, (val) => setLoginStatus(val));
    } catch (error) {
      console.error(error);
      setLoginStatus('failed');
    }
  };
  return { loginStatus, login };
};

export default useLogin;
