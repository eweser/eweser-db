import { IndexeddbPersistence } from 'y-indexeddb';
import type { Document, YDoc } from '../../types';
export declare const initializeDocAndLocalProvider: <T extends Document>(roomId: string, existingDoc?: YDoc<T> | undefined) => Promise<{
    ydoc: YDoc<T>;
    localProvider: IndexeddbPersistence;
}>;
