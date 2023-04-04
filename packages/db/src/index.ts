import { collectionKeys, collections, initialRegistry } from './collections';
import { connectRegistry } from './methods/connectRegistry';
import { connectRoom } from './methods/connectRoom';
import { createAndConnectRoom } from './methods/createAndConnectRoom';
import { login } from './methods/login';
import { emit, on } from './methods/on';
import type {
  CollectionKey,
  Collections,
  DBEventEmitter,
  LoginStatus,
} from './types';

import type { MatrixClient } from 'matrix-js-sdk';

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
} from './types';

export { CollectionKey } from './types'; // enum exported not as a type

export * from './connectionUtils/aliasHelpers';
export * from './utils';

export interface DatabaseOptions {
  baseUrl?: string;
  debug?: boolean;
}

export class Database {
  matrixClient: MatrixClient | null = null;
  userId = '';
  baseUrl: string;
  loginStatus: LoginStatus = 'initial';

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = {
    registry: initialRegistry,
    ...collections,
  };

  listeners: DBEventEmitter[] = [];

  // methods
  on = on(this);
  emit = emit(this);

  connectRegistry = connectRegistry(this);
  connectRoom = connectRoom(this);
  createAndConnectRoom = createAndConnectRoom(this);
  login = login(this);

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
