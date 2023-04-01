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
export type { Document, DocumentBase, Note, FlashCard, Profile };

export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  profiles = 'profiles',
}

export interface Documents<T> {
  /** document ID can be string number starting at zero, based on order of creation */
  [documentId: string]: DocumentBase<T> | undefined;
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

export type Collection<T> = {
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

export type ConnectRoom<T = any> = (
  roomAliasSeed: string,
  collectionKey: CollectionKey
) => Promise<Room<T>>;

export type Login = (
  loginData: LoginData,
  callback?: (status: ConnectStatus) => void
) => Promise<boolean>;

export type ConnectRegistry = () => Promise<TypedMap<Documents<RegistryData>>>;

export type DBEvent = {
  event: string;
  level?: 'info' | 'warn' | 'error';
  message?: string;
  data?: {
    collectionKey?: CollectionKey;
    roomId?: string;
    roomAlias?: string;
    id?: string;
  };
};

export type DBEventEmitter = (event: DBEvent) => void;

export interface IDatabase {
  matrixClient: MatrixClient | null;
  userId: string;
  /** homeserver */
  baseUrl: string;

  collectionKeys: CollectionKey[];
  collections: Collections;

  listeners: DBEventEmitter[];

  // methods
  /** add a listener to the database */
  on: (listener: DBEventEmitter) => void;
  emit: (event: DBEvent) => void;

  /** initializes the registry's ydoc and matrix provider */
  connectRegistry: ConnectRegistry;
  /**
   * Note that the room must have been created already and the roomAlias must be in the registry
   * 1. Joins the Matrix room if not in it
   * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
   * 3. Creates a matrixCRDT provider and saves it to the room object
   * 4. Save the room's metadata to the registry (if not already there)
   *  Provides status updates using the DB.emit() method
   */
  connectRoom: ConnectRoom;
  createAndConnectRoom: CreateAndConnectRoom;
  login: Login;
}
