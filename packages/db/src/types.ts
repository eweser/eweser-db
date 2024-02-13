import type { DocumentBase, Note, Flashcard, Profile } from './collections';
import type { WebrtcProvider } from 'y-webrtc';
import type { TypedDoc, TypedMap } from 'yjs-types';
import type { Doc } from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';

export type { DocumentBase, Note, Flashcard as Flashcard, Profile };

export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  profiles = 'profiles',
}
export const collectionKeys = Object.values(CollectionKey);

export type UserDocument = Note | Flashcard | Profile;
export type Document = UserDocument | RegistryData;

export type DocumentWithoutBase<T extends Document> = Omit<
  T,
  keyof DocumentBase
>;

export interface Documents<T extends Document> {
  [documentId: string]: T;
}

export type YDoc<T extends Document> = TypedDoc<{
  documents: TypedMap<Documents<T>>;
}>;

export type ConnectStatus =
  | 'initial'
  | 'loading'
  | 'failed'
  | 'ok'
  | 'disconnected';

/** corresponds to a 'room' in Matrix */
export interface Room<T extends Document> {
  connectStatus: ConnectStatus;
  collectionKey: CollectionKey;
  webRtcProvider: WebrtcProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  /** <https://auth-server.com>|<uuid> */
  roomId: string;
  /** User facing name of the room ('folder') */
  name?: string;
  created?: Date;
  // roomId: string;
  ydoc?: YDoc<T>;
  tempDocs: { [docRef: string]: { doc: Doc } };
}

export type Collection<T extends Document> = {
  [aliasSeed: string]: Room<T>;
};

export interface RoomMetaData {
  roomName?: string;
  roomId?: string;
}

export type RegistryData = {
  [key in CollectionKey]: {
    [roomId: string]: RoomMetaData | undefined;
  };
};

export type RegistryCollection = {
  [0]: Room<RegistryData>;
};

export type OnRoomConnectStatusUpdate = (
  status: ConnectStatus,
  collectionKey: CollectionKey,
  roomId: string
) => void;

export type OnLoginStatusUpdate = (status: ConnectStatus) => void;

export interface CreateAndConnectRoomOptions<T extends Document> {
  collectionKey: CollectionKey;
  /** undecorated alias */
  aliasSeed: string;
  name?: string;
  topic?: string;
  /** The initial documents can be with or without metadata (_id, _ref, etc.) When loaded, whatever metadata is provided will be filled in */
  initialValues?: Partial<T>[];
  doNotAutoReconnect?: boolean;
  waitForWebRTC?: boolean;
}

export interface Collections {
  [CollectionKey.notes]: Collection<Note>;
  [CollectionKey.flashcards]: Collection<Flashcard>;
  [CollectionKey.profiles]: Collection<Profile>;
}

/**
 * `started` can be for success of login, startup, or load
 *
 * `startFailed` can be for fail of login, startup, or load
 */
export type DBEventType =
  | 'login'
  | 'logout'
  | 'signup'
  | 'load'
  | 'started'
  | 'startFailed'
  | 'onlineChange'
  | 'loginStatus'
  | 'connectRoom'
  | 'disconnectRoom'
  | 'reconnectRoom'
  | 'createAndConnectRoom'
  | 'loadRoom'
  | 'joinRoomIfNotJoined'
  | 'updateRegistry'
  | 'connectRegistry'
  | 'populateRegistry'
  | 'connectMatrixProvider'
  | 'getOrCreateSpace'
  | 'getOrCreateRegistry'
  | 'getRoomId'
  | 'createOfflineRoom';

export type DBEvent = {
  event: DBEventType;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  data?: {
    collectionKey?: CollectionKey;
    roomId?: string;
    aliasSeed?: string;
    id?: string;
    connectStatus?: ConnectStatus;
    raw?: any;
    online?: boolean;
  };
};

export type DBEventEmitter = (event: DBEvent) => void;

export type DBEventListeners = {
  [label: string]: DBEventEmitter;
};
