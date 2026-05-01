/**
 * Purpose: Room model for client-side document storage and sync providers.
 * Exports: Room class and room option types.
 * Touches: Yjs docs, IndexedDB, WebRTC, Hocuspocus sync, and access grants.
 * Read before editing: packages/db/src/INDEX.md and packages/db/AGENTS.md.
 */
import type { CollectionKey, EweDocument, ServerRoom } from '@eweser/shared';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { WebrtcProvider } from 'y-webrtc';
import type { RoomConnectionStatus, RoomEvents } from './events.js';
import { TypedEventEmitter } from './events.js';
import type { Database, YDoc } from './index.js';
import type { GetDocuments } from './utils/getDocuments.js';
import { getDocuments } from './utils/getDocuments.js';
import type { RemoteLoadOptions } from './methods/connection/loadRoom.js';
import { loadSync } from './methods/connection/loadRoom.js';

export type NewRoomOptions<T extends EweDocument> = {
  db: Database;
  name: string;
  collectionKey: CollectionKey;
  id?: string;
  tokenExpiry?: string | null;
  syncUrl?: string | null;
  syncToken?: string | null;
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
  syncProvider?: HocuspocusProvider | null;
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
  syncUrl: string | null;
  syncToken: string | null;
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
  syncProvider?: HocuspocusProvider | null;
  ydoc?: YDoc<T> | null;

  connectionRetries = 0;
  connectionStatus: RoomConnectionStatus = 'disconnected';
  connectAbortController?: AbortController;

  disconnect = () => {
    this.syncProvider?.disconnect();
    this.webRtcProvider?.disconnect();
    this.emit('roomConnectionChange', 'disconnected', this);
  };

  getDocuments: () => GetDocuments<T>;
  load: (remoteLoadOptions?: RemoteLoadOptions) => Promise<Room<T>>;

  addingAwareness = false;
  /** Disconnect and reconnect the existing sync provider, this time with awareness on. */
  addAwareness = async () => {
    if (this.addingAwareness || this.syncProvider?.awareness) {
      return;
    }
    this.addingAwareness = true;
    this.syncProvider?.disconnect();
    this.syncProvider?.destroy();
    this.syncProvider = null;
    await loadSync(this.db, this as unknown as Room<EweDocument>, true, true);
    this.addingAwareness = false;
  };

  constructor(options: NewRoomOptions<T>) {
    super();
    this.db = options.db;
    this.name = options.name;
    this.collectionKey = options.collectionKey;
    this.id = options.id || crypto.randomUUID();
    this.tokenExpiry = options.tokenExpiry ?? null;
    this.syncUrl = options.syncUrl ?? null;
    this.syncToken = options.syncToken ?? null;
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
    if (options.syncProvider) {
      this.syncProvider = options.syncProvider;
    }
    if (options.ydoc) {
      this.ydoc = options.ydoc;
    }

    this.getDocuments = () => getDocuments(this.db)(this);
    this.load = async (remoteLoadOptions?: RemoteLoadOptions) =>
      (await this.db.loadRoom(
        this as unknown as Room<EweDocument>,
        remoteLoadOptions
      )) as unknown as Room<T>;
  }
}

export function roomToServerRoom<T extends EweDocument>(
  room: Room<T>
): ServerRoom {
  return {
    id: room.id,
    name: room.name,
    collectionKey: room.collectionKey,
    tokenExpiry: room.tokenExpiry,
    syncUrl: room.syncUrl,
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
