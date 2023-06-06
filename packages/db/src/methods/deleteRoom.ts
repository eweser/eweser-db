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
    if (!_db.matrixClient) {
      throw new Error('matrixClient not found');
    }

    const registry = getRegistry(_db);
    const registryDoc = registry.get('0');
    if (!registryDoc) {
      throw new Error('registry document not found');
    }
    const roomId = registryDoc[collectionKey][aliasSeed]?.roomId;
    if (!roomId) {
      throw new Error('collection aliasSeed not found in registry');
    }
    await _db.matrixClient?.leave(roomId);

    const updatedRegistry = {
      ...registryDoc,
    };
    delete updatedRegistry[collectionKey][aliasSeed];
    registry.set('0', updatedRegistry);

    delete _db.collections[collectionKey][aliasSeed];
  };
