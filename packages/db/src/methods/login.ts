import type { Database } from '..';
import {
  createMatrixClient,
  getOrCreateRegistryRoom,
} from '../connectionUtils';
import { awaitOnline } from '../connectionUtils/awaitOnline';

import type { LoginData, LoginStatus } from '../types';

/**
 *  Connects to Matrix client without loading registry
 *  Saves loginData to localStorage on success
 *  Saves userId to db
 */
export async function loginToMatrix(_db: Database, loginData: LoginData) {
  _db.matrixClient = await createMatrixClient(loginData);
  _db.userId = _db.matrixClient?.getUserId() || '';
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
 * Connects to Matrix client and loads registry
 *
 * Saves loginData to localStorage on success
 */
export const login = (_db: Database) => async (loginData: LoginData) => {
  try {
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: '.login',
        message,
        data: { raw: data },
      });
    logger('starting login', loginData);
    _db.baseUrl = loginData.baseUrl;

    const online = await awaitOnline(_db);
    logger('starting login, online: ' + online, online);
    if (!online) {
      throw new Error('not online');
    }

    setLoginStatus(_db, 'loading');

    await loginToMatrix(_db, loginData);
    const registryRoomAlias = await getOrCreateRegistryRoom(_db);
    if (!registryRoomAlias) {
      throw new Error('could not get registry room alias');
    }

    const connectRes = await _db.connectRegistry();
    logger('finished login', { connectRes });
    setLoginStatus(_db, 'ok');
    return connectRes;
  } catch (error: any) {
    const errorMessage = error?.message;
    _db.emit({
      event: '.login',
      message: errorMessage,
      data: { raw: error },
      level: 'error',
    });
    setLoginStatus(_db, 'failed');
    return errorMessage;
  }
};
