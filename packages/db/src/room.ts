import type { CollectionKey, EweDocument } from '@eweser/shared';
import type { YSweetProvider } from '@y-sweet/client';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { WebrtcProvider } from 'y-webrtc';
import type { RoomEvents } from './events';
import { TypedEventEmitter } from './events';
import type { YDoc, ServerRoom } from './types';

export type NewRoomOptions<T extends EweDocument> = {
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

/** is an event listener, and adds the ydoc providers ands connection status to a ServerRoom/Registry entry */
export class Room<T extends EweDocument>
  extends TypedEventEmitter<RoomEvents<T>>
  implements ServerRoom
{
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
  };

  constructor({
    indexedDbProvider,
    webRtcProvider,
    ySweetProvider,
    ydoc,
    ...serverRoom
  }: NewRoomOptions<T>) {
    super();
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
  }

  // tempDocs: { [docRef: string]: { doc: Doc } };
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
