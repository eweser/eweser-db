import type { Collection, RegistryData } from '../types';
import { CollectionKey } from '../types';
import { FlashCard } from './flashcards';
import { Note } from './notes';
export * from './notes';
export * from './flashcards';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const collectionKeys = [CollectionKey.notes, CollectionKey.flashcards];
export type Document = Note | FlashCard;

export const collections = {
  [CollectionKey.notes]: {},
  [CollectionKey.flashcards]: {},
};

export const initialRegistryStore = {
  documents: {
    '0': {
      _ref: 'registry.0.0',
      _id: '0',
      _created: 0,
      _updated: 0,
      [CollectionKey.notes]: {},
      [CollectionKey.flashcards]: {},
      [CollectionKey.registry]: {},
    },
  },
};

export const initialRegistry: Collection<RegistryData> = {
  '0': {
    connectStatus: 'initial',
    collectionKey: CollectionKey.registry,
    matrixProvider: null,
    roomAlias: '#eweser-db_registry_<username>:matrix.org', // to be replaced on login with real username
    store: initialRegistryStore,
  },
};
