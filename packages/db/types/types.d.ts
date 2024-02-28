/// <reference types="node" />
import { EventEmitter } from 'events';
import type { DocumentBase, Note, Flashcard, Profile, COLLECTION_KEYS, ServerRoom, EweDocument, CollectionKey } from '@eweser/shared';
import type { WebrtcProvider } from 'y-webrtc';
import type { TypedDoc, TypedMap } from 'yjs-types';
import type { IndexeddbPersistence } from 'y-indexeddb';
import type { YSweetProvider } from '@y-sweet/client';
export type ProviderOptions = 'WebRTC' | 'YSweet' | 'IndexedDB';
export type { ServerRoom, EweDocument, CollectionKey, DocumentBase, Note, Flashcard, Profile, };
export { COLLECTION_KEYS };
type CollectionToDocument = {
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
/** adds the ydoc providers ans connection status */
export interface Room<T extends EweDocument> extends ServerRoom {
    indexeddbProvider?: IndexeddbPersistence | null;
    webRtcProvider?: WebrtcProvider | null;
    ySweetProvider?: YSweetProvider | null;
    ydoc?: YDoc<T>;
}
export type Collection<T extends EweDocument> = {
    [roomId: string]: Room<T>;
};
export type Collections = {
    [K in CollectionKey]: Collection<CollectionToDocument[K]>;
};
export type DatabaseEvents = {
    log: (level: number, ...args: any[]) => void;
    debug: (...args: any[]) => void;
    info: (...args: any[]) => void;
    warn: (...args: any[]) => void;
    error: (...args: any[]) => void;
    roomLoaded: (room: Room<any>) => void;
    roomsLoaded: (rooms: Room<any>[]) => void;
    roomConnectionChange: (room: Room<any>, status: string) => void;
};
type EmittedEvents = Record<string | symbol, (...args: any[]) => any>;
export declare class TypedEventEmitter<Events extends EmittedEvents> extends EventEmitter {
    on<E extends keyof Events>(event: (E & string) | symbol, listener: Events[E]): this;
    emit<E extends keyof Events>(event: (E & string) | symbol, ...args: Parameters<Events[E]>): boolean;
}
