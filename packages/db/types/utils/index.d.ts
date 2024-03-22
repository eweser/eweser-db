import type { TypedMap } from 'yjs-types';
import type { CollectionKey, Room, Documents, EweDocument, DocumentWithoutBase } from '../types';
import type { Database } from '..';
/** Sets the metadata like created and updated for the doc */
export declare const newDocument: <T extends EweDocument>(_id: string, _ref: string, doc: DocumentWithoutBase<T>) => T;
/**
 *
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
export declare const wait: (ms: number) => Promise<unknown>;
export declare const randomString: (length: number) => string;
export declare function getRoomDocuments<T extends EweDocument>(room: Room<T>): TypedMap<Documents<T>>;
export declare const getRoom: (_db: Database) => <T extends EweDocument>({ collectionKey, roomId, }: {
    collectionKey: CollectionKey;
    roomId: string;
}) => Room<T> | null;
