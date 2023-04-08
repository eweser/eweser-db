import { createClient } from 'matrix-js-sdk';
import { Database } from '..';
import { awaitOnline } from '../connectionUtils/awaitOnline';
import { LoginData, LoginStatus } from '../types';

const setLoginStatus = (_db: Database, loginStatus: LoginStatus) => {
  _db.loginStatus = loginStatus;
  _db.emit({
    event: 'loginStatus',
    data: { loginStatus },
  });
};

export const signup =
  (_db: Database) =>
  async (userId: string, password: string, baseUrl: string) => {
    if (!_db) throw new Error('db not initialized');
    if (!userId) throw new Error('userId not set');
    if (!password) throw new Error('password not set');
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: 'signup',
        message,
        data: { raw: data },
      });
    logger('starting signup');
    _db.baseUrl = baseUrl;

    const online = await awaitOnline(_db);
    logger('starting login, online: ' + online, online);
    if (!online) {
      throw new Error('not online');
    }
    setLoginStatus(_db, 'loading');

    const matrixClient = createClient({
      baseUrl: _db.baseUrl,
    });
    let sessionId = '';
    // first get a session_id. this is returned in a 401 response :/
    try {
      const result = await matrixClient.registerRequest({
        username: userId,
        password,
      });
      console.log({ result });
    } catch (e: any) {
      if (e.data?.errcode === 'M_USER_IN_USE') {
        return _db.login({ userId, password, baseUrl: _db.baseUrl });
      }
      console.log('signup error', e);
      sessionId = e?.data?.session;
    }

    if (!sessionId) {
      throw new Error('unexpected, no sessionId set');
    }

    // now register
    try {
      const result = await matrixClient.registerRequest({
        username: userId,
        password,
        auth: { session: sessionId },
      });
      console.log('signup result', result);
    } catch (error) {
      console.log('signup registerRequest error', error);
    }

    // login
    const loginResult = await matrixClient.loginWithPassword(userId, password);
    console.log('login result', loginResult);

    const matrixClientLoggedIn = createClient({
      baseUrl,
      accessToken: loginResult.access_token,
      userId: loginResult.user_id,
      deviceId: loginResult.device_id,
    });
    _db.matrixClient = matrixClientLoggedIn;
  };
