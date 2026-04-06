import type { TypedMap } from 'yjs-types';
import type { CollectionKey, Room, Documents, EweDocument } from '../types';
import type { Database } from '..';
export { newDocument, buildRef, randomString, } from '@eweser/shared';
export declare const wait: (ms: number) => Promise<unknown>;
export declare function getRoomDocuments<T extends EweDocument>(room: Room<T>): TypedMap<Documents<T>>;
export declare const getRoom: (_db: Database) => <T extends EweDocument>({ collectionKey, roomId, }: {
    collectionKey: CollectionKey;
    roomId: string;
}) => Room<T> | null;
