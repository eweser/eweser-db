/**
 * Purpose: Room model for client-side document storage and sync providers.
 * Exports: Room class and room option types.
 * Touches: Yjs docs, IndexedDB, Hocuspocus sync, and access grants.
 * Read before editing: packages/db/src/INDEX.md and packages/db/AGENTS.md.
 */
import type {
  CollectionKey,
  EweDocument,
  ServerRoom,
  RoomEncryptionMetadata,
} from '@eweser/shared';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { RoomConnectionStatus, RoomEvents } from './events.js';
import { TypedEventEmitter } from './events.js';
import type { Database, YDoc } from './index.js';
import type { GetDocuments } from './utils/getDocuments.js';
import { getDocuments } from './utils/getDocuments.js';
import type { RemoteLoadOptions } from './methods/connection/loadRoom.js';
import { loadSync } from './methods/connection/loadRoom.js';
import { RoomCrypto } from './utils/roomCrypto.js';
import type { SeedDocuments } from './utils/seedTypes.js';

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
  syncProvider?: HocuspocusProvider | null;
  ydoc?: YDoc<T> | null;
  /** Room encryption metadata. When set, the room uses E2EE. */
  encryption?: RoomEncryptionMetadata | null;
  /**
   * Documents to seed into this room on first load.
   * Only applied when the room has no existing documents (idempotent).
   * Takes priority over the database-level `initialDocuments` option.
   */
  initialDocuments?: SeedDocuments<T>;
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

  /** Room encryption metadata (null for non-encrypted rooms). */
  encryption: RoomEncryptionMetadata | null;

  /** Client-side crypto unlock/lock state. Never serialized. */
  private _crypto: RoomCrypto;

  indexedDbProvider?: IndexeddbPersistence | null;
  syncProvider?: HocuspocusProvider | null;
  ydoc?: YDoc<T> | null;
  /** @internal Seed documents config carried through the load lifecycle. */
  _initialDocuments?: SeedDocuments<T> | null;

  connectionRetries = 0;
  /** Track auth-failure retries so we never loop indefinitely. */
  authRetryCount = 0;
  connectionStatus: RoomConnectionStatus = 'disconnected';
  connectAbortController?: AbortController;

  disconnect = () => {
    this.syncProvider?.disconnect();
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

  // -----------------------------------------------------------------------
  // Encryption API (per ADR-0011)
  // -----------------------------------------------------------------------

  /** Whether the room key is currently available for encrypt/decrypt. */
  get isUnlocked(): boolean {
    return this._crypto.isUnlocked;
  }

  /**
   * Unlock the room with a BIP39 recovery phrase.
   * The key is derived in WebCrypto and held in memory only.
   */
  async unlock(phrase: string): Promise<void> {
    await this._crypto.unlock(phrase);
  }

  /**
   * Unlock the room with an exported raw key (base64).
   */
  async unlockWithRawKey(rawKeyBase64: string): Promise<void> {
    await this._crypto.unlockWithRawKey(rawKeyBase64);
  }

  /**
   * Lock the room — drops the CryptoKey from memory.
   * Writes will fail until unlock() is called again.
   */
  lock(): void {
    this._crypto.lock();
  }

  /**
   * Encrypt a Yjs update before it leaves the client.
   * Throws if the room is locked.
   */
  async encryptUpdate(update: Uint8Array): Promise<Uint8Array> {
    return this._crypto.encryptUpdate(update);
  }

  /**
   * Decrypt a Yjs update received from the sync relay.
   * Throws if the room is locked or the update is tampered.
   */
  async decryptUpdate(encrypted: Uint8Array): Promise<Uint8Array> {
    return this._crypto.decryptUpdate(encrypted);
  }

  /** Export the raw room key as base64 (for key file sharing). */
  async exportRawKeyBase64(): Promise<string> {
    return this._crypto.exportRawKeyBase64();
  }

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

    // Encryption state
    this.encryption = options.encryption ?? null;
    this._crypto = this.encryption
      ? RoomCrypto.locked(this.encryption)
      : RoomCrypto.none();

    if (options.indexedDbProvider) {
      this.indexedDbProvider = options.indexedDbProvider;
    }
    if (options.syncProvider) {
      this.syncProvider = options.syncProvider;
    }
    if (options.ydoc) {
      this.ydoc = options.ydoc;
    }

    // Carry seed documents config through the load lifecycle.
    this._initialDocuments = options.initialDocuments ?? null;

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
    encryption: room.encryption,
  };
}
