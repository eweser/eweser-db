import type { CollectionKey, EweDocument, ServerRoom } from '@eweser/shared';
import type { YSweetProvider } from '@y-sweet/client';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { WebrtcProvider } from 'y-webrtc';
import type { RoomEvents } from './events';
import { TypedEventEmitter } from './events';
import type { Database, YDoc } from '.';
import type { GetDocuments } from './utils/getDocuments';
import { getDocuments } from './utils/getDocuments';
import { loadYSweet } from './methods/connection/loadRoom';

export type NewRoomOptions<T extends EweDocument> = {
  db: Database;
  name: string;
  collectionKey: CollectionKey;
  id?: string;
  tokenExpiry?: string | null;
  ySweetUrl?: string | null;
  ySweetBaseUrl?: string | null;
  publicAccess?: 'private' | 'read' | 'write';
  readAccess?: string[];
  writeAccess?: string[];
  adminAccess?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
  _deleted?: boolean | null;
  _ttl?: string | null;
  indexedDbProvider?: IndexeddbPersistence | null;
  webRtcProvider?: WebrtcProvider | null;
  ySweetProvider?: YSweetProvider | null;
  ydoc?: YDoc<T> | null;
};

export class Room<T extends EweDocument>
  extends TypedEventEmitter<RoomEvents<T>>
  implements ServerRoom
{
  db: Database;
  name: string;
  collectionKey: CollectionKey;
  id: string;
  tokenExpiry: string | null;
  ySweetUrl: string | null;
  ySweetBaseUrl: string | null;
  publicAccess: 'private' | 'read' | 'write';
  readAccess: string[];
  writeAccess: string[];
  adminAccess: string[];
  createdAt: string | null;
  updatedAt: string | null;
  _deleted: boolean | null;
  _ttl: string | null;

  indexedDbProvider?: IndexeddbPersistence | null;
  webRtcProvider?: WebrtcProvider | null;
  ySweetProvider?: YSweetProvider | null;
  ydoc?: YDoc<T> | null;

  connectionRetries = 0;

  disconnect = () => {
    this.ySweetProvider?.disconnect();
    this.webRtcProvider?.disconnect();
    this.emit('roomConnectionChange', 'disconnected', this);
  };

  getDocuments: () => GetDocuments<T>;
  load: () => Promise<Room<T>>;
  /** disconnect and reconnect the existing ySweetProvider, this time with awareness on */
  addAwareness = async () => {
    if (this.ySweetProvider?.awareness) {
      return;
    }
    this.ySweetProvider?.disconnect();
    this.ySweetProvider?.destroy();
    this.ySweetProvider = null;
    await loadYSweet(this.db, this, true, true);
  };

  constructor(options: NewRoomOptions<T>) {
    super();
    this.db = options.db;
    this.name = options.name;
    this.collectionKey = options.collectionKey;
    this.id = options.id || crypto.randomUUID();
    this.tokenExpiry = options.tokenExpiry ?? null;
    this.ySweetUrl = options.ySweetUrl ?? null;
    this.ySweetBaseUrl = options.ySweetBaseUrl ?? null;
    this.publicAccess = options.publicAccess ?? 'private';
    this.readAccess = options.readAccess ?? [];
    this.writeAccess = options.writeAccess ?? [];
    this.adminAccess = options.adminAccess ?? [];
    this.createdAt = options.createdAt ?? new Date().toISOString();
    this.updatedAt = options.updatedAt ?? new Date().toISOString();
    this._deleted = options._deleted ?? false;
    this._ttl = options._ttl ?? null;

    if (options.indexedDbProvider) {
      this.indexedDbProvider = options.indexedDbProvider;
    }
    if (options.webRtcProvider) {
      this.webRtcProvider = options.webRtcProvider;
    }
    if (options.ySweetProvider) {
      this.ySweetProvider = options.ySweetProvider;
    }
    if (options.ydoc) {
      this.ydoc = options.ydoc;
    }

    this.getDocuments = () => getDocuments(this.db)(this);
    this.load = () => this.db.loadRoom(this);
  }
}

export function roomToServerRoom(room: Room<any>): ServerRoom {
  return {
    id: room.id,
    name: room.name,
    collectionKey: room.collectionKey,
    tokenExpiry: room.tokenExpiry,
    ySweetUrl: room.ySweetUrl,
    ySweetBaseUrl: room.ySweetBaseUrl,
    publicAccess: room.publicAccess,
    readAccess: room.readAccess,
    writeAccess: room.writeAccess,
    adminAccess: room.adminAccess,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    _deleted: room._deleted,
    _ttl: room._ttl,
  };
}
