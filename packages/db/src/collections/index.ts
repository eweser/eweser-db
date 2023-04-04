import type { RegistryCollection } from '../types';
import { CollectionKey } from '../types';

export * from './notes';
export * from './flashcards';
export * from './profile';
export * from './documentBase';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const collectionKeys = [
  CollectionKey.notes,
  CollectionKey.flashcards,
  CollectionKey.profiles,
];

export const collections = {
  [CollectionKey.notes]: {},
  [CollectionKey.flashcards]: {},
  [CollectionKey.profiles]: {},
};

export const initialRegistry: RegistryCollection = {
  [0]: {
    connectStatus: 'initial',
    collectionKey: 'registry',
    matrixProvider: null,
    roomAlias: '', // to be replaced on login with real username
  },
};
