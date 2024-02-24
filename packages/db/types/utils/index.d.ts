import type { TypedMap } from 'yjs-types';
import type { CollectionKey, Room, Documents, Document, DocumentWithoutBase } from '../types';
import type { Database } from '..';
/** Sets the metadata like created and updated for the doc */
export declare const newDocument: <T extends Document>(_id: string, _ref: string, doc: DocumentWithoutBase<T>) => T;
/**
 *
 * @param collection e.g. `'flashcards'` "flashcards"
 * Params must be strings and cannot include `|`
 * @returns `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @example 'https://eweser.com|flashcards|room-id-uuid|doc-id-uuid'
 */
export declare const buildRef: (params: {
    collectionKey: CollectionKey;
    roomId: string;
    documentId: string | number;
    authServer: string;
}) => string;
export declare const wait: (ms: number) => Promise<unknown>;
export declare const randomString: (length: number) => string;
export declare function getRoomDocuments<T extends Document>(room: Room<T>): TypedMap<Documents<T>>;
export declare const getRoom: (_db: Database) => <T extends Document>({ collectionKey, roomId, }: {
    collectionKey: CollectionKey;
    roomId: string;
}) => Room<T> | null;
export declare const buildFullUserId: (username: string, homeserver: string) => string;
/** returns the local part of a userId.
 * @example extractUserIdLocalPart('@username:matrix.org') => 'username'
 */
export declare const extractUserIdLocalPart: (userId: string) => string;
