import { collectionKeys, collections, initialRegistry } from './collections';
import { buildAliasFromSeed, newMatrixProvider } from './connectionUtils';
import { pollConnection } from './connectionUtils/pollConnection';
import { connectRegistry } from './methods/connectRegistry';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';
import { emit, off, on } from './methods/on';
import { signup } from './methods/signup';
import type {
  CollectionKey,
  Collections,
  DBEventListeners,
  LoginStatus,
} from './types';
import type { MatrixClient } from 'matrix-js-sdk';
import { getRoom } from './utils';
import { load } from './methods/load';
import { addTempDocToRoom } from './methods/addTempDocToRoom';

export type {
  Profile,
  Note,
  FlashCard,
  Collection,
  Collections,
  ConnectStatus,
  LoginData,
  Room,
  Documents,
  Document,
  YDoc,
  DocumentBase,
  DBEvent,
} from './types';

export type { TypedMap, TypedDoc } from 'yjs-types';
export { CollectionKey } from './types'; // enum exported not as a type

export * from './connectionUtils/aliasHelpers';
export * from './utils';
export { newMatrixProvider };

export interface DatabaseOptions {
  baseUrl?: string;
  debug?: boolean;
}

export class Database {
  matrixClient: MatrixClient | null = null;
  userId = '';
  baseUrl: string;
  loginStatus: LoginStatus = 'initial';
  online = false;

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = {
    registry: initialRegistry,
    ...collections,
  };

  listeners: DBEventListeners = {};

  // methods

  // logger/event emitter
  on = on(this);
  off = off(this);
  emit = emit(this);

  // connect methods
  connectRegistry = connectRegistry(this);
  connectRoom = connectRoom(this);
  createAndConnectRoom = createAndConnectRoom(this);
  addTempDocToRoom = addTempDocToRoom(this);

  login = login(this);
  signup = signup(this);
  load = load(this);

  // util methods
  buildAliasFromSeed = (aliasSeed: string, collectionKey: CollectionKey) =>
    buildAliasFromSeed(aliasSeed, collectionKey, this.userId);
  getRoom = getRoom(this);

  constructor(options?: DatabaseOptions) {
    this.baseUrl = options?.baseUrl || 'https://matrix.org';

    pollConnection(this); // start polling for connection status
    if (options?.debug) {
      this.on('debugger', (event) => {
        if (options.debug === true) {
          // eslint-disable-next-line no-console
          console.dir(event, { depth: 4 });
        }
      });
    }

    // todo: if registry is in localStorage, load up each room's store.
  }
}
