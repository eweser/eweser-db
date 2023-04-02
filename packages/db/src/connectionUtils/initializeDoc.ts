import { IndexeddbPersistence } from 'y-indexeddb';
import { Doc } from 'yjs';

import type { CollectionType, YDoc } from '../types';

export const initializeDocAndLocalProvider = async <T extends CollectionType>(
  roomAliasSeed: string
): Promise<{ ydoc: YDoc<T>; localProvider: IndexeddbPersistence }> => {
  const ydoc = new Doc() as YDoc<T>;
  if (!ydoc) throw new Error('could not create doc');

  const localProvider = new IndexeddbPersistence(roomAliasSeed, ydoc as Doc);
  if (localProvider.synced) return { ydoc, localProvider };

  const synced = await localProvider.whenSynced;
  if (synced.synced) return { ydoc, localProvider };
  else throw new Error('could not sync doc');
};
