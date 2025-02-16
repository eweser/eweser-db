import type { CollectionKey, Database, Document, Room } from '..';

/** First tries to connect to the offline version of the room. If successful, calls `onLoad` with the room. Then It tries to connect to the remote room and finally returns the remote connected room. */
export const loadAndConnectRoom =
  (db: Database) =>
  async <T extends Document>(
    {
      collectionKey,
      roomId,
    }: {
      collectionKey: CollectionKey;
      roomId: string;
    },
    onLoad?: (room: Room<T>) => void
  ) => {
    const offlineRoom = await db.loadRoom<T>({
      collectionKey,
      roomId,
    });
    if (!offlineRoom) {
      throw new Error('could not load room');
    }
    if (onLoad) onLoad(offlineRoom);

    // then connect the online version of the room
    const room = await db.connectRoom<T>({
      collectionKey,
      roomId,
    });
    if (typeof room === 'string') {
      throw new Error(room);
    }
    return room;
  };
