import type {
  CollectionKey,
  Collections,
  CollectionToDocument,
  EweDocument,
  ProviderOptions,
  Registry,
} from './types';
import { Room, roomToServerRoom } from './room';
import { collections } from './types';
import { setupLogger, TypedEventEmitter } from './events';

import type {
  CreateRoomInviteBody,
  CreateRoomInviteResponse,
  LoginQueryOptions,
  RoomAccessType,
} from '@eweser/shared';
import { collectionKeys, loginOptionsToQueryParams } from '@eweser/shared';
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
import { setLocalRegistry } from './utils/localStorageService';

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

  refreshYSweetToken = refreshYSweetToken(this);
  loadRoom = loadRoom(this);
  loadRooms = loadRooms(this);
  syncRegistry = syncRegistry(this);

  // util methods
  getRegistry = getRegistry(this);

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
  /**
   * new rooms must be added to the registry and then synced with the auth server
   * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
   */
  newRoom = <T extends EweDocument>(options: Room<T>) => {
    const room = new Room(options);
    this.collections[room.collectionKey][room.id] = room;
    const serverRoom = roomToServerRoom(room);
    this.registry.push(serverRoom);
    setLocalRegistry(this.registry);
    if (this.online) {
      this.syncRegistry();
    } else {
      // const online = checkOnline();
      // if(online){
      //   this.syncRegistry()
      // }
    }
  };

  generateShareRoomLink = async ({
    roomId,
    invitees,
    redirectUrl,
    redirectQueries,
    expiry,
    accessType,
    appName,
    domain,
    collections,
  }: Partial<LoginQueryOptions> & {
    roomId: string;
    invitees?: string[];
    redirectUrl?: string;
    redirectQueries?: Record<string, string>;
    expiry?: string;
    accessType: RoomAccessType;
    appName: string;
  }) => {
    const body: CreateRoomInviteBody = {
      roomId,
      invitees: invitees || [],
      redirectQueries,
      expiry:
        expiry || new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      accessType,
      ...loginOptionsToQueryParams({
        name: appName,
        domain: domain || window.location.host,
        collections: collections ?? ['all'],
        redirect: redirectUrl || window.location.href.split('?')[0],
      }),
    };
    const { error, data } = await this.serverFetch<CreateRoomInviteResponse>(
      '/access-grant/create-room-invite',
      {
        body,
        method: 'POST',
      }
    );
    if (error) {
      this.error('Error creating room invite', error);
      return JSON.stringify(error);
    }
    if (!data?.link) {
      return 'Error creating room invite';
    }

    return data.link;
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

    setupLogger(this, options.logLevel);
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
