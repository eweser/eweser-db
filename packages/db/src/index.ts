import type {
  CollectionKey,
  Collections,
  CollectionToDocument,
  EweDocument,
  ProviderOptions,
  Registry,
  Room,
  YDoc,
} from './types';
import { TypedEventEmitter, collections } from './types';
import type {
  LoginQueryOptions,
  LoginQueryParams,
  RefreshYSweetTokenRouteResponse,
  ServerRoom,
} from '@eweser/shared';

import { collectionKeys, loginOptionsToQueryParams } from '@eweser/shared';
import { initializeDocAndLocalProvider } from './utils/connection/initializeDoc';
import { createYjsProvider } from '@y-sweet/client';
import type { Doc } from 'yjs';
import { getDocuments } from './utils/getDocuments';
import {
  getLocalAccessGrantToken,
  getLocalRegistry,
  setLocalAccessGrantToken,
  setLocalRegistry,
} from './utils/localStorageService';
import { serverFetch } from './utils/connection/serverFetch';
import { logout, logoutAndClear } from './methods/logout';
import { login } from './methods/login';
import type { DatabaseEvents } from './methods/log';
import { log } from './methods/log';

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

  // methods

  // logger/event emitter
  logLevel = 2;
  log = log(this);
  debug: DatabaseEvents['debug'] = (...message) => this.log(0, ...message);
  info: DatabaseEvents['info'] = (...message) => this.log(1, ...message);
  warn: DatabaseEvents['warn'] = (...message) => this.log(2, ...message);
  error: DatabaseEvents['error'] = (...message) => this.log(3, message);

  // connect methods

  serverFetch = serverFetch(this);

  /**
   *
   * @param redirect default uses window.location
   * @param appDomain default uses window.location.hostname
   * @param collections default 'all', which collections your app would like to have write access to
   * @returns a string you can use to redirect the user to the auth server's login page
   */
  generateLoginUrl = (
    options: Partial<LoginQueryOptions> & { name: string }
  ): string => {
    const url = new URL(this.authServer);

    const params: LoginQueryParams = loginOptionsToQueryParams({
      redirect: options?.redirect || window.location.href,
      domain: options?.domain || window.location.host,
      collections: options?.collections ?? ['all'],
      name: options.name,
    });
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    return url.toString();
  };

  getAccessGrantTokenFromUrl = () => {
    const query = new URLSearchParams(window?.location?.search ?? '');
    const token = query.get('token');
    if (token && typeof token === 'string') {
      setLocalAccessGrantToken(token);
    }
    // remove from url
    if (window?.location?.search) {
      const url = new URL(window.location.href);
      for (const key of url.searchParams.keys()) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, '', url.toString());
    }
    return token;
  };

  getToken = () => {
    if (this.accessGrantToken) {
      return this.accessGrantToken;
    }
    const savedToken = getLocalAccessGrantToken();
    if (savedToken) {
      this.accessGrantToken = savedToken;
      return savedToken;
    }
    const urlToken = this.getAccessGrantTokenFromUrl();
    if (urlToken) {
      this.accessGrantToken = urlToken;
      return urlToken;
    }
    return null;
  };

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

  login = login(this);
  logout = logout(this);
  logoutAndClear = logoutAndClear(this);

  getRegistry = () => {
    if (this.registry.length > 0) {
      return this.registry;
    } else {
      const localRegistry = getLocalRegistry();
      if (localRegistry) {
        this.registry = localRegistry;
      }
      return this.registry;
    }
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

  /** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote. */
  loadRoom = async (room: ServerRoom) => {
    if (!room) {
      throw new Error('room is required');
    }
    this.info('loading room', room);
    const { id: roomId, ySweetUrl, token, collectionKey } = room;
    if (!roomId) {
      throw new Error('roomId is required');
    }
    const existingRoom = this.collections[collectionKey][roomId];
    let ydoc = existingRoom?.ydoc;
    let indexeddbProvider = existingRoom?.indexeddbProvider;

    if (!ydoc || !indexeddbProvider) {
      const { ydoc: newYDoc, localProvider } =
        await initializeDocAndLocalProvider(roomId);

      ydoc = newYDoc;
      indexeddbProvider = localProvider;
      this.debug('initialized ydoc and localProvider', ydoc, indexeddbProvider);
    }

    let ySweetProvider = existingRoom?.ySweetProvider;
    if (!ySweetProvider && token && ySweetUrl && this.useYSweet) {
      ySweetProvider = createYjsProvider(ydoc as Doc, {
        url: ySweetUrl,
        token,
        docId: roomId,
      });

      ydoc = ySweetProvider.doc as YDoc<any>;
      ySweetProvider.on('status', (status: any) => {
        this.emit('roomConnectionChange', existingRoom, status);
        // this.debug('ySweetProvider status', status);
      });
      ySweetProvider.on('connection-error', async (error: any) => {
        this.error('ySweetProvider error', error);
        this.emit('roomConnectionChange', existingRoom, 'disconnected');

        await this.refreshYSweetToken(this.collections[collectionKey][roomId]);
      });
      ySweetProvider.on('sync', (synced: boolean) => {
        this.emit(
          'roomConnectionChange',
          existingRoom,
          synced ? 'connected' : 'disconnected'
        );

        this.debug('ySweetProvider synced', synced);
      });
      this.debug('created ySweetProvider', ySweetProvider);
      ySweetProvider.connect();
    }

    if (
      existingRoom &&
      existingRoom.ydoc &&
      existingRoom.indexeddbProvider &&
      existingRoom.ySweetProvider &&
      existingRoom.token === token
    ) {
      this.debug('room already loaded', existingRoom);
      return existingRoom;
    }

    const loadedRoom = (this.collections[collectionKey][roomId] = {
      ...room,
      indexeddbProvider,
      webRtcProvider: null,
      ySweetProvider,
      ydoc,
    });
    this.emit('roomLoaded', loadedRoom);
    return loadedRoom;
  };

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
