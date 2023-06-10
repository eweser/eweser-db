import type { Database } from '..';
import { getOrSetRoom, initializeDocAndLocalProvider } from '..';
import type { CollectionKey } from '../types';
import type { UserDocument } from '../types';
import { populateInitialValues } from '../utils/db/populateInitialValues';

export async function createOfflineRoom<T extends UserDocument>(
  this: Database,
  {
    collectionKey,
    aliasSeed,
    initialValues,
  }: {
    collectionKey: CollectionKey;
    aliasSeed: string;
    initialValues?: Partial<T>[];
  }
) {
  const logger = (message: string, data?: any) =>
    this.emit({
      event: 'createOfflineRoom',
      data: {
        collectionKey,
        raw: data,
        aliasSeed,
      },
      message,
    });
  logger('creating offline room');

  const room = getOrSetRoom(this)<T>(collectionKey, aliasSeed);
  logger('room created', room);
  const { ydoc: localDoc, localProvider } =
    await initializeDocAndLocalProvider<any>(aliasSeed, room.ydoc);
  room.ydoc = localDoc;
  room.indexeddbProvider = localProvider;
  logger('ydoc created', room.ydoc);

  if (initialValues) {
    populateInitialValues(initialValues, room as any);
    logger('initialValues populated', initialValues);
  }
  return room;
}
