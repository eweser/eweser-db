import type { Database } from '../..';
import type { CollectionKey, Document, Room } from '../../types';

export const newEmptyRoom = <T extends Document>(
  _db: Database,
  collectionKey: CollectionKey,
  roomId: string
) => {
  const roomId = _db.buildAliasFromSeed(roomId, collectionKey);
  const room: Room<T> = {
    connectStatus: 'initial',
    collectionKey,
    matrixProvider: null,
    webRtcProvider: null,
    indexeddbProvider: null,
    created: new Date(),
    roomId,
    roomId: undefined,
    tempDocs: {},
  };
  return room;
};
