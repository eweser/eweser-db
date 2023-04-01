import { IndexeddbPersistence } from 'y-indexeddb';
import { Doc } from 'yjs';

import type { YDoc } from '../types';

export const initializeDocAndLocalProvider = async <T>(
  aliasName: string
): Promise<{ doc: YDoc<T>; localProvider: IndexeddbPersistence }> => {
  const doc = new Doc() as YDoc<T>;
  if (!doc) throw new Error('could not create doc');
  const localProvider = new IndexeddbPersistence(aliasName, doc as Doc);
  if (localProvider.synced) return { doc, localProvider };
  const synced = await localProvider.whenSynced;
  if (synced.synced) return { doc, localProvider };
  else throw new Error('could not sync doc');
};
