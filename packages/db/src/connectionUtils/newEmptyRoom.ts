import type { CollectionKey, Document, Room } from '../types';

export const newEmptyRoom = <T extends Document>(
  collectionKey: CollectionKey,
  roomAlias: string
) => {
  const room: Room<T> = {
    connectStatus: 'initial',
    collectionKey,
    matrixProvider: null,
    created: new Date(),
    roomAlias,
    roomId: undefined,
  };
  return room;
};
