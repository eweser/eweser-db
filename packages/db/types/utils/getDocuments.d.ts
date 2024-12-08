import type { YMapEvent, Transaction } from 'yjs';
import type { Database } from '..';
import type { EweDocument, DocumentWithoutBase, Room, Documents } from '../types';
import type { TypedMap } from 'yjs-types';
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
    onChange: (callback: (event: YMapEvent<any>, transaction: Transaction) => void) => void;
    sortByRecent: (docs: Documents<T>) => Documents<T>;
}
export declare const getDocuments: (_db: Database) => <T extends EweDocument>(room: Room<T>) => GetDocuments<T>;
