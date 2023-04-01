import type { RegistryCollection } from '../types';
import { CollectionKey } from '../types';
import type { FlashCard } from './flashcards';
import type { Note } from './notes';
export * from './notes';
export * from './flashcards';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const collectionKeys = [CollectionKey.notes, CollectionKey.flashcards];
export type Document = Note | FlashCard;

export const collections = {
  [CollectionKey.notes]: {},
  [CollectionKey.flashcards]: {},
};

export const initialRegistry: RegistryCollection = {
  [0]: {
    connectStatus: 'initial',
    collectionKey: CollectionKey.registry,
    matrixProvider: null,
    roomAlias: '', // to be replaced on login with real username
  },
};
