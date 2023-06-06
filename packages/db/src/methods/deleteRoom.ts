import type { CollectionKey, Database } from '..';
import { getRegistry } from '..';

/** Leaves the matrix room and deletes entries from the database registry */
export const deleteRoom =
  (_db: Database) =>
  async ({
    aliasSeed,
    collectionKey,
  }: {
    aliasSeed: string;
    collectionKey: CollectionKey;
  }) => {
    const room = _db.getRoom({ collectionKey, aliasSeed });
    if (!room?.roomId) {
      throw new Error('room ID not found');
    }
    await _db.matrixClient?.leave(room.roomId);

    delete _db.collections[collectionKey][aliasSeed];

    const registry = getRegistry(_db);
    const registryDoc = registry.get('0');
    if (!registryDoc) throw new Error('registry document not found');
    if (!registryDoc[collectionKey][aliasSeed])
      throw new Error('collection aliasSeed not found in registry');
    const updatedRegistry = {
      ...registryDoc,
    };
    delete updatedRegistry[collectionKey][aliasSeed];
    registry.set('0', updatedRegistry);
  };
