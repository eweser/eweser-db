export * from './note';
export * from './flashcard';
export * from './profile';
export * from './documentBase';

/** We don't include registry because we use this after login to get all non-registry collections. */
export const COLLECTION_KEYS = ['notes', 'flashcards', 'profiles'] as const;
