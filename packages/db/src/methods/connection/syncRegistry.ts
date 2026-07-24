import type {
  RegistrySyncRequestBody,
  RegistrySyncResponse,
} from '@eweser/shared';
import {
  setLocalAccessGrantToken,
  setLocalRegistry,
} from '../../utils/localStorageService.js';
import type { Database } from '../../index.js';

function unloadRoomsMissingFromRegistry(
  db: Database,
  previousRooms: Database['registry'],
  serverRooms: Database['registry']
) {
  const serverRoomIds = new Set(serverRooms.map((room) => room.id));

  for (const previousRoom of previousRooms) {
    if (
      serverRoomIds.has(previousRoom.id) ||
      db._initialRoomIds.has(previousRoom.id)
    ) {
      continue;
    }

    const loadedRoom =
      db.collections[previousRoom.collectionKey][previousRoom.id];
    if (!loadedRoom) continue;

    loadedRoom.disconnect();
    Reflect.deleteProperty(
      db.collections[previousRoom.collectionKey],
      previousRoom.id
    );
  }
}

export const syncRegistry =
  (db: Database) =>
  /** sends the registry to the server to check for additions/subtractions on either side */
  async () => {
    db.emit('registrySync', 'syncing');
    const previousRooms = [...db.registry];
    const newRoomIds = [...db._pendingRegistryRoomIds];
    const body: RegistrySyncRequestBody = {
      rooms: db.registry,
      newRoomIds,
    };
    if (!db.getToken()) {
      return false;
    }
    const { data: syncResult, error } =
      await db.serverFetch<RegistrySyncResponse>(
        '/api/access-grant/sync-registry',
        { method: 'POST', body }
      );
    if (error) {
      db.emit('registrySync', 'error', error);
      return false;
    }
    db.info('syncResult', syncResult);

    const { rooms, token, userId } = syncResult ?? {};
    if (userId && typeof userId === 'string') {
      db.debug('setting new userId', userId);
      db.userId = userId;
    }
    if (token && typeof token === 'string') {
      db.debug('setting new token', token);
      setLocalAccessGrantToken(db)(token);
      db.accessGrantToken = token;
    } else {
      return false;
    }

    if (
      rooms &&
      typeof rooms === 'object' &&
      Array.isArray(rooms) &&
      rooms.length >= 1
    ) {
      db.debug('setting new rooms', rooms);
      // TODO: if a new room was created locally before the sync finishes, this might overwrite it
      unloadRoomsMissingFromRegistry(db, previousRooms, rooms);
      setLocalRegistry(db)(rooms);
      db.registry = rooms;
      for (const roomId of newRoomIds) {
        db._pendingRegistryRoomIds.delete(roomId);
      }
    } else {
      return false;
    }

    db.emit('registrySync', 'success');
    return true;
  };
