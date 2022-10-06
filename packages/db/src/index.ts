import { collectionKeys, collections, initialRegistry } from './collections';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';
import { buildRoomAlias } from './methods/connectionUtils';

import type { CollectionKey, Collections, IDatabase } from './types';
import type { MatrixClient } from 'matrix-js-sdk';

export type { Note, NoteBase, FlashCard, FlashcardBase } from './collections';
export type {
  Collection,
  Collections,
  ConnectStatus,
  LoginData,
  Room,
  Documents,
  IDatabase,
} from './types';
export type { DocumentBase } from './collections/documentBase';
export { CollectionKey } from './types'; // enum exported not as a type

export { buildRoomAlias };
export { newDocument, buildRef } from './utils';

function getCollectionRegistry(this: IDatabase, collectionKey: CollectionKey) {
  return this.collections.registry['0'].store.documents['0'][collectionKey];
}

function getRegistryStore(this: IDatabase) {
  return this.collections.registry['0'].store;
}

export class Database implements IDatabase {
  matrixClient: MatrixClient | null = null;
  userId = '';
  baseUrl = 'https://matrix.org';

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
