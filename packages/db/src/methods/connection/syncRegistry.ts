import type { Registry } from '../../types';
import {
  setLocalAccessGrantToken,
  setLocalRegistry,
} from '../../utils/localStorageService';
import type { Database } from '../..';

export const syncRegistry =
  (db: Database) =>
  /** sends the registry to the server to check for additions/subtractions on either side */
  async () => {
    db.emit('registrySync', 'syncing');
    // packages/auth-server/src/app/access-grant/sync-registry/route.ts
    type RegistrySyncRequestBody = {
      token: string;
      rooms: Registry;
    };
    type RegistrySyncResponse = RegistrySyncRequestBody & { userId: string };
    const body: RegistrySyncRequestBody = {
      token: db.getToken() ?? '',
      rooms: db.registry,
    };
    if (!body.token) {
      return false;
    }
    const { data: syncResult, error } =
      await db.serverFetch<RegistrySyncResponse>(
        '/access-grant/sync-registry',
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
