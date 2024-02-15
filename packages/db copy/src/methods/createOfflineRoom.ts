import type { Database } from '..';
import { getOrSetRoom, initializeDocAndLocalProvider } from '..';
import type { CollectionKey } from '../types';
import type { UserDocument } from '../types';
import { populateInitialValues } from '../utils/db/populateInitialValues';

export async function createOfflineRoom<T extends UserDocument>(
  this: Database,
  {
    collectionKey,
    roomId,
    initialValues,
  }: {
    collectionKey: CollectionKey;
    roomId: string;
    initialValues?: Partial<T>[];
  }
) {
  const logger = (message: string, data?: any) =>
    this.emit({
      event: 'createOfflineRoom',
      data: {
        collectionKey,
        raw: data,
        roomId,
      },
      message,
    });
  logger('creating offline room');

  const room = getOrSetRoom(this)<T>(collectionKey, roomId);
  logger('room created', room);
  const { ydoc: localDoc, localProvider } =
    await initializeDocAndLocalProvider<any>(roomId, room.ydoc);
  room.ydoc = localDoc;
  room.indexeddbProvider = localProvider;
  logger('ydoc created', room.ydoc);

  if (initialValues) {
    populateInitialValues(initialValues, room as any);
    logger('initialValues populated', initialValues);
  }
  return room;
}
