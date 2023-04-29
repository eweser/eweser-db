import type { MatrixProvider } from 'matrix-crdt';
import type { ICreateClientOpts } from 'matrix-js-sdk';
import type { DocumentBase, Note, FlashCard, Profile } from './collections';
import type { WebrtcProvider } from 'y-webrtc';
import type { TypedDoc, TypedMap } from 'yjs-types';
import type { Doc } from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';

export type { DocumentBase, Note, FlashCard, Profile };

export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  profiles = 'profiles',
}

export type UserDocument = Note | FlashCard | Profile;
export type Document = UserDocument | RegistryData;

export type DocumentWithoutBase<T extends Document> = Omit<
  T,
  keyof DocumentBase
>;

export interface Documents<T extends Document> {
  /** document ID can be string number starting at zero, based on order of creation */
  [documentId: string]: T | undefined;
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
  collectionKey: CollectionKey | 'registry';
  matrixProvider: MatrixProvider | null;
  webRtcProvider: WebrtcProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  /** full alias e.g. '#eweser-db_registry_username:matrix.org' */
  roomAlias: string;
  /** matrix roomID  */
  roomId?: string;
  name?: string;
  created?: Date;
  // roomId: string;
  ydoc?: YDoc<T>;
  tempDocs: { [docRef: string]: { doc: Doc; matrixProvider?: MatrixProvider } };
}

export type Collection<T extends Document> = {
  [aliasSeed: string]: Room<T>;
};

export interface RoomMetaData {
  roomAlias: string;
  roomName?: string;
  roomId?: string;
}

export type RegistryData = {
  [key in CollectionKey]: {
    [roomAlias: string]: RoomMetaData | undefined;
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

export interface CreateAndConnectRoomOptions {
  collectionKey: CollectionKey;
  /** undecorated alias */
  aliasSeed: string;
  name?: string;
  topic?: string;
  /** The initial documents can be with or without metadata (_id, _ref, etc.) When loaded, whatever metadata is provided will be filled in */
  initialValues?: Partial<UserDocument>[];
  doNotAutoReconnect?: boolean;
  waitForWebRTC?: boolean;
}

export interface LoginData extends ICreateClientOpts {
  password?: string;
  initialRoomConnect?: CreateAndConnectRoomOptions;
}

export interface Collections {
  [CollectionKey.notes]: Collection<Note>;
  [CollectionKey.flashcards]: Collection<FlashCard>;
  [CollectionKey.profiles]: Collection<Profile>;
  registry: RegistryCollection;
}

export type LoginStatus =
  | 'initial'
  | 'loading'
  | 'failed'
  | 'ok'
  | 'disconnected';

/**
 * `started` can be for success of login, startup, or load
 *
 * `startFailed` can be for fail of login, startup, or load
 */
export type DBEventType =
  | 'login'
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
  | 'getRoomId';

export type DBEvent = {
  event: DBEventType;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  data?: {
    collectionKey?: CollectionKey | 'registry';
    roomId?: string;
    roomAlias?: string;
    aliasSeed?: string;
    id?: string;
    loginStatus?: LoginStatus;
    connectStatus?: ConnectStatus;
    raw?: any;
    online?: boolean;
  };
};

export type DBEventEmitter = (event: DBEvent) => void;

export type DBEventListeners = {
  [label: string]: DBEventEmitter;
};
