import type { MatrixClient } from 'matrix-js-sdk';
import type { MatrixProvider } from 'matrix-crdt';
import type { ICreateClientOpts } from 'matrix-js-sdk';
import type { Note } from './collections/notes';
import type { FlashCard } from './collections/flashcards';
import * as Y from 'yjs';
import { DocumentBase } from './collections/documentBase';

export enum CollectionKey {
  notes = 'notes',
  flashcards = 'flashcards',
  registry = 'registry',
}

export interface Documents<T> {
  /** document ID can be string number starting at zero, based on order of creation */
  [documentId: string]: DocumentBase<T>;
}
export type ConnectStatus = 'initial' | 'loading' | 'failed' | 'ok';

/** corresponds to a 'room' in Matrix */
export interface Room<T> {
  connectStatus: ConnectStatus;
  collectionKey: CollectionKey;
  matrixProvider: MatrixProvider | null;
  roomAlias: string;
  name?: string;
  created?: Date;
  // roomId: string;
  doc?: Y.Doc;
  store: { documents: Documents<T> }; // the synced store.
}

export type Collection<T> = {
  // todo: methods to create and delete rooms
  [roomAlias: string]: Room<T>;
};

export interface RoomMetaData {
  roomAlias: string;
  roomName?: string;
  roomId?: string;
}

export type RegistryData = {
  [key in CollectionKey]: { [roomAlias: string]: RoomMetaData };
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
  [CollectionKey.registry]: Collection<RegistryData>;
}

export interface IDatabase {
  matrixClient: MatrixClient | null;
  loggedIn: boolean;
  loginStatus: ConnectStatus;
  updateLoginStatus: (status: ConnectStatus) => void;
  onLoginStatusUpdate: OnLoginStatusUpdate | null;
  onRoomConnectStatusUpdate: null | OnRoomConnectStatusUpdate;
  baseUrl: string;
  collectionKeys: CollectionKey[];
  collections: Collections;
  connectRoom: <T>(
    roomAlias: string,
    collectionKey: CollectionKey,
    registryStore?:
      | {
          documents: Documents<RegistryData>;
        }
      | undefined
  ) => Promise<boolean>;
  createAndConnectRoom: ({
    collectionKey,
    alias,
    name,
    topic,
    registryStore,
  }: {
    collectionKey: CollectionKey;
    alias: string;
    name?: string | undefined;
    topic?: string | undefined;
    registryStore?:
      | {
          documents: Documents<RegistryData>;
        }
      | undefined;
  }) => Promise<string | false>;
  login: (
    loginData: LoginData,
    callback?: (() => void) | undefined
  ) => Promise<void>;
  getCollectionRegistry: (collectionKey: CollectionKey) => {
    [roomAlias: string]: RoomMetaData;
  };
  getRegistryStore: () => {
    documents: Documents<RegistryData>;
  };
}
