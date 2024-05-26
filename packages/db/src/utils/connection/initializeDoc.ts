import { IndexeddbPersistence } from 'y-indexeddb';
import { Doc } from 'yjs';

import type { EweDocument, YDoc, indexedDBProviderPolyfill } from '../../types';

export const initializeDocAndLocalProvider = async <T extends EweDocument>(
  roomId: string,
  existingDoc?: YDoc<T> | null,
  provider?: indexedDBProviderPolyfill
): Promise<{ yDoc: YDoc<T>; localProvider: IndexeddbPersistence }> => {
  const yDoc = existingDoc || (new Doc() as YDoc<T>);
  if (!yDoc) throw new Error('could not create doc');

  const localProvider = provider
    ? provider(roomId, yDoc as Doc)
    : new IndexeddbPersistence(roomId, yDoc as Doc);
  if (localProvider.synced) return { yDoc: yDoc, localProvider };

  const synced = await localProvider.whenSynced;
  if (synced.synced) return { yDoc, localProvider };
  else throw new Error('could not sync doc');
};
