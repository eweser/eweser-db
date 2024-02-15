import type {
  CollectionKey,
  Collections,
  DatabaseEvents,
  ProviderOptions,
} from './types';
import { TypedEventEmitter } from './types';
import { collectionKeys, collections } from './collections';

export * from './utils';

const defaultRtcPeers = [
  'wss://signaling.yjs.dev',
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
  log: DatabaseEvents['log'] = (level, message) => {
    if (level <= this.logLevel) {
      this.emit('log', level, message);
    }
  };

  debug: DatabaseEvents['debug'] = (message) => this.log(0, message);
  info: DatabaseEvents['info'] = (message) => this.log(1, message);
  warn: DatabaseEvents['warn'] = (message) => this.log(2, message);
  error: DatabaseEvents['error'] = (message) => this.log(3, message);

  // connect methods

  // util methods

  // collection methods

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
    this.on('log', (level, message) => {
      switch (level) {
        case 0:
          // eslint-disable-next-line no-console
          console.log(message);
          break;
        case 1:
          // eslint-disable-next-line no-console
          console.info(message);
          break;
        case 2:
          // eslint-disable-next-line no-console
          console.warn(message);
          break;
        case 3:
          // eslint-disable-next-line no-console
          console.error(message);
          break;
      }
    });
  }
}
