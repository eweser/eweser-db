import { IndexeddbPersistence } from 'y-indexeddb';
import type { EweDocument, YDoc } from '../../types';
export declare const initializeDocAndLocalProvider: <T extends EweDocument>(roomId: string, existingDoc?: YDoc<T> | undefined) => Promise<{
    yDoc: YDoc<T>;
    localProvider: IndexeddbPersistence;
}>;
