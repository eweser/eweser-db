import type { CollectionKey, Database, Document } from '..';
import { getOrSetRoom } from '..';
import type { RegistryData, Room } from '../types';
import { initializeDocAndLocalProvider } from './initializeDoc';

/** loads the ydoc into a room. Can be done offline */
export const loadRoom = async <T extends Document>(
  _db: Database,
  {
    collectionKey,
    aliasSeed,
  }: { collectionKey: CollectionKey | 'registry'; aliasSeed: string }
): Promise<Room<T>> => {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'loadRoom',
      message,
      data: { raw: data, collectionKey, aliasSeed },
    });
  logger('starting loadRoom');
  if (collectionKey === 'registry') {
    const { ydoc } = await initializeDocAndLocalProvider<RegistryData>(
      'registry'
    );
    const room = getOrSetRoom(_db)<RegistryData>('registry' as any, '0');
    room.ydoc = ydoc;
    logger('loaded room', room);
    return room as Room<T>;
  }
  const { ydoc } = await initializeDocAndLocalProvider<T>(aliasSeed);
  const room = getOrSetRoom(_db)<T>(collectionKey, aliasSeed);
  room.ydoc = ydoc;
  logger('loaded room', room);
  return room;
};
