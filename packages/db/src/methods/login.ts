import { CollectionKey } from '../types';
import { createMatrixClient, getOrCreateRegistry } from '../utils';

import type { LoginData, IDatabase } from '../types';

/** Connects to Matrix client and loads registry
 *
 * login grabs the rooms from the registry. and rooms each room's metadata - room alias, room id into the db object. Should also save in localhost so that we can skip this step on next load.
 */
export async function login(
  this: IDatabase,
  loginData: LoginData,
  callback?: () => void
) {
  try {
    // console.log({ loginData });
    this.updateLoginStatus('loading');
    this.matrixClient = await createMatrixClient(loginData);
    const registryRoomAlias = await getOrCreateRegistry(
      this.matrixClient,
      this
    );
    if (!registryRoomAlias)
      throw new Error('could not get registry room alias');

    try {
      const connectRegistryResponse = await this.connectRoom(
        registryRoomAlias,
        CollectionKey.registry
      );
      // console.log({ connectRegistryResponse });
      this.updateLoginStatus('ok');
    } catch (error) {
      console.log('connect room failed');
      console.error(error);
      return this.updateLoginStatus('failed');
    }

    if (callback) callback();
  } catch (error) {
    console.log('login failed');
    console.error(error);
    this.updateLoginStatus('failed');
  }
}
