import type {
  RegistrySyncRequestBody,
  RegistrySyncResponse,
} from '@eweser/shared';
import {
  setLocalAccessGrantToken,
  setLocalRegistry,
} from '../../utils/localStorageService.js';
import type { Database } from '../../index.js';

export const syncRegistry =
  (db: Database) =>
  /** sends the registry to the server to check for additions/subtractions on either side */
  async () => {
    db.emit('registrySync', 'syncing');
    const body: RegistrySyncRequestBody = {
      rooms: db.registry,
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
    db.emit('registrySync', 'success');
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
      rooms.length >= 2
    ) {
      db.debug('setting new rooms', rooms);
      // TODO: if a new room was created locally before the sync finishes, this might overwrite it
      setLocalRegistry(db)(rooms);
      db.registry = rooms;
    } else {
      return false;
    }

    return true;
  };
