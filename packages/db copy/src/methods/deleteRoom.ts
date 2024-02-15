import type { CollectionKey, Database } from '..';
import { getRegistry } from '..';

/** Leaves the matrix room and deletes entries from the database registry */
export const deleteRoom =
  (_db: Database) =>
  async ({
    roomId,
    collectionKey,
  }: {
    roomId: string;
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
    const roomId = registryDoc[collectionKey][roomId]?.roomId;
    if (!roomId) {
      throw new Error('collection roomId not found in registry');
    }
    await _db.matrixClient?.leave(roomId);

    const updatedRegistry = {
      ...registryDoc,
    };
    delete updatedRegistry[collectionKey][roomId];
    registry.set('0', updatedRegistry);

    delete _db.collections[collectionKey][roomId];
  };
