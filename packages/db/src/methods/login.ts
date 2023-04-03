import type { Database } from '..';
import {
  createMatrixClient,
  getOrCreateRegistryRoom,
} from '../connectionUtils';

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
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'DB.login',
      message,
      data: { raw: data },
    });
  logger('starting login', loginData);
  setLoginStatus(_db, 'loading');
  _db.baseUrl = loginData.baseUrl;

  await loginToMatrix(_db, loginData);
  const registryRoomAlias = await getOrCreateRegistryRoom(_db);
  if (!registryRoomAlias) throw new Error('could not get registry room alias');
  try {
    const connectRes = await _db.connectRegistry();
    logger('finished login', { connectRes });
    setLoginStatus(_db, 'ok');
    return connectRes;
  } catch (error) {
    _db.emit({
      event: 'DB.login',
      message: 'error connecting registry',
      data: { raw: error },
      level: 'error',
    });
    setLoginStatus(_db, 'failed');
    return null;
  }
};
