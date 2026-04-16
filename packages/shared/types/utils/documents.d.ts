import type { YMapEvent, Transaction } from 'yjs';
import type * as Y from 'yjs';
import type { TypedMap } from 'yjs-types';
import type { CollectionKey, EweDocument, DocumentWithoutBase } from '../collections/index.js';
/** Sets the metadata like created and updated for the doc */
export declare const newDocument: <T extends EweDocument>(_id: string, _ref: string, doc: DocumentWithoutBase<T>) => T;
/**
 * @param collection e.g. `'flashcards'` "flashcards"
 * Params must be strings and cannot include `|`
 * @returns `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @example 'https://www.eweser.com|flashcards|room-id-uuid|doc-id-uuid'
 */
export declare const buildRef: (params: {
    collectionKey: CollectionKey;
    roomId: string;
    documentId: string | number;
    authServer: string;
}) => string;
export declare const randomString: (length: number) => string;
export interface Documents<T extends EweDocument> {
    [documentId: string]: T;
}
export interface GetDocuments<T extends EweDocument> {
    documents: TypedMap<Documents<T>>;
    get: (id: string) => T | undefined;
    set: (doc: T) => T;
    new: (doc: DocumentWithoutBase<T>, id?: string) => T;
    delete: (id: string, timeToLiveMs?: number) => T;
    getAll: () => Documents<T>;
    getAllToArray: () => T[];
    getUndeleted: () => Documents<T>;
    getUndeletedToArray: () => T[];
    toArray: (docs: Documents<T>) => T[];
    onChange: (callback: (event: YMapEvent<Documents<T>>, transaction: Transaction) => void) => void;
    sortByRecent: (docs: Documents<T>) => Documents<T>;
}
/**
 * Factory: returns document CRUD helpers scoped to a Y.Doc.
 * @param authServer - The auth server URL (used in buildRef)
 * @param collectionKey - The collection key for the room
 * @param roomId - The room ID
 */
export declare const getDocuments: (authServer: string, collectionKey: CollectionKey, roomId: string) => <T extends EweDocument>(ydoc: Y.Doc) => GetDocuments<T>;
export declare const getRoomDocuments: <T extends EweDocument>(ydoc: Y.Doc) => TypedMap<Documents<T>>;
