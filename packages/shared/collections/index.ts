import type { Collections } from '../../db/src/types';

export * from './note';
export * from './flashcard';
export * from './profile';
export * from './documentBase';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const COLLECTION_KEYS = ['notes', 'flashcards', 'profiles'] as const;

export const PUBLIC_ACCESS_TYPES = ['private', 'read', 'write'] as const;

export const collectionKeys = COLLECTION_KEYS.map((key) => key);

export const collections: Collections = {
  notes: {},
  flashcards: {},
  profiles: {},
};
