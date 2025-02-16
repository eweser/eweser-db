import type { Database } from '..';
import type { CollectionKey } from '../types';
import {
  LocalStorageKey,
  localStorageSet,
} from '../utils/db/localStorageService';
/** Note that logout will not delete local indexedDB database. It just disconnects all connected rooms and deletes the saved login info from localStorage  */
export const logout =
  (_db: Database) =>
  /** Note that logout will not delete local indexedDB database. It just disconnects all connected rooms and deletes the saved login info from localStorage  */
  async () => {
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: 'logout',
        message,
        data: {
          raw: data,
        },
      });
    logger('logging out');

    localStorageSet(LocalStorageKey.loginData, null);

    const collections = Object.keys(_db.collections) as CollectionKey[];

    for (const collectionKey of collections) {
      const collection = _db.collections[collectionKey];
      for (const roomId of Object.keys(collection)) {
        await _db.disconnectRoom({ collectionKey, roomId });
      }
    }
    logger('logged out');
  };
