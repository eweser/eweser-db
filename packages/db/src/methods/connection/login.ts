import type { Database } from '../../index.js';
import type { EweDocument, Room } from '../../types.js';
import { pollConnection } from '../../utils/connection/pollConnection.js';

export const login =
  (db: Database) =>
  /**
   * @param loadAllRooms default false. Will load all rooms from the registry and connect to them. Disable this is you have too many rooms and want to load them later individually.
   * @returns true if successful
   */
  async (options: { loadAllRooms?: boolean } | undefined) => {
    //TODO: better event?
    db.emit(
      'roomConnectionChange',
      'connecting',
      {} as unknown as Room<EweDocument>
    );
    const token = db.getToken();
    if (!token) {
      throw new Error('No token found');
    }
    const syncResult = await db.syncRegistry();
    if (!syncResult) {
      throw new Error('Failed to sync registry');
    }
    db.useSync = true;
    pollConnection(db); // start polling for auth server connection status if db was started in offline mode previously
    if (options?.loadAllRooms) {
      await db.loadRooms(db.registry, true); // connects the sync providers. Could make this more atomic in the future to avoid creating too many connections.
    }
    db.emit('onLoggedInChange', true);
    return true;
  };
