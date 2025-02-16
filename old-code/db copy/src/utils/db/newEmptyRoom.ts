import type { Database } from '../..';
import type { CollectionKey, Document, Room } from '../../types';

export const newEmptyRoom = <T extends Document>(
  _db: Database,
  collectionKey: CollectionKey,
  roomId: string
) => {
  const room: Room<T> = {
    connectStatus: 'initial',
    collectionKey,
    y: null,
    webRtcProvider: null,
    indexeddbProvider: null,
    created: new Date(),
    roomId,
    tempDocs: {},
  };
  return room;
};
