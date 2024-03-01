import type { YMapEvent, Transaction } from 'yjs';
import type { Database } from '..';
import type { EweDocument, DocumentWithoutBase, Room, Documents } from '../types';
export declare const getDocuments: (_db: Database) => <T extends EweDocument>(room: Room<T>) => {
    documents: import("yjs-types").TypedMap<Documents<T>>;
    get: (id: string) => T | undefined;
    set: (doc: T) => T;
    new: (doc: DocumentWithoutBase<T>, id?: string) => T;
    delete: (id: string, timeToLiveMs?: number) => T;
    getAll: () => Documents<T>;
    getUndeleted: () => Documents<T>;
    onChange: (callback: (event: YMapEvent<any>, transaction: Transaction) => void) => void;
    sortByRecent: (docs: Documents<T>) => Documents<T>;
};
