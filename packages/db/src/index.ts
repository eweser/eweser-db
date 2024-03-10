import type {
  CollectionKey,
  Collections,
  CollectionToDocument,
  EweDocument,
  ProviderOptions,
  Registry,
  Room,
} from './types';
import { collections } from './types';
import { TypedEventEmitter } from './events';
import type { RefreshYSweetTokenRouteResponse } from '@eweser/shared';

import { collectionKeys } from '@eweser/shared';
import { getDocuments } from './utils/getDocuments';
import {
  setLocalAccessGrantToken,
  setLocalRegistry,
} from './utils/localStorageService';
import { serverFetch } from './utils/connection/serverFetch';
import { logout, logoutAndClear } from './methods/connection/logout';
import { login } from './methods/connection/login';
import type { DatabaseEvents } from './events';
import { log } from './methods/log';
import { generateLoginUrl } from './methods/connection/generateLoginUrl';
import { getAccessGrantTokenFromUrl } from './methods/connection/getAccessGrantTokenFromUrl';
import { getToken } from './methods/connection/getToken';
import { getRegistry } from './methods/getRegistry';
import { loadRoom } from './methods/connection/loadRoom';

export * from './utils';
export * from './types';

const defaultRtcPeers = [
  'wss://signaling.yjs.debv',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

export interface DatabaseOptions {
  authServer?: string;
  /**
   * 0=debug 1=info, 2=warn, 3=error
   * @default 2
   */
  logLevel?: number;
  /** Which providers to use. By default uses all.
   * Currently indexedDB is required and webRTC and YSweet are optional
   * Setting only indexedDB will make the database offline only
   */
  providers?: ProviderOptions[];
  /** provide a list of peers to use instead of the default */
  webRTCPeers?: string[];
  initialRooms?: Registry;
}
export class Database extends TypedEventEmitter<DatabaseEvents> {
  userId = '';
  authServer = 'https://www.eweser.com';
  online = false;
  offlineOnly = false;

  /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
  useYSweet = false;
  useWebRTC = true;
  useIndexedDB = true;

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = collections;
  registry: Registry = [];
  accessGrantToken = '';

  webRtcPeers: string[] = defaultRtcPeers;

  // METHODS

  // logger/event emitter
  logLevel = 2;
  log = log(this);
  debug: DatabaseEvents['debug'] = (...message) => this.log(0, ...message);
  info: DatabaseEvents['info'] = (...message) => this.log(1, ...message);
  warn: DatabaseEvents['warn'] = (...message) => this.log(2, ...message);
  error: DatabaseEvents['error'] = (...message) => this.log(3, message);

  // CONNECT METHODS

  serverFetch = serverFetch(this);
  generateLoginUrl = generateLoginUrl(this);
  login = login(this);
  logout = logout(this);
  logoutAndClear = logoutAndClear(this);

  getAccessGrantTokenFromUrl = getAccessGrantTokenFromUrl();
  getToken = getToken(this);

  refreshYSweetToken = async (room: Room<any>): Promise<string | undefined> => {
    const { data: refresh } =
      await this.serverFetch<RefreshYSweetTokenRouteResponse>(
        `/access-grant/refresh-y-sweet-token/${room.id}`
      );

    if (refresh?.token && refresh.ySweetUrl) {
      room.ySweetProvider = null; // calling loadRoom with a null ySweetProvider will create a new one
      await this.loadRoom(room);
      // this.emit('roomReconnected', loadedRoom);
    }
    return refresh?.token;
  };
  loadRoom = loadRoom(this);

  loadRooms = async (rooms: Registry) => {
    const loadedRooms = [];
    this.debug('loading rooms', rooms);
    for (const room of rooms) {
      const loadedRoom = await this.loadRoom(room);
      loadedRooms.push(loadedRoom);
    }
    this.debug('loaded rooms', loadedRooms);
    this.emit('roomsLoaded', loadedRooms);
  };
  /** sends the registry to the server to check for additions/subtractions on either side */
  syncRegistry = async () => {
    // packages/auth-server/src/app/access-grant/sync-registry/route.ts
    type RegistrySyncRequestBody = {
      token: string;
      rooms: Registry;
    };
    const body: RegistrySyncRequestBody = {
      token: this.getToken() ?? '',
      rooms: this.registry,
    };
    if (!body.token) {
      return false;
    }
    const { data: syncResult } =
      await this.serverFetch<RegistrySyncRequestBody>(
        '/access-grant/sync-registry',
        { method: 'POST', body }
      );

    this.info('syncResult', syncResult);

    const { rooms, token } = syncResult ?? {};
    if (token && typeof token === 'string') {
      this.debug('setting new token', token);
      setLocalAccessGrantToken(token);
      this.accessGrantToken = token;
    } else {
      return false;
    }

    if (
      rooms &&
      typeof rooms === 'object' &&
      Array.isArray(rooms) &&
      rooms.length >= 2
    ) {
      this.debug('setting new rooms', rooms);
      setLocalRegistry(rooms);
      this.registry = rooms;
    } else {
      return false;
    }

    return true;
  };

  getRegistry = getRegistry(this);

  // util methods

  // collection methods
  getDocuments = getDocuments(this);
  getRoom = <T extends EweDocument>(
    collectionKey: CollectionKey,
    roomId: string
  ) => {
    return this.collections[collectionKey][roomId] as Room<T>;
  };
  getRooms<T extends CollectionKey>(
    collectionKey: T
  ): Room<CollectionToDocument[T]>[] {
    return Object.values(this.collections[collectionKey]);
  }
  newRoom = <_T extends EweDocument>() => {
    //TODO: implement newRoom
    // remember that new rooms must be added to the registry and then synced with the auth server
    if (this.online) {
      this.syncRegistry(); // locally added rooms need to be synced to the auth server.
      // if currently offline and doesnt sync here, it should sync when the room is connected
    }
  };

  constructor(optionsPassed?: DatabaseOptions) {
    super();
    const options = optionsPassed || {};
    if (options.authServer) {
      this.authServer = options.authServer;
    }
    if (options.providers) {
      if (!options.providers.includes('WebRTC')) {
        this.webRtcPeers = [];
        this.useWebRTC = false;
      }
      if (options.providers.includes('YSweet')) {
        this.useYSweet = true;
      }
      if (!options.providers.includes('IndexedDB')) {
        // need to have at least one provider, the local storage provider
        throw new Error('IndexedDB provider is required');
        // this.useIndexedDB = false;
      }
    }

    if (
      options.providers?.length &&
      options.providers?.length === 1 &&
      options.providers[0] === 'IndexedDB'
    ) {
      this.offlineOnly = true;
    } else {
      // pollConnection(this); // start polling for auth server connection status
      if (options?.webRTCPeers) {
        // note that webRtc is only for tempDocs because they are not secure/encrypted yet so we dont want to sync all our long lived yDocs (rooms) with the webRTC peers.
        this.webRtcPeers = options?.webRTCPeers;
      }
    }

    if (options.logLevel) {
      this.logLevel = options.logLevel;
    }
    this.on('log', (level, ...message) => {
      switch (level) {
        case 0:
          // eslint-disable-next-line no-console
          return console.info(...message);
        case 1:
          // eslint-disable-next-line no-console
          return console.log(...message);
        case 2:
          // eslint-disable-next-line no-console
          return console.warn(...message);
        case 3:
          // eslint-disable-next-line no-console
          return console.error(...message);
      }
    });
    this.debug('Database created with options', options);

    this.registry = this.getRegistry() || [];

    if (options.initialRooms) {
      const registryRoomIds = this.registry.map((r) => r.id);
      for (const room of options.initialRooms) {
        if (registryRoomIds.includes(room.id)) {
          continue;
        }
        this.registry.push(room);
      }
    }

    // For now load all registry rooms on start, but in the future might need to change this to limit how many ySweet connections are created on start.
    this.loadRooms(this.registry);
  }
}
