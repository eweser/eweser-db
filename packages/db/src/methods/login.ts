import { CollectionKey, ConnectStatus } from '../types';
import { createMatrixClient, getOrCreateRegistry } from './connectionUtils';

import type { LoginData, IDatabase } from '../types';

/** Connects to Matrix client and loads registry
 *
 * login grabs the rooms from the registry, and saves each room's metadata - room alias, room id into the db object. Should also save in localhost so that we can skip this step on next load.
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
