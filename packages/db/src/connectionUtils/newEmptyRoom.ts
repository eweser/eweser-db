import type { Database } from '..';
import type { CollectionKey, Document, Room } from '../types';

export const newEmptyRoom = <T extends Document>(
  _db: Database,
  collectionKey: CollectionKey,
  aliasSeed: string
) => {
  const roomAlias = _db.buildAliasFromSeed(aliasSeed, collectionKey);
  const room: Room<T> = {
    connectStatus: 'initial',
    collectionKey,
    matrixProvider: null,
    created: new Date(),
    roomAlias,
    roomId: undefined,
    tempDocs: {},
  };
  return room;
};
