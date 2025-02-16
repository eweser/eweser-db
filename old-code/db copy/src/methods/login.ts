import type { Database } from '..';
import { createMatrixClient, awaitOnline, validateUsername } from '../utils';

import type { LoginData, LoginStatus, Documents, RegistryData } from '../types';
import type { TypedMap } from 'yjs-types';

/**
 *  Connects to Matrix client without loading registry
 *  Saves loginData to localStorage on success
 *  Saves userId to db
 */
export async function loginToMatrix(_db: Database, loginData: LoginData) {
  const { initialRoomConnect: _filterOut, ...options } = loginData;
  _db.matrixClient = await createMatrixClient(options);
  const userId = _db.matrixClient?.getUserId();
  _db.userId = userId || '';
  if (!_db.userId) {
    throw new Error('userId not found');
  }
  return _db.matrixClient;
}

const setLoginStatus = (_db: Database, loginStatus: LoginStatus) => {
  _db.loginStatus = loginStatus;
  _db.emit({
    event: 'loginStatus',
    data: { loginStatus },
  });
};

/**
 *
 * The userId can be either the full userId which includes the homeserver or just the local part e.g. "@alice:matrix.org" or "alice"
 *
 * Connects to Matrix client and loads registry
 *
 * Saves loginData to localStorage on success
 */
export async function login(
  this: Database,
  loginData: LoginData,
  fromSignup = false
): Promise<TypedMap<Documents<RegistryData>> | string> {
  try {
    if (!fromSignup) setLoginStatus(this, 'loading');

    const logger = (message: string, data?: any) =>
      this.emit({
        event: 'login',
        message,
        data: { raw: data },
      });
    logger('starting login', loginData);
    this.baseUrl = loginData.baseUrl;

    if (!(loginData.userId?.includes('@') && loginData.userId.includes(':'))) {
      validateUsername(loginData.userId ?? '');
    }

    const online = await awaitOnline(this);
    logger('starting login, online: ' + online, online);
    if (!online) {
      throw new Error('not online');
    }

    await loginToMatrix(this, loginData);

    const connectRes = await this.connectRegistry();

    if (loginData.initialRoomConnect) {
      await this.createAndConnectRoom(loginData.initialRoomConnect);
    }

    logger('finished login', { connectRes });
    this.emit({ event: 'started' });
    setLoginStatus(this, 'ok');
    return connectRes;
  } catch (error: any) {
    const message = error?.message;
    this.emit({
      event: 'login',
      message,
      data: { raw: error },
      level: 'error',
    });
    setLoginStatus(this, 'failed');
    this.emit({ event: 'startFailed', message });
    return message;
  }
}
