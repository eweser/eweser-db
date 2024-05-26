import type { DocumentBase, Note, Flashcard, Profile, COLLECTION_KEYS, ServerRoom, EweDocument, CollectionKey } from '@eweser/shared';
import type { TypedDoc, TypedMap } from 'yjs-types';
import type { Room } from './room';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { Doc } from 'yjs';
export type ProviderOptions = 'WebRTC' | 'YSweet' | 'IndexedDB';
export type indexedDBProviderPolyfill = (roomId: string, yDoc: Doc) => IndexeddbPersistence;
export type { Room, ServerRoom, EweDocument, CollectionKey, DocumentBase, Note, Flashcard, Profile, };
export { COLLECTION_KEYS };
export type CollectionToDocument = {
    notes: Note;
    flashcards: Flashcard;
    profiles: Profile;
};
export declare const collections: Collections;
export type DocumentWithoutBase<T extends EweDocument> = Omit<T, keyof DocumentBase>;
export interface Documents<T extends EweDocument> {
    [documentId: string]: T;
}
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
