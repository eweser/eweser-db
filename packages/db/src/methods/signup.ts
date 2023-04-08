import { createClient } from 'matrix-js-sdk';
import type { Database } from '..';
import { awaitOnline } from '../connectionUtils/awaitOnline';
import type { LoginData, LoginStatus } from '../types';

const setLoginStatus = (_db: Database, loginStatus: LoginStatus) => {
  _db.loginStatus = loginStatus;
  _db.emit({
    event: 'loginStatus',
    data: { loginStatus },
  });
};

export const signup = (_db: Database) => async (signupData: LoginData) => {
  try {
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: 'signup',
        message,
        data: { raw: data },
      });
    logger('starting signup', signupData);
    const { userId, password, baseUrl } = signupData;
    if (!userId || !password) {
      throw new Error('missing userId or password');
    }
    if (!baseUrl) {
      throw new Error('missing baseUrl');
    }
    _db.baseUrl = baseUrl;

    const online = await awaitOnline(_db);
    logger('starting signup, online: ' + online, online);
    if (!online) {
      throw new Error('not online');
    }

    const matrixClient = createClient({
      baseUrl: _db.baseUrl,
    });
    let session = '';
    // first get a session_id. this is returned in a 401 response :/
    try {
      await matrixClient.register(userId, password, null, undefined as any);
      matrixClient;
    } catch (e: any) {
      if (e.data?.errcode === 'M_USER_IN_USE') {
        _db.emit({
          event: 'signup',
          message: 'user already exists',
          level: 'error',
        });
        return 'user already exists';
      }
      session = e?.data?.session;
    }

    if (!session) {
      throw new Error('unexpected, no session set');
    }

    await matrixClient.registerRequest({
      username: userId,
      password,
      auth: { session, type: 'm.login.dummy' },
    });

    const loginRes = await _db.login(signupData);
    logger('finished signup', loginRes);
    return loginRes;
  } catch (error: any) {
    const errorMessage = error?.message;
    _db.emit({
      event: 'signup',
      message: errorMessage,
      data: { raw: error },
      level: 'error',
    });
    setLoginStatus(_db, 'failed');
    return errorMessage;
  }
};
