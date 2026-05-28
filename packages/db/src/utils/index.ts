import type { TypedMap } from 'yjs-types';
import type { CollectionKey, Room, Documents, EweDocument } from '../types.js';
import type { Database } from '../index.js';

export { newDocument, buildRef, randomString } from '@eweser/shared';
export * from './files.js';
export * from './backup.js';
export * from './seedRoom.js';
export * from './encryption.js';
export { RoomCrypto } from './roomCrypto.js';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function getRoomDocuments<T extends EweDocument>(
  room: Room<T>
): TypedMap<Documents<T>> {
  if (!room.ydoc) throw new Error('room.ydoc not found');
  const registryMap = room.ydoc.getMap('documents');
  return registryMap;
}

export const getRoom =
  (_db: Database) =>
  <T extends EweDocument>({
    collectionKey,
    roomId,
  }: {
    collectionKey: CollectionKey;
    roomId: string;
  }) => {
    const room = _db.collections[collectionKey][roomId];
    if (!room) return null;
    return room as unknown as Room<T>;
  };
