import type {
  CollectionKey,
  Collections,
  DatabaseEvents,
  ProviderOptions,
  RoomRegistryEntry,
} from './types';
import { TypedEventEmitter } from './types';
import { collectionKeys, collections } from './collections';
import { initializeDocAndLocalProvider } from './utils/connection/initializeDoc';
import { createYjsProvider } from '@y-sweet/client';
import type { Doc } from 'yjs';
import { getDocuments } from './utils/getDocuments';

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
  initialRooms?: RoomRegistryEntry[];
}

export class Database extends TypedEventEmitter<DatabaseEvents> {
  userId = '';
  authServer = 'https://eweser.com';
  online = false;
  offlineOnly = false;

  useYSweet = true;
  useWebRTC = true;
  useIndexedDB = true;

  collectionKeys: CollectionKey[] = collectionKeys;
  collections: Collections = collections;

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
  getRoomsWithAccessGrantToken = async (token: string) => {
    const rooms = await fetch(`${this.authServer}/access-grant/get-rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }).then((res) => res.json());
    this.debug('got rooms with access grant token', rooms);
  };

  loadRoom = async (room: RoomRegistryEntry) => {
    this.info('loading room', room);
    const { roomId, ySweetUrl, ySweetToken, collectionKey } = room;
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
          provider.on('status', (status: any) => {
            this.debug('ySweetProvider status', status);
          });
          this.debug('created ySweetProvider', ySweetProvider);
        }
      } catch (error) {
        this.error(error);
      }
    }

    if (
      existingRoom &&
      existingRoom.ydoc &&
      existingRoom.indexeddbProvider &&
      existingRoom.ySweetProvider
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

  loadRooms = async (rooms: RoomRegistryEntry[]) => {
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
      if (!options.providers.includes('YSweet')) {
        this.useYSweet = false;
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
          console.info(...message);
          break;
        case 1:
          // eslint-disable-next-line no-console
          console.log(...message);
          break;
        case 2:
          // eslint-disable-next-line no-console
          console.warn(...message);
          break;
        case 3:
          // eslint-disable-next-line no-console
          console.error(...message);
          break;
      }
    });
    this.debug('Database created with options', options);

    // check the local storage for the room registry, if not, create a blank one.

    // lets just try getting the ysweet connection working first and worry about indexeddb later
    // also just use passed in rooms for now and worry about getting and storing the registry later. that should let me be able to use the app in the auth server's page without having to request an access_grant.
    if (options.initialRooms) {
      this.loadRooms(options.initialRooms);
    }
  }
}
