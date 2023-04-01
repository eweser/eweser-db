import type { MatrixClient } from 'matrix-js-sdk';
import type { MatrixProvider } from 'matrix-crdt';
import type { ICreateClientOpts } from 'matrix-js-sdk';
import type { Note } from './collections/notes';
import type { FlashCard } from './collections/flashcards';
import type { TypedDoc, TypedMap } from 'yjs-types';
import type { DocumentBase } from './collections/documentBase';
export type { Document } from './collections';
export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  registry = 'registry',
}
export type NonRegistryCollectionKey = Exclude<
  CollectionKey,
  CollectionKey.registry
>;
export interface Documents<T> {
  /** document ID can be string number starting at zero, based on order of creation */
  [documentId: string]: DocumentBase<T>;
}

export type YDoc<T> = TypedDoc<{ documents: TypedMap<Documents<T>> }>;

export type ConnectStatus =
  | 'initial'
  | 'loading'
  | 'failed'
  | 'ok'
  | 'disconnected';

/** corresponds to a 'room' in Matrix */
export interface Room<T> {
  connectStatus: ConnectStatus;
  collectionKey: CollectionKey;
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

export type Collection<T> = {
  [roomAliasSeed: string]: Room<T>;
};

export interface RoomMetaData {
  roomAlias: string;
  roomName?: string;
  roomId?: string;
}

export type RegistryData = {
  [key in NonRegistryCollectionKey]: {
    [roomAlias: string]: RoomMetaData;
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
  [CollectionKey.registry]: RegistryCollection;
}

export type CreateAndConnectRoom = (
  params: {
    collectionKey: CollectionKey;
    aliasName: string;
    name?: string;
    topic?: string;
    registryStore?: { documents: Documents<RegistryData> };
  },
  callback?: (status: ConnectStatus) => void
) => Promise<boolean>;

export type ConnectRoom = (
  roomAlias: string,
  collectionKey: CollectionKey,
  registryStore?: { documents: Documents<RegistryData> },
  callback?: (status: ConnectStatus) => void
) => Promise<boolean>;

export type Login = (
  loginData: LoginData,
  callback?: (status: ConnectStatus) => void
) => Promise<boolean>;

export type ConnectRegistry = () => Promise<void>;

export interface IDatabase {
  matrixClient: MatrixClient | null;
  userId: string;
  /** homeserver */
  baseUrl: string;

  collectionKeys: CollectionKey[];
  collections: Collections;

  // methods
  connectRegistry: ConnectRegistry;
  connectRoom: ConnectRoom;
  createAndConnectRoom: CreateAndConnectRoom;
  login: Login;
}
