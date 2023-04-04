import type { MatrixClient } from 'matrix-js-sdk';
import type { MatrixProvider } from 'matrix-crdt';
import type { ICreateClientOpts } from 'matrix-js-sdk';
import type {
  Document,
  DocumentBase,
  Note,
  FlashCard,
  Profile,
} from './collections';
import type { TypedDoc, TypedMap } from 'yjs-types';

export type { login as DBLogin } from './methods/login';

export type { Document, DocumentBase, Note, FlashCard, Profile };

export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  profiles = 'profiles',
}
export type CollectionType = Note | FlashCard | Profile | RegistryData;

export interface Documents<T extends CollectionType> {
  /** document ID can be string number starting at zero, based on order of creation */
  [documentId: string]: DocumentBase<T> | undefined;
}

export type YDoc<T extends CollectionType> = TypedDoc<{
  documents: TypedMap<Documents<T>>;
}>;

export type ConnectStatus =
  | 'initial'
  | 'loading'
  | 'failed'
  | 'ok'
  | 'disconnected';

/** corresponds to a 'room' in Matrix */
export interface Room<T extends CollectionType> {
  connectStatus: ConnectStatus;
  collectionKey: CollectionKey | 'registry';
  matrixProvider: MatrixProvider | null;
  /** full alias e.g. '#eweser-db_registry_username:matrix.org' */
  roomAlias: string;
  /** matrix roomID  */
  roomId?: string;
  name?: string;
  created?: Date;
  // roomId: string;
  ydoc?: YDoc<T>;
}

export type Collection<T extends CollectionType> = {
  [roomAliasSeed: string]: Room<T>;
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

export interface LoginData extends ICreateClientOpts {
  password?: string;
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

export type DBEvent = {
  event: string;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  data?: {
    collectionKey?: CollectionKey;
    roomId?: string;
    roomAlias?: string;
    id?: string;
    loginStatus?: LoginStatus;
    connectStatus?: ConnectStatus;
    raw?: any;
  };
};

export type DBEventEmitter = (event: DBEvent) => void;
