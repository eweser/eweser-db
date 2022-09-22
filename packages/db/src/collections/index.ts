import type { Collection, RegistryData } from '../types';
import { CollectionKey } from '../types';
export * from './notes';
export * from './flashcards';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const collectionKeys = [CollectionKey.notes, CollectionKey.flashcards];

export const collections = {
  notes: {},
  flashcards: {},
};

export const initialRegistryStore = {
  documents: {
    '0': {
      _ref: 'registry.0.0',
      _id: '0',
      _created: 0,
      _updated: 0,
      notes: {},
      flashcards: {},
      registry: {},
    },
  },
};

export const initialRegistry: Collection<RegistryData> = {
  '0': {
    connectStatus: 'initial',
    collectionKey: CollectionKey.registry,
    matrixProvider: null,
    roomAlias: '#eduvault_registry_<username>:matrix.org', // to be replaced on login with real username
    store: initialRegistryStore,
  },
};
