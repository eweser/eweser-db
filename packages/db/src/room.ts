import type { CollectionKey, EweDocument } from '@eweser/shared';
import type { YSweetProvider } from '@y-sweet/client';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { WebrtcProvider } from 'y-webrtc';
import type { RoomEvents } from './events';
import { TypedEventEmitter } from './events';
import type { YDoc, ServerRoom } from './types';

/** is an event listener, and adds the ydoc providers ands connection status to a ServerRoom/Registry entry */
export class Room<T extends EweDocument>
  extends TypedEventEmitter<RoomEvents<T>>
  implements ServerRoom
{
  id: string;
  name: string;
  collectionKey: CollectionKey;
  token: string | null;
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

  constructor(
    serverRoom: ServerRoom,
    {
      indexedDbProvider,
      webRtcProvider,
      ySweetProvider,
      ydoc,
    }: {
      indexedDbProvider?: IndexeddbPersistence | null;
      webRtcProvider?: WebrtcProvider | null;
      ySweetProvider?: YSweetProvider | null;
      ydoc?: YDoc<T> | null;
    } = {}
  ) {
    super();
    this.id = serverRoom.id;
    this.name = serverRoom.name;
    this.collectionKey = serverRoom.collectionKey;
    this.token = serverRoom.token;
    this.ySweetUrl = serverRoom.ySweetUrl;
    this.publicAccess = serverRoom.publicAccess;
    this.readAccess = serverRoom.readAccess;
    this.writeAccess = serverRoom.writeAccess;
    this.adminAccess = serverRoom.adminAccess;
    this.createdAt = serverRoom.createdAt;
    this.updatedAt = serverRoom.updatedAt;
    this._deleted = serverRoom._deleted;
    this._ttl = serverRoom._ttl;

    this.indexedDbProvider = indexedDbProvider;
    this.webRtcProvider = webRtcProvider;
    this.ySweetProvider = ySweetProvider;
    this.ydoc = ydoc;
  }

  // tempDocs: { [docRef: string]: { doc: Doc } };
}
