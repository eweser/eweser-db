import { EventEmitter } from 'events';
import type {
  DocumentBase,
  Note,
  Flashcard,
  Profile,
  COLLECTION_KEYS,
} from './collections';
import type { WebrtcProvider } from 'y-webrtc';
import type { TypedDoc, TypedMap } from 'yjs-types';
// import type { Doc } from 'yjs';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { YSweetProvider } from '@y-sweet/client';

export type ProviderOptions = 'WebRTC' | 'YSweet' | 'IndexedDB';

export type { DocumentBase, Note, Flashcard, Profile };

export type CollectionKey = (typeof COLLECTION_KEYS)[number];

type CollectionToDocument = {
  notes: Note;
  flashcards: Flashcard;
  profiles: Profile;
};

export type Document = Note | Flashcard | Profile;

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

/** corresponds to a 'room' in Matrix */
export interface Room<T extends Document> {
  roomId: string;
  collectionKey: CollectionKey;

  indexeddbProvider: IndexeddbPersistence | null;
  webRtcProvider: WebrtcProvider | null;
  ySweetProvider: YSweetProvider | null;
  ySweetToken?: string;
  ydoc?: YDoc<T>;

  // connectStatus: ConnectStatus;
  created?: Date;
  /** User facing name of the room ('folder') */
  name?: string;
  // tempDocs: { [docRef: string]: { doc: Doc } };
}

export type Collection<T extends Document> = {
  [roomId: string]: Room<T>;
};

export type Collections = {
  [K in CollectionKey]: Collection<CollectionToDocument[K]>;
};

export type DatabaseEvents = {
  log: (level: number, ...args: any[]) => void;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

type EmittedEvents = Record<string | symbol, (...args: any[]) => any>;

export class TypedEventEmitter<
  Events extends EmittedEvents
> extends EventEmitter {
  on<E extends keyof Events>(
    event: (E & string) | symbol,
    listener: Events[E]
  ): this {
    return super.on(event, listener as any);
  }

  emit<E extends keyof Events>(
    event: (E & string) | symbol,
    ...args: Parameters<Events[E]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
