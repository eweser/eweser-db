import type { MatrixClient } from 'matrix-js-sdk';

import { collectionKeys, collections, initialRegistry } from './collections';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';
import { updateLoginStatus } from './methods/updateLoginStatus';
import { buildRoomAlias } from './utils';

import type {
  ConnectStatus,
  OnLoginStatusUpdate,
  OnRoomConnectStatusUpdate,
  LoginData,
  Room,
  Documents,
  CollectionKey,
  IDatabase,
} from './types';

import type { Note } from './collections';
import type { Collections } from './types';

export { CollectionKey } from './types'; // enum exported not as a type
export { buildRoomAlias };
export type { Collections, Note, ConnectStatus, LoginData, Room, Documents };

function getCollectionRegistry(this: IDatabase, collectionKey: CollectionKey) {
  return this.collections.registry['0'].store.documents['0'][collectionKey];
}

function getRegistryStore(this: IDatabase) {
  return this.collections.registry['0'].store;
}

export class Database implements IDatabase {
  matrixClient: MatrixClient | null = null;
  // todo: callbacks on initialization status change.

  loggedIn = false;
  loginStatus: ConnectStatus = 'initial';

  updateLoginStatus = updateLoginStatus;
  onLoginStatusUpdate: null | OnLoginStatusUpdate = null;
  onRoomConnectStatusUpdate: null | OnRoomConnectStatusUpdate = null;

  /** homeserver */
  baseUrl: string = 'https://matrix.org';

  collectionKeys = collectionKeys;
  collections: Collections = {
    registry: initialRegistry,
    ...collections,
  };

  connectRoom = connectRoom;
  createAndConnectRoom = createAndConnectRoom;
  login = login;

  getCollectionRegistry = getCollectionRegistry;
  getRegistryStore = getRegistryStore;
  constructor() {
    // todo: if registry is in localStorage, load up each room's store.
  }
}

export default Database;
