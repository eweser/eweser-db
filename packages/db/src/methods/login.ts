import {
  createMatrixClient,
  getOrCreateRegistryRoom,
} from '../connectionUtils';

import type { LoginData, IDatabase, LoginStatus } from '../types';

/**
 *  Connects to Matrix client without loading registry
 *  Saves loginData to localStorage on success
 *  Saves userId to db
 */
export async function loginToMatrix(_db: IDatabase, loginData: LoginData) {
  _db.matrixClient = await createMatrixClient(loginData);
  _db.userId = _db.matrixClient?.getUserId() || '';
  return _db.matrixClient;
}

const setLoginStatus = (_db: IDatabase, loginStatus: LoginStatus) => {
  _db.loginStatus = loginStatus;
  _db.emit({
    event: 'loginStatus',
    loginStatus,
  });
};

/**
 *
 * Connects to Matrix client and loads registry
 *
 * Saves loginData to localStorage on success
 */
export async function login(this: IDatabase, loginData: LoginData) {
  const logger = (message: string, data?: any) =>
    this.emit({
      event: 'DB.login',
      message,
      data: { raw: data },
    });
  logger('starting login', loginData);
  setLoginStatus(this, 'loading');
  this.baseUrl = loginData.baseUrl;

  await loginToMatrix(this, loginData);
  const registryRoomAlias = await getOrCreateRegistryRoom(this);
  if (!registryRoomAlias) throw new Error('could not get registry room alias');
  try {
    const connectRes = await this.connectRegistry();
    logger('finished login', { connectRes });
    setLoginStatus(this, 'ok');
    return connectRes;
  } catch (error) {
    this.emit({
      event: 'DB.login',
      message: 'error connecting registry',
      data: { raw: error },
      level: 'error',
    });
    setLoginStatus(this, 'failed');
    return null;
  }
}
