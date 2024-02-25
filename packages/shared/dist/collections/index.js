export * from './note';
export * from './flashcard';
export * from './profile';
export * from './documentBase';
/** We don't include registry because we use this after login to get all non-registry collections. */
export const COLLECTION_KEYS = ['notes', 'flashcards', 'profiles'];
export const COLLECTION_KEYS_OR_ALL = [...COLLECTION_KEYS, 'all'];
export const PUBLIC_ACCESS_TYPES = ['private', 'read', 'write'];
export const collectionKeys = COLLECTION_KEYS.map((key) => key);
//# sourceMappingURL=index.js.map