import type { CollectionKey, Database, LoginData } from '..';
import { awaitOnline } from '../connectionUtils/awaitOnline';
import { loadRoom } from '../connectionUtils/loadRoom';
import { localStorageGet, LocalStorageKey } from '../utils/localStorageService';

/**
 * Checks localStorage for loginData and indexedDB for registry. returns false if not found.
 * Loads registry and rooms into db
 * If offline, returns true.
 * If online, tries to login and connect each room. returns true if successful.
 */
export const load =
  (_db: Database) =>
  async (rooms: { collectionKey: CollectionKey; aliasSeed: string }[]) => {
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
    // check if loginData is in localStorage
    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    if (!loginInfo || !loginInfo.userId) {
      logger('unable to load localStore loginInfo', loginInfo);
      _db.emit({ event: 'startFailed' });
      return false;
    }
    _db.userId = loginInfo.userId;
    _db.baseUrl = loginInfo.baseUrl;

    const indexedDBs = await indexedDB.databases();
    const registryFind = indexedDBs.find((db) => db.name === 'registry');
    if (!registryFind || !registryFind.name) {
      logger('unable to load localStore indexedDB registry');
      _db.emit({ event: 'startFailed' });
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
      logger('unable to load localStore indexedDB db');
      _db.emit({ event: 'startFailed' });
      return false;
    }
    // load registry ydoc from indexedDB to db
    await loadRoom(_db, { collectionKey: 'registry', aliasSeed: 'registry' });

    // load up the database, registering each ydoc in the room list that is in indexedDB to the corresponding collection room in the db.
    for (const room of rooms) {
      await loadRoom(_db, room);
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
      for (const { aliasSeed, collectionKey } of rooms) {
        try {
          const result = await _db.connectRoom(aliasSeed, collectionKey);
          if (result.matrixProvider?.canWrite) {
            successfulRooms++;
          }
        } catch (error) {
          logger('load, connect room failed', {
            aliasSeed,
            collectionKey,
            error,
          });
        }
      }
      logger(`load, connected rooms: ${successfulRooms}/${targetRooms}`);
      _db.emit({ event: 'started' });
      return true;
    } catch (error) {
      _db.emit({ event: 'startFailed' });

      logger('load, connect rooms failed', error);
      return false;
    }
  };
