import { IndexeddbPersistence } from 'y-indexeddb';
import type { EweDocument, YDoc, indexedDBProviderPolyfill } from '../../types';
export declare const initializeDocAndLocalProvider: <T extends EweDocument>(roomId: string, existingDoc?: YDoc<T> | null | undefined, provider?: indexedDBProviderPolyfill) => Promise<{
    yDoc: YDoc<T>;
    localProvider: IndexeddbPersistence;
}>;
