import { CollectionKey, ConnectStatus } from '../types';
import { createMatrixClient, getOrCreateRegistry } from './connectionUtils';

import type { LoginData, IDatabase } from '../types';

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
  this.matrixClient = await createMatrixClient(loginData);
  this.userId = this.matrixClient.getUserId() ?? '';
  const registryRoomAlias = await getOrCreateRegistry(this);
  if (!registryRoomAlias) throw new Error('could not get registry room alias');
  try {
    const connectRes = await this.connectRoom(registryRoomAlias, CollectionKey.registry, undefined);
    if (callback) callback(connectRes ? 'ok' : 'failed');
    return connectRes;
  } catch (error) {
    if (callback) callback('failed');
    return false;
  }
}
