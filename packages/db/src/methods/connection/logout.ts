import type { Database } from '../..';
import {
  clearLocalAccessGrantToken,
  clearLocalRegistry,
} from '../../utils/localStorageService';
export const logout =
  (db: Database) =>
  /**
   * clears the login token from storage and disconnects all ySweet providers. Still leaves the local indexedDB yDocs.
   */
  () => {
    clearLocalAccessGrantToken();
    db.accessGrantToken = '';
    db.useYSweet = false;
    db.online = false;
    for (const room of db.registry) {
      const dbRoom = db.getRoom(room.collectionKey, room.id);
      dbRoom.disconnect();
    }
    db.emit('onLoggedInChange', false);
  };

export const logoutAndClear =
  (db: Database) =>
  /**
   * Logs out and also clears all local data from indexedDB and localStorage.
   */
  () => {
    db.logout();
    for (const collectionKey of db.collectionKeys) {
      for (const room of db.getRooms(collectionKey)) {
        room.indexedDbProvider?.clearData();
        room.indexedDbProvider?.destroy();
      }
    }
    db.registry = [];
    clearLocalRegistry();
  };
