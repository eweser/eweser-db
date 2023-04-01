import { collectionKeys, collections, initialRegistry } from './collections';
import { connectRegistry } from './methods/connectRegistry';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';
import { emit, on } from './methods/on';

import type { Collections, IDatabase } from './types';
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
  buildAliasFromSeed,
  getAliasNameFromAlias,
  getAliasSeedFromAlias,
} from './connectionUtils';
export * from './utils';

export interface DatabaseOptions {
  baseUrl?: string;
  debug?: boolean;
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

  listeners = [];

  // methods
  on = on;
  emit = emit;

  connectRegistry = connectRegistry;
  connectRoom = connectRoom as any;
  createAndConnectRoom = createAndConnectRoom as any;
  login = login as any;

  constructor(options?: DatabaseOptions) {
    this.baseUrl = options?.baseUrl || 'https://matrix.org';
    if (options?.debug) {
      this.on((event) => {
        if (options.debug === true) {
          // eslint-disable-next-line no-console
          console.log(event);
        }
      });
    }

    // todo: if registry is in localStorage, load up each room's store.
  }
}
