import type { DocumentBase } from './documentBase';
import type { Flashcard } from './flashcard';
import type { Note } from './note';
import type { Profile } from './profile';
export * from './note';
export * from './flashcard';
export * from './profile';
export * from './documentBase';
/** We don't include registry because we use this after login to get all non-registry collections. */
export declare const COLLECTION_KEYS: readonly ["notes", "flashcards", "profiles"];
export declare const PUBLIC_ACCESS_TYPES: readonly ["private", "read", "write"];
export declare const collectionKeys: ("notes" | "flashcards" | "profiles")[];
export type Document = Note | Flashcard | Profile;
export type CollectionKey = (typeof COLLECTION_KEYS)[number];
export type DocumentWithoutBase<T extends Document> = Omit<T, keyof DocumentBase>;
