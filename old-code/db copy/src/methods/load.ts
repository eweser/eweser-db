import type { CollectionKey, Database, LoginData } from '..';
import {
  checkMatrixProviderConnected,
  awaitOnline,
  checkServerConnection,
} from '../utils';

import {
  localStorageGet,
  LocalStorageKey,
} from '../utils/db/localStorageService';

/**
 * Checks localStorage for loginData and indexedDB for registry. returns false if not found.
 * Loads registry and rooms into db
 * If offline, returns true.
 * If online, tries to login and connect each room. returns true if successful.
 */
export const load =
  (_db: Database) =>
  async (rooms: { collectionKey: CollectionKey; roomId: string }[]) => {
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: 'load',
        message,
        data: {
          raw: {
            ...data,
            rooms,
          },
        },
      });
    logger('starting load');
    checkServerConnection(_db);
    // check if loginData is in localStorage
    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    if (!loginInfo || !loginInfo.userId) {
      const message = 'unable to load localStore loginInfo';
      logger(message, loginInfo);
      _db.emit({ level: 'error', event: 'startFailed', message });
      return false;
    }
    _db.userId = loginInfo.userId;
    _db.baseUrl = loginInfo.baseUrl;

    const indexedDBs = await indexedDB.databases();
    const registryFind = indexedDBs.find((db) => db.name === 'registry');
    if (!registryFind || !registryFind.name) {
      const message = 'unable to load localStore indexedDB registry';
      logger(message);
      _db.emit({ level: 'error', event: 'startFailed', message });
      return false;
    }
    logger('loading from localStorage', loginInfo);
    // check that ydocs are in indexedDB
    const registryIndexedDB = await indexedDB.open(
      registryFind.name,
      registryFind.version
    );
    // TODO: more detailed check that indexxedDB doc is there.
    if (!registryIndexedDB.readyState) {
      const message = 'unable to load localStore indexedDB db';
      logger(message);
      _db.emit({ level: 'error', event: 'startFailed', message });
      return false;
    }
    // load registry ydoc from indexedDB to db
    await _db.loadRoom({ collectionKey: 'registry', roomId: 'registry' });

    // load up the database, registering each ydoc in the room list that is in indexedDB to the corresponding collection room in the db.
    for (const room of rooms) {
      await _db.loadRoom(room);
    }
    logger('loaded from localStorage');

    // check online. if online, login and connect registry then connect each room.
    const online = await awaitOnline(_db);
    logger('load, online: ' + online);
    if (!online) {
      _db.emit({ event: 'started' });
      return true;
    }
    const loginRes = await _db.login(loginInfo);
    if (typeof loginRes === 'string') {
      logger('load, login failed', loginRes);
      return false;
    }
    logger('load, login success');
    try {
      let successfulRooms = 0;
      const targetRooms = rooms.length;
      for (const { roomId, collectionKey } of rooms) {
        try {
          const result = await _db.connectRoom({ roomId, collectionKey });
          if (typeof result === 'string') {
            throw new Error(result);
          }
          if (checkMatrixProviderConnected(result.matrixProvider)) {
            successfulRooms++;
          }
        } catch (error) {
          logger('load, connect room failed', {
            roomId,
            collectionKey,
            error,
          });
        }
      }
      logger(`load, connected rooms: ${successfulRooms}/${targetRooms}`);
      _db.emit({ event: 'started' });
      return true;
    } catch (error) {
      _db.emit({
        level: 'error',
        event: 'startFailed',
        message: error?.message,
      });

      logger('load, connect rooms failed', error);
      return false;
    }
  };
