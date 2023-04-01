import { CollectionKey } from '../types';
import { createMatrixClient, getOrCreateRegistry } from '../connectionUtils';

import type { LoginData, IDatabase, ConnectStatus } from '../types';

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

/**
 *
 * Connects to Matrix client and loads registry
 *
 * Saves loginData to localStorage on success
 */
export async function login(
  this: IDatabase,
  loginData: LoginData,
  callback?: (status: ConnectStatus) => void
) {
  if (callback) callback('loading');
  await loginToMatrix(this, loginData);
  const registryRoomAlias = await getOrCreateRegistry(this);
  if (!registryRoomAlias) throw new Error('could not get registry room alias');
  try {
    const connectRes = await this.connectRegistry();
    if (callback) callback(connectRes ? 'ok' : 'failed');
    return connectRes;
  } catch (error) {
    if (callback) callback('failed');
    return false;
  }
}
