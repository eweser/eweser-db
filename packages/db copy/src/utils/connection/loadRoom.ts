import type { CollectionKey, Database, Document } from '../../';
import { getOrSetRoom } from '../';
import type { RegistryData, Room } from '../../types';
import { initializeDocAndLocalProvider } from './initializeDoc';

/** loads the ydoc into a room. Can be done offline */
export const loadRoom =
  (_db: Database) =>
  async <T extends Document>({
    collectionKey,
    roomId,
  }: {
    collectionKey: CollectionKey | 'registry';
    roomId: string;
  }): Promise<Room<T>> => {
    const logger = (message: string, data?: any) =>
      _db.emit({
        event: 'loadRoom',
        message,
        data: { raw: data, collectionKey, roomId },
      });
    logger('starting loadRoom');
    if (collectionKey === 'registry') {
      const { ydoc, localProvider } =
        await initializeDocAndLocalProvider<RegistryData>('registry');
      const room = getOrSetRoom(_db)<RegistryData>('registry' as any, '0');
      room.ydoc = ydoc;
      room.indexeddbProvider = localProvider;
      logger('loaded room', room);
      return room as Room<T>;
    }
    const { ydoc, localProvider } = await initializeDocAndLocalProvider<T>(
      roomId
    );
    const room = getOrSetRoom(_db)<T>(collectionKey, roomId);
    room.ydoc = ydoc;
    room.indexeddbProvider = localProvider;
    logger('loaded room', room);
    return room;
  };
