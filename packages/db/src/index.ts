import type {
  Collection,
  CollectionKey,
  Collections,
  CollectionToDocument,
  EweDocument,
  indexedDBProviderPolyfill,
  ProviderOptions,
  Registry,
} from './types';
import type { NewRoomOptions, Room } from './room';
import { roomToServerRoom } from './room';
import { collections } from './types';
import { setupLogger, TypedEventEmitter } from './events';

import type { UpdateRoomPostBody, UpdateRoomResponse } from '@eweser/shared';
import { collectionKeys, wait } from '@eweser/shared';
import { getDocuments } from './utils/getDocuments';
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
import { refreshYSweetToken } from './methods/connection/refreshYSweetToken';
import { syncRegistry } from './methods/connection/syncRegistry';
import { loadRooms } from './methods/connection/loadRooms';
import type {
  LocalStoragePolyfill,
  LocalStorageService,
} from './utils/localStorageService';
import {
  localStorageGet,
  localStorageRemove,
  localStorageSet,
  setLocalRegistry,
} from './utils/localStorageService';
import { generateShareRoomLink } from './methods/connection/generateShareRoomLink';
import { pingServer } from './utils/connection/pingServer';
import { pollConnection } from './utils/connection/pollConnection';
import { newRoom } from './methods/newRoom';

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
  indexedDBProviderPolyfill?: indexedDBProviderPolyfill;
  /** provide a list of peers to use instead of the default */
  webRTCPeers?: string[];
  initialRooms?: Omit<NewRoomOptions<EweDocument>, 'db'>[];
  /** a polyfill for localStorage for react native apps */
  localStoragePolyfill?: LocalStoragePolyfill;
  pollForStatus?: boolean;
}

export class Database extends TypedEventEmitter<DatabaseEvents> {
  userId = '';
  /* default to the eweser auth server https://www.eweser.com */
  authServer = 'https://www.eweser.com';
  online = false;
  isPolling = false;
  offlineOnly = false;
  /** these rooms will be synced for one second and then disconnected sequentially. Remove the id from this array and the next iteration will not sync that room when it reaches it*/
  collectionKeysForRollingSync: CollectionKey[] = [];

  /** set to false before `db.loginWithToken()` so that offline-first mode is the default, and it upgrades to online sync after login with token */
  useYSweet = false;
  useWebRTC = true;
  useIndexedDB = true;
  indexedDBProviderPolyfill?: indexedDBProviderPolyfill;

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

  getAccessGrantTokenFromUrl = getAccessGrantTokenFromUrl(this);
  getToken = getToken(this);

  refreshYSweetToken = refreshYSweetToken(this);
  /** first loads the local indexedDB ydoc for the room. if this.useYSweet is true and ySweetTokens are available will also connect to remote.
   * @param {RemoteLoadOptions} RemoteLoadOptions - options for loading the remote ydoc
   */
  loadRoom = loadRoom(this);
  loadRooms = loadRooms(this);
  syncRegistry = syncRegistry(this);

  // util methods
  getRegistry = getRegistry(this);
  localStoragePolyfill: LocalStoragePolyfill;
  localStorageService: LocalStorageService = {
    setItem: localStorageSet(this),
    getItem: localStorageGet(this),
    removeItem: localStorageRemove(this),
  };

  // collection methods
  getDocuments = getDocuments(this);
  getRoom = <T extends EweDocument>(
    collectionKey: CollectionKey,
    roomId: string
  ) => {
    return this.collections[collectionKey][roomId] as unknown as Room<T>;
  };
  getRooms<T extends CollectionKey>(
    collectionKey: T
  ): Room<CollectionToDocument[T]>[] {
    return Object.values(this.collections[collectionKey]);
  }

  allRooms() {
    return Object.values(this.collections).flatMap(
      (collection: Collection<any>) => Object.values(collection)
    );
  }

  newRoom = newRoom(this);

  renameRoom = async (room: Room<any>, newName: string) => {
    const body: UpdateRoomPostBody = {
      newName,
    };
    const { data, error } = await this.serverFetch<UpdateRoomResponse>(
      `/access-grant/update-room/${room.id}`,
      {
        method: 'POST',
        body,
      }
    );
    if (error) {
      this.error('Error renaming room', error);
    } else if (data?.name) {
      room.name = data.name;
      this.debug('Room renamed', data);
      const registryEntry = this.registry.find((r) => r.id === room.id);
      if (registryEntry) {
        registryEntry.name = data.name;
        setLocalRegistry(this)(this.registry);
      } else {
        this.error('Error renaming room, registry entry not found');
      }
    }

    return data;
  };

  generateShareRoomLink = generateShareRoomLink(this);
  pingServer = pingServer(this);

  /** Because we can't have more than 10 rooms open (connected to ySweet) at one time, we can do a rollingSync of all rooms where we briefly connect them, one at a time, let them sync and then disconnect */
  async rollingSync() {
    while (true) {
      console.log('rollingSync', this.collectionKeysForRollingSync);

      for (const key of this.collectionKeysForRollingSync) {
        for (const room of this.getRooms(key)) {
          if (room.connectionStatus !== 'disconnected') {
            this.debug(
              'rollingSync skipping room',
              key,
              room.name,
              room.name,
              room.id
            );
            continue;
          }
          this.debug('rollingSync syncing room', key, room.name, room.id);
          await room.load();
          await wait(5000);
          room.disconnect();
        }
      }
      await wait(5000);
    }
  }

  statusListener() {
    const allRooms = this.allRooms();
    const connectedRooms = allRooms
      .filter((r) => r.connectionStatus === 'connected')
      .map((r) => r.id);
    const connectingRooms = allRooms
      .filter((r) => r.connectionStatus === 'connecting')
      .map((r) => r.id);
    this.emit('status', {
      db: this,
      online: this.online,
      hasToken: !!this.accessGrantToken,
      allRoomsCount: allRooms.length,
      connectedRoomsCount: connectedRooms.length,
      connectedRooms,
      connectingRooms,
      connectingRoomsCount: connectingRooms.length,
    });
  }
  /** useful for debugging or less granular event listening */
  pollForStatus(intervalMs = 1000) {
    setInterval(() => {
      this.statusListener();
    }, intervalMs);
  }

  registrySyncIntervalMs = 10000;
  pollForRegistrySync() {
    setInterval(() => {
      this.syncRegistry();
    }, this.registrySyncIntervalMs);
  }

  constructor(optionsPassed?: DatabaseOptions) {
    super();
    if (optionsPassed?.pollForStatus) {
      this.pollForStatus();
    }
    const options = optionsPassed || {};
    this.localStoragePolyfill = options.localStoragePolyfill || localStorage;
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
      pollConnection(this); // start polling for auth server connection status
      if (options?.webRTCPeers) {
        // note that webRtc is only for tempDocs because they are not secure/encrypted yet so we dont want to sync all our long lived yDocs (rooms) with the webRTC peers.
        this.webRtcPeers = options?.webRTCPeers;
      }
    }
    if (typeof options.logLevel === 'number') {
      this.logLevel = options.logLevel;
    }
    setupLogger(this);
    this.debug('Database created with options', options);

    this.registry = this.getRegistry() || [];
    let initializedRooms = [];
    if (options.initialRooms) {
      const registryRoomIds = this.registry.map((r) => r.id);
      for (const room of options.initialRooms) {
        const registryRoom = roomToServerRoom(this.newRoom<any>(room));
        if (room.id && !registryRoomIds.includes(room.id)) {
          this.registry.push(registryRoom);
        }
        initializedRooms.push(registryRoom);
      }
      /** try to load remotes for initial rooms */
      this.loadRooms(initializedRooms, true);
    }
    /** load all rooms in the registry locally */
    this.loadRooms(this.registry);
    this.pollForRegistrySync();
    this.rollingSync();
    this.emit('initialized');
  }
}
