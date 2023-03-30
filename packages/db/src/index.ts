import { collectionKeys, collections, initialRegistry } from './collections';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';

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
  Document,
} from './types';
export type { DocumentBase } from './collections/documentBase';
export { CollectionKey } from './types'; // enum exported not as a type

export {
  buildRoomAlias,
  truncateRoomAlias,
  getUndecoratedRoomAlias,
} from './connectionUtils';
export { newDocument, buildRef, aliasKeyValidation } from './utils';

function getCollectionRegistry(this: IDatabase, collectionKey: CollectionKey) {
  return this.collections.registry['0'].store.documents['0'][collectionKey];
}

function getRegistryStore(this: IDatabase) {
  return this.collections.registry['0'].store;
}

export interface DatabaseOptions {
  baseUrl?: string;
}
export class Database implements IDatabase {
  matrixClient: MatrixClient | null = null;
  userId = '';
  baseUrl: string;

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
  constructor(options?: DatabaseOptions) {
    this.baseUrl = options?.baseUrl ?? 'https://matrix.org';

    // todo: if registry is in localStorage, load up each room's store.
  }
}
