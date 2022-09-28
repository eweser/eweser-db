import { createContext, FC, PropsWithChildren, useRef, useState } from 'react';

import { ConnectStatus, Database, LoginData } from '@eweser/db';
import useLogin from './useLogin';

export interface DatabaseContext {
  login: (loginData: LoginData) => void;
  db: Database | null;
  loginStatus: ConnectStatus;
}

const initialDatabase: DatabaseContext = {
  login: async () => undefined,
  db: null,
  loginStatus: 'initial',
};

export const DatabaseContext = createContext<DatabaseContext>(initialDatabase);

export const DatabaseProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const db = useRef(new Database());
  const { login, loginStatus } = useLogin(db.current);

  return (
    <DatabaseContext.Provider value={{ db: db.current, login, loginStatus }}>
      {children}
    </DatabaseContext.Provider>
  );
};
