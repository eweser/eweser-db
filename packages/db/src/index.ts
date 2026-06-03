/**
 * Purpose: Public SDK entry point for local-first database clients.
 * Exports: Database, SDK types, and utility re-exports.
 * Touches: Room loading, auth-server calls, local persistence, and sync setup.
 * Read before editing: packages/db/INDEX.md and packages/db/AGENTS.md.
 */
import type {
  CollectionKey,
  Collections,
  CollectionToDocument,
  EweDocument,
  indexedDBProviderPolyfill,
  ProviderOptions,
  Registry,
} from './types.js';
import type { NewRoomOptions, Room } from './room.js';
import { roomToServerRoom } from './room.js';
import { collections } from './types.js';
import { setupLogger, TypedEventEmitter } from './events.js';
import type { SeedDocuments } from './utils/seedRoom.js';

import { collectionKeys, wait } from '@eweser/shared';
import { getDocuments } from './utils/getDocuments.js';
import { serverFetch } from './utils/connection/serverFetch.js';
import { logout, logoutAndClear } from './methods/connection/logout.js';
import { login } from './methods/connection/login.js';
import type { DatabaseEvents } from './events.js';
import { log } from './methods/log.js';
import { generateLoginUrl } from './methods/connection/generateLoginUrl.js';
import { getAccessGrantTokenFromUrl } from './methods/connection/getAccessGrantTokenFromUrl.js';
import { getToken } from './methods/connection/getToken.js';
import { getRegistry } from './methods/getRegistry.js';
import { loadRoom } from './methods/connection/loadRoom.js';
import { refreshSyncToken } from './methods/connection/refreshSyncToken.js';
import { syncRegistry } from './methods/connection/syncRegistry.js';
import { loadRooms } from './methods/connection/loadRooms.js';
import type {
  LocalStoragePolyfill,
  LocalStorageService,
} from './utils/localStorageService.js';
import {
  localStorageGet,
  localStorageRemove,
  localStorageSet,
} from './utils/localStorageService.js';
import { generateShareRoomLink } from './methods/connection/generateShareRoomLink.js';
import { pingServer } from './utils/connection/pingServer.js';
import { pollConnection } from './utils/connection/pollConnection.js';
import { newRoom } from './methods/newRoom.js';
import { renameRoom } from './methods/renameRoom.js';

export * from './utils/index.js';
export * from './utils/files.js';
export * from './utils/backup.js';
export * from './types.js';

export interface DatabaseOptions {
  authServer?: string;
  /**
   * 0=debug 1=info, 2=warn, 3=error
   * @default 2
   */
  logLevel?: number;
  /** Which providers to use. By default uses all.
   * Currently indexedDB is required and Hocuspocus is optional
   * Setting only indexedDB will make the database offline only
   */
  providers?: ProviderOptions[];
  indexedDBProviderPolyfill?: indexedDBProviderPolyfill;
  initialRooms?: Omit<NewRoomOptions<EweDocument>, 'db'>[];
  /** a polyfill for localStorage for react native apps */
  localStoragePolyfill?: LocalStoragePolyfill;
  pollForStatus?: boolean;
  /**
   * Documents or a seed callback to populate rooms on their first load.
   * Only applied when a room has no existing documents (idempotent across
   * reloads and reconnects). Room-level `initialDocuments` takes priority.
   * Use when `initialRooms` alone is not enough — e.g. offline-first apps
   * that need pre-populated data before sync is available.
   */
  initialDocuments?: SeedDocuments<EweDocument>;
}

export class Database extends TypedEventEmitter<DatabaseEvents> {
  userId = '';
  /* default to the eweser auth server https://www.eweser.com */
  authServer = 'https://www.eweser.com';
  online = false;
  isPolling = false;
  offlineOnly = false;
  /** @internal Documents or seed callback from DatabaseOptions, applied to rooms on first load. */
  _initialDocuments?: SeedDocuments<EweDocument> | null;
  /** these rooms will be synced for one second and then disconnected sequentially. Remove the id from this array and the next iteration will not sync that room when it reaches it*/
  collectionKeysForRollingSync: CollectionKey[] = [];

  /** Set to false before login so offline-first stays the default until sync is enabled. */
  useSync = false;
  useIndexedDB = true;
  indexedDBProviderPolyfill?: indexedDBProviderPolyfill;

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = collections;
  registry: Registry = [];
  accessGrantToken = '';

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

  refreshSyncToken = refreshSyncToken(this);
  /** First loads the local indexedDB ydoc for the room. If sync is enabled and room sync details are available it also connects remotely.
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
    return Object.values(this.collections).flatMap((collection) =>
      Object.values(collection)
    ) as Array<Room<EweDocument>>;
  }

  newRoom = newRoom(this);
  renameRoom = renameRoom(this);

  generateShareRoomLink = generateShareRoomLink(this);
  pingServer = pingServer(this);

  /** Connect a limited set of rooms sequentially so background sync does not flood the sync server. */
  async rollingSync() {
    while (true) {
      this.debug('--- rollingSync ---');
      if (this.online) {
        for (const key of this.collectionKeysForRollingSync) {
          for (const room of this.getRooms(key)) {
            this.debug('rollingSync room', room.name, room.connectionStatus);
            if (room.connectionStatus !== 'disconnected') {
              this.debug(
                'rollingSync skipping room',
                key,
                room.name,
                room.connectionStatus
              );
              continue;
            }
            this.debug(
              'rollingSync syncing room',
              key,
              room.name,
              room.connectionStatus
            );
            room.disconnect();
            await room.load({ loadRemote: true, awaitLoadRemote: true });
            this.debug('rollingSync room', room.name, room.connectionStatus);
            await wait(5000);
            room.disconnect();
          }
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
      if (options.providers.includes('Hocuspocus')) {
        this.useSync = true;
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
    }
    if (typeof options.logLevel === 'number') {
      this.logLevel = options.logLevel;
    }
    this._initialDocuments = options.initialDocuments ?? null;
    setupLogger(this);
    this.debug('Database created with options', options);

    this.registry = this.getRegistry() || [];
    const initializedRooms: Registry = [];
    if (options.initialRooms) {
      const registryRoomIds = this.registry.map((r) => r.id);
      for (const room of options.initialRooms) {
        const registryRoom = roomToServerRoom(this.newRoom<EweDocument>(room));
        if (room.id && !registryRoomIds.includes(room.id)) {
          this.registry.push(registryRoom);
        }
        initializedRooms.push(registryRoom);
      }
      /** try to load remotes for initial rooms */
      this.loadRooms(initializedRooms, true);
    }
    /** load all rooms in the registry locally, skipping any already handled above */
    const initializedRoomIds = new Set(initializedRooms.map((r) => r.id));
    const remainingRegistryRooms = this.registry.filter(
      (r) => !initializedRoomIds.has(r.id)
    );
    this.loadRooms(remainingRegistryRooms);
    this.pollForRegistrySync();
    this.rollingSync();
    this.emit('initialized');
  }
}
