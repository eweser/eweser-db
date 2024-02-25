import type {
  CollectionKey,
  Collections,
  DatabaseEvents,
  Document,
  ProviderOptions,
  Registry,
  Room,
  YDoc,
} from './types';
import { TypedEventEmitter, collections } from './types';
import type {
  LoginQueryOptions,
  LoginQueryParams,
  ServerRoom,
} from '@eweser/shared';

import { collectionKeys } from '@eweser/shared';
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
  authServer = 'https://eweser.com';
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
  log: DatabaseEvents['log'] = (level, ...message) => {
    if (level <= this.logLevel) {
      this.emit('log', level, ...message);
    }
  };

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
    const params: LoginQueryParams = {
      redirect: options?.redirect || window.location.href,
      domain: options?.domain || window.location.host,
      collections: options?.collections ? options.collections.join('|') : 'all',
      name: options.name,
    };
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

  // deprecated for now by syncRegistry
  // getRoomsWithAccessGrantToken = async (token: string) => {
  //   const { data: rooms } = await this.serverFetch<Registry>(
  //     '/access-grant/get-rooms',
  //     { method: 'POST', body: { token } }
  //   );

  //   this.debug('got rooms with access grant token', rooms);
  //   if (rooms && rooms.length > 0) {
  //     setLocalRegistry(rooms);
  //   }
  //   return rooms;
  // };

  login = async () => {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }
    const syncResult = await this.syncRegistry();
    if (!syncResult) {
      throw new Error('Failed to sync registry');
    }
    this.useYSweet = true;
    this.online = true;
    await this.loadRooms(this.registry); // connects the ySweet providers. Again, could make this more atomic in the future to avoid creating too many connections.
    return true;
  };

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
    this.info('loading room', room);
    const { id: roomId, ySweetUrl, token: ySweetToken, collectionKey } = room;
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
    if (!ySweetProvider && ySweetToken && ySweetUrl && this.useYSweet) {
      try {
        const provider = createYjsProvider(ydoc as Doc, {
          url: ySweetUrl,
          token: ySweetToken,
          docId: roomId,
        });
        if (provider) {
          ySweetProvider = provider;
          ydoc = provider.doc as YDoc<any>;
          provider.on('status', (status: any) => {
            this.debug('ySweetProvider status', status);
          });
          provider.on('sync', (synced: any) => {
            this.debug('ySweetProvider synced', synced);
          });
          this.debug('created ySweetProvider', ySweetProvider);
          provider.connect();
        }
      } catch (error) {
        this.error(error);
      }
    }

    if (
      existingRoom &&
      existingRoom.ydoc &&
      existingRoom.indexeddbProvider &&
      existingRoom.ySweetProvider &&
      existingRoom.token === ySweetToken
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
  getRoom = <T extends Document>(
    collectionKey: CollectionKey,
    roomId: string
  ) => {
    return this.collections[collectionKey][roomId] as Room<T>;
  };
  newRoom = <_T extends Document>() => {
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
