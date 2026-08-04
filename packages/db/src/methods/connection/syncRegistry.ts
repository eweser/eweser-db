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

export const syncRegistry = (db: Database) => {
  let inFlightSync: Promise<boolean> | null = null;

  /** Sends one registry snapshot to the server. */
  const syncOnce = async () => {
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

    if (rooms && typeof rooms === 'object' && Array.isArray(rooms)) {
      db.debug('setting new rooms', rooms);
      const serverRoomIds = new Set(rooms.map((room) => room.id));
      const rejectedTombstoneRooms = rooms.filter((room) =>
        previousRooms.some(
          (previousRoom) => previousRoom.id === room.id && previousRoom._deleted
        )
      );
      const roomsCreatedDuringSync = db.registry.filter(
        (room) =>
          db._pendingRegistryRoomIds.has(room.id) && !serverRoomIds.has(room.id)
      );
      const nextRooms = [...rooms, ...roomsCreatedDuringSync];

      unloadRoomsMissingFromRegistry(db, previousRooms, nextRooms);
      setLocalRegistry(db)(nextRooms);
      db.registry = nextRooms;
      for (const roomId of newRoomIds) {
        if (serverRoomIds.has(roomId)) {
          db._pendingRegistryRoomIds.delete(roomId);
        }
      }

      if (rejectedTombstoneRooms.length > 0) {
        await db.loadRooms(rejectedTombstoneRooms, db.useSync, 0);
        db.emit(
          'registrySync',
          'error',
          'The server did not authorize one or more room deletions.'
        );
        return false;
      }
    } else {
      return false;
    }

    db.emit('registrySync', 'success');
    return true;
  };

  /** Sends the registry to the server and drains rooms created mid-sync. */
  return async () => {
    if (inFlightSync) {
      return inFlightSync;
    }

    inFlightSync = (async () => {
      do {
        const pendingBefore = new Set(db._pendingRegistryRoomIds);
        const synced = await syncOnce();
        if (!synced) {
          return false;
        }

        if (
          db._pendingRegistryRoomIds.size > 0 &&
          pendingBefore.size === db._pendingRegistryRoomIds.size &&
          [...pendingBefore].every((roomId) =>
            db._pendingRegistryRoomIds.has(roomId)
          )
        ) {
          return false;
        }
      } while (db._pendingRegistryRoomIds.size > 0);

      return true;
    })();

    try {
      return await inFlightSync;
    } finally {
      inFlightSync = null;
    }
  };
};
