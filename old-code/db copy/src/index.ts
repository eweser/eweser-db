import { collectionKeys, collections, initialRegistry } from './collections';

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
import { buildAliasFromSeed, getCollectionRegistry, getRoom } from './utils';
import { load } from './methods/load';
import { addTempDocToRoom } from './methods/addTempDocToRoom';
import { disconnectRoom } from './methods/disconnectRoom';
import { loadRoom } from './utils/connection/loadRoom';
import { pollConnection } from './utils/connection/pollConnection';
import { loadAndConnectRoom } from './methods/loadAndConnectRoom';
import { getDocumentByRef } from './methods/getDocumentByRef';
import { getDocuments } from './methods/getDocuments';
import { deleteRoom } from './methods/deleteRoom';
import { createOfflineRoom } from './methods/createOfflineRoom';
import { logout } from './methods/logout';

export type {
  Profile,
  Note,
  Flashcard,
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
  RoomMetaData,
} from './types';

export type { TypedMap, TypedDoc } from 'yjs-types';
export { CollectionKey } from './types'; // enum exported not as a type

export * from './utils';

const defaultRtcPeers = [
  'wss://signaling.yjs.dev',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

export type ProviderOptions = 'WebRTC' | 'Matrix' | 'IndexedDB';
export interface DatabaseOptions {
  baseUrl?: string;
  debug?: boolean;
  /** Which providers to use. By default uses all.
   * Currently indexxedDB and Matrix are required and webRTC is optional
   */
  providers?: ProviderOptions[];
  /** provide a list of peers to use instead of the default */
  webRTCPeers?: string[];
  offlineOnly?: boolean;
}

export class Database {
  matrixClient: MatrixClient | null = null;
  userId = '';
  baseUrl: string;
  loginStatus: LoginStatus = 'initial';
  online = false;
  offlineOnly = false;

  useMatrix = true;
  useWebRTC = true;
  useIndexedDB = true;

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = {
    registry: initialRegistry,
    ...collections,
  };

  listeners: DBEventListeners = {};

  webRtcPeers: string[] = defaultRtcPeers;
  // methods

  // logger/event emitter
  on = on(this);
  off = off(this);
  emit = emit(this);

  // connect methods
  connectRegistry = connectRegistry(this);
  connectRoom = connectRoom(this);
  disconnectRoom = disconnectRoom(this);
  createAndConnectRoom = createAndConnectRoom(this);
  createOfflineRoom = createOfflineRoom;
  addTempDocToRoom = addTempDocToRoom(this);
  loadRoom = loadRoom(this);
  loadAndConnectRoom = loadAndConnectRoom(this);
  deleteRoom = deleteRoom(this);

  login = login;
  signup = signup(this);
  load = load(this);
  logout = logout(this);

  // util methods
  buildAliasFromSeed = (roomId: string, collectionKey: CollectionKey) =>
    buildAliasFromSeed(roomId, collectionKey, this.userId);
  getRoom = getRoom(this);
  getCollectionRegistry = getCollectionRegistry(this);

  // collection methods
  getDocumentByRef = getDocumentByRef(this);
  getDocuments = getDocuments(this);

  constructor(optionsPassed?: DatabaseOptions) {
    const options = optionsPassed || {};
    this.baseUrl = options?.baseUrl || 'https://matrix.org';
    if (options.offlineOnly) {
      this.offlineOnly = true;
      this.userId = 'offline-user';
      this.baseUrl = 'offline-user';
    }
    if (!this.offlineOnly) {
      if (options?.webRTCPeers) {
        this.webRtcPeers = options?.webRTCPeers;
      }
      if (options.providers) {
        if (!options.providers.includes('WebRTC')) {
          this.webRtcPeers = [];
          this.useWebRTC = false;
        }
        if (!options.providers.includes('Matrix')) {
          throw new Error('Matrix provider is required');
          // this.useMatrix = false;
        }
        if (!options.providers.includes('IndexedDB')) {
          throw new Error('IndexedDB provider is required');
          // this.useIndexedDB = false;
        }
      }
      pollConnection(this); // start polling for matrix baserUrl server connection status
    }

    if (options?.debug) {
      this.on('debugger', (event) => {
        if (options.debug === true) {
          // eslint-disable-next-line no-console
          console.log(event);
        }
      });
    }
  }
}
