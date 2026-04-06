import type {
  DocumentBase,
  Note,
  Flashcard,
  Profile,
  AgentConfig,
  AgentAccessLogEntry,
  Conversation,
  COLLECTION_KEYS,
  ServerRoom,
  EweDocument,
  CollectionKey,
  Documents,
  DocumentWithoutBase,
} from '@eweser/shared';
import type { TypedDoc, TypedMap } from 'yjs-types';

import type { Room } from './room';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Doc } from 'yjs';
import type { GetDocuments } from './utils/getDocuments';

export type ProviderOptions = 'WebRTC' | 'Hocuspocus' | 'IndexedDB';
export type indexedDBProviderPolyfill = (
  roomId: string,
  yDoc: Doc
) => IndexeddbPersistence;

export type {
  Room,
  ServerRoom,
  EweDocument,
  CollectionKey,
  DocumentBase,
  Note,
  Flashcard,
  Profile,
  Conversation,
  GetDocuments,
};

export { COLLECTION_KEYS };

export type CollectionToDocument = {
  notes: Note;
  flashcards: Flashcard;
  profiles: Profile;
  agentConfigs: AgentConfig;
  agentAccessLogs: AgentAccessLogEntry;
  conversations: Conversation;
};
export const collections: Collections = {
  notes: {},
  flashcards: {},
  profiles: {},
  agentConfigs: {},
  agentAccessLogs: {},
  conversations: {},
};

export type { DocumentWithoutBase, Documents };

export type YDoc<T extends EweDocument> = TypedDoc<{
  documents: TypedMap<Documents<T>>;
}>;

export type Registry = ServerRoom[];

export type Collection<T extends EweDocument> = {
  [roomId: string]: Room<T>;
};

export type Collections = {
  [K in CollectionKey]: Collection<CollectionToDocument[K]>;
};
