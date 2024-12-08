import type { CollectionKey, EweDocument, ServerRoom } from '@eweser/shared';
import type { YSweetProvider } from '@y-sweet/client';
import type { IndexeddbPersistence } from 'y-indexeddb';
import { WebrtcProvider } from 'y-webrtc';
import type { RoomEvents } from './events';
import { TypedEventEmitter } from './events';
import type { Database, YDoc } from '.';
import type { GetDocuments } from './utils/getDocuments';
import { getDocuments } from './utils/getDocuments';
import { Awareness } from 'y-protocols/awareness.js';
import { Doc } from 'yjs';

export type NewRoomOptions<T extends EweDocument> = {
  db: Database;
  id?: string;
  name: string;
  collectionKey: CollectionKey;
  token?: string | null;
  tokenExpiry?: string | null;
  ySweetUrl?: string | null;
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
  id: string;
  name: string;
  collectionKey: CollectionKey;
  token: string | null;
  tokenExpiry: string | null;
  ySweetUrl: string | null;
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

    const Docs = this.getDocuments().getAllToArray();
    Docs.forEach((doc) => {
      delete this.db.tempDocs[doc._id];
    });
  };

  getDocuments: () => GetDocuments<T>;

  tempDoc = (docId: string) => {
    const existing = this.db.tempDocs[docId];
    if (existing) {
      if (existing.provider?.connected) {
        return existing;
      }
    }

    const doc = new Doc();
    const awareness = new Awareness(doc);
    const servers = this.db.webRtcPeers;
    /* could consider improving this security */
    const password = this.id;

    const provider = new WebrtcProvider(docId, doc, {
      password,
      signaling: servers,
      awareness,
    });

    this.db.tempDocs[docId] = { doc, provider, awareness };
    return { doc, provider, awareness };
  };

  constructor({
    db,
    indexedDbProvider,
    webRtcProvider,
    ySweetProvider,
    ydoc,
    ...serverRoom
  }: NewRoomOptions<T>) {
    super();
    this.db = db;
    this.id = serverRoom.id || crypto.randomUUID();
    this.name = serverRoom.name;
    this.collectionKey = serverRoom.collectionKey;
    this.token = serverRoom.token ?? null;
    this.tokenExpiry = serverRoom.tokenExpiry ?? null;
    this.ySweetUrl = serverRoom.ySweetUrl ?? null;
    this.publicAccess = serverRoom.publicAccess ?? 'private';
    this.readAccess = serverRoom.readAccess ?? [];
    this.writeAccess = serverRoom.writeAccess ?? [];
    this.adminAccess = serverRoom.adminAccess ?? [];
    this.createdAt = serverRoom.createdAt ?? null;
    this.updatedAt = serverRoom.updatedAt ?? null;
    this._deleted = serverRoom._deleted ?? false;
    this._ttl = serverRoom._ttl ?? null;

    this.indexedDbProvider = indexedDbProvider;
    this.webRtcProvider = webRtcProvider;
    this.ySweetProvider = ySweetProvider;
    this.ydoc = ydoc;

    this.getDocuments = () => getDocuments(this.db)(this);
  }
}

export function roomToServerRoom(room: Room<any>): ServerRoom {
  const {
    indexedDbProvider: _unused_1,
    webRtcProvider: _unused_2,
    ySweetProvider: _unused_3,
    ydoc: _unused_4,
    ...serverRoom
  } = room;
  return serverRoom;
}
