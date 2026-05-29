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
import type { DocumentWithoutBase } from '@eweser/shared';
import type { NewRoomOptions, Room } from './room.js';
import { roomToServerRoom } from './room.js';
import { collections } from './types.js';
import { setupLogger, TypedEventEmitter } from './events.js';

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
const defaultRtcPeers = [
  'wss://signaling.yjs.debv',
  'wss://y-webrtc-signaling-eu.herokuapp.com',
  'wss://y-webrtc-signaling-us.herokuapp.com',
];

export interface DocSeed<T extends CollectionKey = CollectionKey> {
  /** Collection key for the room */
  collectionKey: T;
  /** Room ID (room will be created if it doesn't already exist) */
  roomId: string;
  /** Room name (only used when creating a new room) */
  roomName?: string;
  /** Document ID */
  docId: string;
  /** Document data without auto-generated base fields, typed by collectionKey */
  doc: DocumentWithoutBase<CollectionToDocument[T]>;
}

export interface DatabaseOptions {
  authServer?: string;
  /**
   * 0=debug 1=info, 2=warn, 3=error
   * @default 2
   */
  logLevel?: number;
  /** Which providers to use. By default uses all.
   * Currently indexedDB is required and webRTC and Hocuspocus are optional
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
  /** Optional document seeds: idempotent — documents are only created if they don't already exist */
  seedDocuments?: DocSeed[];
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

  /** Set to false before login so offline-first stays the default until sync is enabled. */
  useSync = false;
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

  /** Seed documents into rooms. Idempotent: existing documents are not overwritten. */
  async seedDocuments(seeds: DocSeed[]) {
    for (const seed of seeds) {
      const roomInCollections =
        this.collections[seed.collectionKey]?.[seed.roomId];
      const roomInRegistry = this.registry.some(
        (r) => r.id === seed.roomId && r.collectionKey === seed.collectionKey
      );
      if (!roomInCollections && !roomInRegistry) {
        this.newRoom<EweDocument>({
          collectionKey: seed.collectionKey,
          name: seed.roomName ?? seed.roomId,
          id: seed.roomId,
        });
      }
    }

    for (const seed of seeds) {
      const room = this.collections[seed.collectionKey]?.[seed.roomId];
      if (!room) {
        this.warn(
          'seedDocuments: room not found',
          seed.collectionKey,
          seed.roomId
        );
        continue;
      }

      if (!room.ydoc) {
        await room.load({ loadRemote: false });
        if (!room.ydoc) {
          this.warn('seedDocuments: failed to load room ydoc', seed.roomId);
          continue;
        }
      }

      const docs = room.getDocuments();
      if (!docs.get(seed.docId)) {
        try {
          // The seed's doc type is guaranteed by DocSeed's generic at call site.
          // Inside heterogeneous iteration over all collection keys, the per-key
          // type information is lost — cast the function rather than the argument
          // to bypass contravariant intersection narrowing.
          (docs.new as (doc: unknown, id?: string) => EweDocument)(
            seed.doc,
            seed.docId
          );
          this.debug(
            'seedDocuments: seeded doc',
            seed.docId,
            'into room',
            seed.roomId
          );
        } catch (err) {
          this.warn(
            'seedDocuments: failed to create document',
            seed.docId,
            err
          );
        }
      }
    }
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
    const loadPromise = this.loadRooms(remainingRegistryRooms);
    if (options.seedDocuments?.length) {
      const seeds = options.seedDocuments;
      loadPromise.then(() => {
        this.seedDocuments(seeds);
      });
    }
    this.pollForRegistrySync();
    this.rollingSync();
    this.emit('initialized');
  }
}
